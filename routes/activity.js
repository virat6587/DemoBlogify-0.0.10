const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const Comment = require("../models/Comment");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

// Protect all activity routes
router.use(restrictToLoggedInUserOnly);

// ====================== GET - LIKED BLOGS ======================
router.get("/liked-blogs", async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all published, non-deleted blogs where the user's ID exists in the likes array
    const likedBlogs = await Blog.find({
      likes: { $in: [userId] },
      isDeleted: false,
      status: "published"
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName profileImageURL")
      .lean();

    res.render("activityLiked", {
      user: req.user,
      blogs: likedBlogs || [],
      pageTitle: "Liked Blogs",
      activeTab: "liked"
    });
  } catch (error) {
    console.error("🚨 Liked Blogs Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// ====================== GET - COMMENTED BLOGS ======================
router.get("/commented-blogs", async (req, res) => {
  try {
    const userId = req.user._id;

    // Step 1: Find all non-deleted comments by this user
    const userComments = await Comment.find({
      author: userId,
      isDeleted: false
    })
      .distinct("blog"); // Get unique blog IDs only

    if (!userComments || userComments.length === 0) {
      return res.render("activityCommented", {
        user: req.user,
        blogs: [],
        pageTitle: "Commented Blogs",
        activeTab: "commented"
      });
    }

    // Step 2: Fetch the actual blog details for those unique IDs
    const commentedBlogs = await Blog.find({
      _id: { $in: userComments },
      isDeleted: false,
      status: "published"
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName profileImageURL")
      .lean();

    // Step 3: Attach comment count per blog for richer UI
    const blogsWithCommentCount = await Promise.all(
      commentedBlogs.map(async (blog) => {
        const commentCount = await Comment.countDocuments({
          blog: blog._id,
          author: userId,
          isDeleted: false
        });
        return { ...blog, userCommentCount: commentCount };
      })
    );

    res.render("activityCommented", {
      user: req.user,
      blogs: blogsWithCommentCount || [],
      pageTitle: "Commented Blogs",
      activeTab: "commented"
    });
  } catch (error) {
    console.error("🚨 Commented Blogs Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// ====================== GET - SETTINGS PAGE (Unified Activity Hub) ======================
router.get("/settings", async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch counts for the settings dashboard
    const likedCount = await Blog.countDocuments({
      likes: { $in: [userId] },
      isDeleted: false,
      status: "published"
    });

    const commentedBlogIds = await Comment.find({
      author: userId,
      isDeleted: false
    }).distinct("blog");

    const commentedCount = await Blog.countDocuments({
      _id: { $in: commentedBlogIds },
      isDeleted: false,
      status: "published"
    });

    res.render("settings", {
      user: req.user,
      likedCount,
      commentedCount,
      pageTitle: "Settings",
      activeTab: "activity"
    });
  } catch (error) {
    console.error("🚨 Settings Page Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
