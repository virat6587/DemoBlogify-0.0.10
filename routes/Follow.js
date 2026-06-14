const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Notification = require("../models/Notification");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

router.use(restrictToLoggedInUserOnly);

// ====================== FOLLOW / REQUEST FOLLOW ======================
router.post("/:userId/follow", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    if (!userId || userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot follow yourself"
      });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if already following (accepted)
    const alreadyFollowing = currentUser.isFollowing(userId);

    if (alreadyFollowing) {
      // UNFOLLOW
      await User.findByIdAndUpdate(currentUserId, { $pull: { following: userId } });
      await User.findByIdAndUpdate(userId, { $pull: { followers: currentUserId } });

      return res.json({
        success: true,
        following: false,
        requested: false,
        message: "Unfollowed successfully"
      });
    }

    // Check if already requested (pending)
    const alreadyRequested = currentUser.hasPendingRequestTo(userId);

    if (alreadyRequested) {
      // CANCEL PENDING REQUEST
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { pendingFollowing: { user: userId } }
      });
      await User.findByIdAndUpdate(userId, {
        $pull: { pendingFollowers: { user: currentUserId } }
      });

      // Delete the follow_request notification
      await Notification.deleteOne({
        recipient: userId,
        requester: currentUserId,
        type: "follow_request"
      });

      return res.json({
        success: true,
        following: false,
        requested: false,
        message: "Follow request cancelled"
      });
    }

    // NEW FOLLOW / REQUEST
    if (targetUser.isPrivate) {
      // PRIVATE ACCOUNT: Send follow request
      await User.findByIdAndUpdate(currentUserId, {
        $addToSet: { pendingFollowing: { user: userId, requestedAt: new Date() } }
      });
      await User.findByIdAndUpdate(userId, {
        $addToSet: { pendingFollowers: { user: currentUserId, requestedAt: new Date() } }
      });

      // Create follow request notification for owner
      await Notification.create({
        recipient: userId,
        type: "follow_request",
        title: "Follow Request",
        message: `${currentUser.fullName} wants to follow you`,
        actor: currentUserId,
        requester: currentUserId,
        requestStatus: "pending"
      });

      return res.json({
        success: true,
        following: false,
        requested: true,
        message: "Follow request sent"
      });
    } else {
      // PUBLIC ACCOUNT: Instant follow
      await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: userId } });
      await User.findByIdAndUpdate(userId, { $addToSet: { followers: currentUserId } });

      // Create follow notification
      await Notification.create({
        recipient: userId,
        type: "follow",
        title: "New Follower",
        message: `${currentUser.fullName} started following you`,
        actor: currentUserId
      });

      return res.json({
        success: true,
        following: true,
        requested: false,
        message: "Followed successfully"
      });
    }

  } catch (error) {
    console.error("Follow Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to follow user"
    });
  }
});

// ====================== ACCEPT FOLLOW REQUEST ======================
router.post("/:userId/accept", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    const currentUser = await User.findById(currentUserId);
    const requester = await User.findById(userId);

    if (!requester) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const hasRequest = currentUser.hasPendingRequestFrom(userId);
    if (!hasRequest) {
      return res.status(400).json({ success: false, message: "No pending request from this user" });
    }

    // Accept: Move from pending to followers
    await currentUser.acceptFollower(userId);
    await requester.followUser(currentUserId);

    // Update notification status
    await Notification.findOneAndUpdate(
      { recipient: currentUserId, requester: userId, type: "follow_request" },
      { requestStatus: "accepted", isRead: true }
    );

    // Notify requester that they were accepted
    await Notification.create({
      recipient: userId,
      type: "follow_accepted",
      title: "Request Accepted",
      message: `${currentUser.fullName} accepted your follow request`,
      actor: currentUserId
    });

    res.json({ success: true, message: "Follow request accepted" });
  } catch (error) {
    console.error("Accept Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====================== REJECT FOLLOW REQUEST ======================
router.post("/:userId/reject", async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id.toString();

    const currentUser = await User.findById(currentUserId);

    // Remove from pending
    await currentUser.rejectFollower(userId);

    // Update notification
    await Notification.findOneAndUpdate(
      { recipient: currentUserId, requester: userId, type: "follow_request" },
      { requestStatus: "rejected", isRead: true }
    );

    // Remove from requester's pendingFollowing
    await User.findByIdAndUpdate(userId, {
      $pull: { pendingFollowing: { user: currentUserId } }
    });

    res.json({ success: true, message: "Follow request rejected" });
  } catch (error) {
    console.error("Reject Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====================== GET PENDING FOLLOW REQUESTS ======================
router.get("/pending", async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("pendingFollowers.user", "fullName profileImageURL bio");

    res.json({
      success: true,
      pending: user.pendingFollowers || []
    });
  } catch (error) {
    console.error("Pending Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ====================== GET FOLLOWERS (with privacy check) ======================
router.get("/:userId/followers", async (req, res) => {
  try {
    const { userId } = req.params;
    const visitorId = req.user?._id?.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isOwner = visitorId === userId;
    const isAccepted = user.isAcceptedFollower(visitorId);
    const isMutual = user.isMutualFollower(visitorId);

    if (user.isPrivate && !isOwner && !isAccepted) {
      return res.status(403).json({ success: false, message: "Private account" });
    }

    const followers = await User.findById(userId)
      .populate("followers", "fullName profileImageURL bio")
      .then(u => u.followers);

    res.json({
      success: true,
      followers,
      canViewLists: isOwner || isMutual || !user.isPrivate
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch followers" });
  }
});

// ====================== GET FOLLOWING ======================
router.get("/:userId/following", async (req, res) => {
  try {
    const { userId } = req.params;
    const visitorId = req.user?._id?.toString();

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isOwner = visitorId === userId;
    const isAccepted = user.isAcceptedFollower(visitorId);
    const isMutual = user.isMutualFollower(visitorId);

    if (user.isPrivate && !isOwner && !isAccepted) {
      return res.status(403).json({ success: false, message: "Private account" });
    }

    const following = await User.findById(userId)
      .populate("following", "fullName profileImageURL bio")
      .then(u => u.following);

    res.json({
      success: true,
      following,
      canViewLists: isOwner || isMutual || !user.isPrivate
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch following" });
  }
});

module.exports = router;
