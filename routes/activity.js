const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const Comment = require("../models/Comment");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");

router.use(restrictToLoggedInUserOnly);

// ====================== GET - LIKED BLOGS ======================
router.get("/liked-blogs", async (req, res) => {
  try {
    const userId = req.user._id;

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

    const userComments = await Comment.find({
      author: userId,
      isDeleted: false
    }).distinct("blog");

    if (!userComments || userComments.length === 0) {
      return res.render("activityCommented", {
        user: req.user,
        blogs: [],
        pageTitle: "Commented Blogs",
        activeTab: "commented"
      });
    }

    const commentedBlogs = await Blog.find({
      _id: { $in: userComments },
      isDeleted: false,
      status: "published"
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "fullName profileImageURL")
      .lean();

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

// ====================== GET - SETTINGS PAGE ======================
router.get("/settings", async (req, res) => {
  try {
    const userId = req.user._id;

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

    // Get full user with preferences for pre-filling forms
    const fullUser = await require("../models/user").findById(userId).lean();

    res.render("settings", {
      user: fullUser,
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
