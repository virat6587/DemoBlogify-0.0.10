const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

router.use(restrictToLoggedInUserOnly);

// GET notifications page
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("actor", "fullName profileImageURL")
      .populate("requester", "fullName profileImageURL")
      .populate("blog", "title slug coverImageURL")
      .lean();

    const grouped = {
      follow_requests: notifications.filter(n => n.type === "follow_request" && n.requestStatus === "pending"),
      all: notifications
    };

    res.render("notification", {
      user: req.user,
      notifications: notifications || [],
      grouped,
      pageTitle: "Notifications"
    });
  } catch (error) {
    console.error("Notification Page Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

// GET API - JSON notifications
router.get("/api", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("actor", "fullName profileImageURL")
      .populate("requester", "fullName profileImageURL")
      .populate("blog", "title slug coverImageURL")
      .lean();

    const total = await Notification.countDocuments({ recipient: req.user._id });
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

    res.json({ success: true, notifications, total, unreadCount, pages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
});

// GET unread count
router.get("/unread/count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get unread count" });
  }
});

// MARK as read
router.put("/:notificationId/read", async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to mark as read" });
  }
});

// MARK all as read
router.put("/all/read", async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: "All marked as read" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed" });
  }
});

// DELETE notification
router.delete("/:notificationId", async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({ _id: req.params.notificationId, recipient: req.user._id });
    if (!notif) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete" });
  }
});

// CLEAR read notifications
router.delete("/clear/read", async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user._id, isRead: true });
    res.json({ success: true, message: `Cleared ${result.deletedCount} notifications` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to clear" });
  }
});

module.exports = router;
