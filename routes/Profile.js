const express = require("express");
const router = express.Router();
const Blog = require("../models/Blog");
const User = require("../models/user");
const { restrictToLoggedInUserOnly } = require("../middlewares/authentication");
const cloudinaryUpload = require("../middlewares/CloudinaryUploads");

router.use(restrictToLoggedInUserOnly);

// ====================== VIEW PROFILE ======================
router.get("/", async (req, res) => {
  try {
    const fullUser = await User.findById(req.user._id)
      .populate("followers", "fullName email profileImageURL bio")
      .populate("following", "fullName email profileImageURL bio");

    if (!fullUser) {
      return res.status(404).send("User not found");
    }

    const blogs = await Blog.find({ createdBy: req.user._id, isDeleted: false })
      .sort({ createdAt: -1 });

    res.render("profile", {
      user: fullUser,
      blogs: blogs || []
    });
  } catch (error) {
    console.error("🚨 Profile Route Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// ====================== GET EDIT PROFILE PAGE ======================
router.get("/edit", async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("followers", "fullName profileImageURL")
      .populate("following", "fullName profileImageURL");

    res.render("editProfile", {
      user: user,
      success: null,
      error: null
    });
  } catch (error) {
    console.error("Edit Profile Page Error:", error);
    res.status(500).render("error", { error: error.message });
  }
});

// ====================== UPDATE PROFILE ======================
router.put("/update", async (req, res) => {
  try {
    const { fullName, bio, website, location, theme } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.fullName = fullName || user.fullName;
    user.bio = bio !== undefined ? bio : user.bio;
    user.website = website !== undefined ? website : user.website;
    user.location = location !== undefined ? location : user.location;
    user.theme = theme || user.theme;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: user
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile"
    });
  }
});

// ====================== UPLOAD PROFILE IMAGE ======================
router.post("/upload-image", cloudinaryUpload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded"
      });
    }

    const user = await User.findById(req.user._id);
    user.profileImageURL = req.file.path;
    await user.save();

    res.json({
      success: true,
      message: "Profile image updated",
      imageURL: req.file.path
    });
  } catch (error) {
    console.error("Upload Image Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image"
    });
  }
});

// ====================== CHANGE PASSWORD ======================
router.post("/change-password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new passwords are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    const user = await User.findById(req.user._id);

    if (user.googleId && !user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google Sign-In. Cannot change password."
      });
    }

    const { createHmac } = require("crypto");
    const currentHash = createHmac("sha256", user.salt)
      .update(currentPassword)
      .digest("hex");

    if (user.password !== currentHash) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
});

// ====================== DELETE ACCOUNT ======================
router.delete("/delete-account", async (req, res) => {
  try {
    const userId = req.user._id;

    await Blog.deleteMany({ createdBy: userId });
    await User.findByIdAndDelete(userId);

    res.clearCookie("token");

    res.json({
      success: true,
      message: "Account deleted successfully"
    });
  } catch (error) {
    console.error("Delete Account Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete account"
    });
  }
});

// ====================== NOTIFICATION SETTINGS ======================
router.put("/notifications", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notificationSettings = { ...user.notificationSettings, ...req.body };
    await user.save();

    res.json({
      success: true,
      message: "Notification preferences updated"
    });
  } catch (error) {
    console.error("Notification Settings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update notification settings"
    });
  }
});

// ====================== READING PREFERENCES ======================
router.put("/reading-prefs", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.preferences.reading = { ...user.preferences.reading, ...req.body };
    await user.save();

    res.json({
      success: true,
      message: "Reading preferences updated"
    });
  } catch (error) {
    console.error("Reading Prefs Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update reading preferences"
    });
  }
});

// ====================== PRIVACY SETTINGS ======================
router.put("/privacy", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.preferences.privacy = { ...user.preferences.privacy, ...req.body };
    await user.save();

    res.json({
      success: true,
      message: "Privacy settings updated"
    });
  } catch (error) {
    console.error("Privacy Settings Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update privacy settings"
    });
  }
});

// ====================== DATA EXPORT ======================
router.post("/export", async (req, res) => {
  try {
    const { format } = req.query;

    const user = await User.findById(req.user._id)
      .populate("followers", "fullName profileImageURL")
      .populate("following", "fullName profileImageURL")
      .lean();

    const blogs = await Blog.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const comments = await require("../models/Comment").find({ author: req.user._id })
      .populate("blog", "title slug")
      .sort({ createdAt: -1 })
      .lean();

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        fullName: user.fullName,
        email: user.email,
        bio: user.bio,
        website: user.website,
        theme: user.theme,
        role: user.role,
        createdAt: user.createdAt,
        followerCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0
      },
      blogs: blogs.map(b => ({
        title: b.title,
        slug: b.slug,
        body: b.body,
        excerpt: b.excerpt,
        tags: b.tags,
        category: b.category,
        status: b.status,
        viewCount: b.viewCount,
        likesCount: b.likes?.length || 0,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      })),
      comments: comments.map(c => ({
        content: c.content,
        blogTitle: c.blog?.title,
        createdAt: c.createdAt
      })),
      social: {
        followers: user.followers?.map(f => ({ name: f.fullName })) || [],
        following: user.following?.map(f => ({ name: f.fullName })) || []
      }
    };

    // Update last export timestamp
    await User.findByIdAndUpdate(req.user._id, { lastExportAt: new Date() });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="blogify-export-${Date.now()}.json"`);
      return res.send(JSON.stringify(exportData, null, 2));
    }

    // For ZIP, return stub (implement with archiver library in production)
    res.json({
      success: true,
      message: "Export prepared. Download will begin shortly.",
      data: exportData
    });
  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export data"
    });
  }
});

module.exports = router;
