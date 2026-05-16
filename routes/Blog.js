const { Router } = require("express");
const Blog = require("../models/Blog");
const cloudinaryUpload = require("../middlewares/CloudinaryUploads");

const router = Router();

// GET: Render add blog page (requires authentication)
router.get("/add-new", (req, res) => {
    if (!req.user) {
        return res.redirect("/user/signin");
    }
    return res.render("addBlog", {
        user: req.user,
    });
});

// GET: View single blog by ID
router.get("/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate("createdBy", "fullName email profileImageURL");
        
        if (!blog) {
            return res.status(404).render("404", {
                user: req.user,
                message: "Blog not found"
            });
        }

        return res.render("view", {
            user: req.user,
            blog: blog
        });
    } catch (error) {
        console.error("Error fetching blog:", error);
        return res.status(500).render("500", {
            user: req.user,
            message: "Error loading blog"
        });
    }
});

// POST: Create blog with Cloudinary image (requires authentication)
router.post("/", cloudinaryUpload.single("coverImage"), async (req, res) => {
    const { title, body } = req.body;

    // Validate user is authenticated
    if (!req.user) {
        return res.status(401).redirect("/user/signin");
    }

    // Validate inputs
    if (!title || !body) {
        return res.status(400).render("addBlog", {
            user: req.user,
            error: "Title and content are required"
        });
    }

    try {
        const blog = await Blog.create({
            title,
            body,
            createdBy: req.user._id,
            coverImageURL: req.file ? req.file.path : "/images/default-blog.png", // Cloudinary URL or default
        });

        return res.redirect("/");
    } catch (error) {
        console.error("Error creating blog:", error);
        return res.status(500).render("addBlog", {
            user: req.user,
            error: "Failed to create blog. Please try again."
        });
    }
});

module.exports = router;