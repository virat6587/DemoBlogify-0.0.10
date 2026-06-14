// ====================== VIEW ANY USER PROFILE (with Privacy) ======================
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const visitorId = req.user?._id?.toString();
    const isOwnProfile = visitorId === userId;

    const profileUser = await User.findById(userId)
      .populate("followers", "fullName profileImageURL")
      .populate("following", "fullName profileImageURL")
      .populate("pendingFollowers.user", "fullName profileImageURL");

    if (!profileUser) {
      return res.status(404).send("User not found");
    }

    // Determine visibility level
    let visibility = "public"; // public, private-limited, private-full, owner

    if (isOwnProfile) {
      visibility = "owner";
    } else if (profileUser.isPrivate) {
      const isAccepted = profileUser.isAcceptedFollower(visitorId);
      if (isAccepted) {
        visibility = "private-full";
      } else {
        visibility = "private-limited";
      }
    } else {
      // Public account
      const isMutual = profileUser.isMutualFollower(visitorId);
      if (isMutual) {
        visibility = "mutual";
      } else {
        visibility = "public";
      }
    }

    // Fetch blogs based on visibility
    let blogs = [];
    let canViewBlogs = false;
    let canViewLists = false;
    let canViewStats = false;
    let isFollowing = false;
    let hasRequested = false;

    switch (visibility) {
      case "owner":
        canViewBlogs = true;
        canViewLists = true;
        canViewStats = true;
        blogs = await Blog.find({ createdBy: userId, isDeleted: false })
          .sort({ createdAt: -1 });
        break;

      case "private-full":
      case "mutual":
        canViewBlogs = true;
        canViewLists = true;
        canViewStats = true;
        blogs = await Blog.find({ createdBy: userId, isDeleted: false, status: "published" })
          .sort({ createdAt: -1 });
        break;

      case "public":
        canViewBlogs = true;
        canViewLists = false; // Only see counts, not lists
        canViewStats = true;
        blogs = await Blog.find({ createdBy: userId, isDeleted: false, status: "published" })
          .sort({ createdAt: -1 });
        break;

      case "private-limited":
        canViewBlogs = false;
        canViewLists = false;
        canViewStats = false;
        break;
    }

    // Check follow status for button
    if (!isOwnProfile && visitorId) {
      const visitor = await User.findById(visitorId);
      isFollowing = visitor.isFollowing(userId);
      hasRequested = visitor.hasPendingRequestTo(userId);
    }

    res.render("profile", {
      user: profileUser,
      blogs: blogs || [],
      isOwnProfile,
      visibility,
      canViewBlogs,
      canViewLists,
      canViewStats,
      isFollowing,
      hasRequested,
      visitor: req.user || null
    });

  } catch (error) {
    console.error("🚨 Profile View Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});
