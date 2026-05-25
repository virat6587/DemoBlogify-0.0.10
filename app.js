const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const UserRoute = require("./routes/User");
const GoogleAuthRoute = require("./routes/GoogleAuthentication");
const BlogRoute = require("./routes/Blog");
const AdminRoute = require("./routes/Admin");
const ProfileRoute = require("./routes/Profile");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");
const { queryHandler } = require("./middlewares/queryParams");

const app = express();
const PORT = process.env.PORT || 8000;

require("dotenv").config();

// ====================== MIDDLEWARE ======================
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));

app.use(passport.initialize());
app.use(checkForAuthenticationCookie("token"));
app.use(queryHandler);   // ← Must be here

// ====================== HOME ROUTE ======================
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const { search = '', sort = 'newest', page = 1, limit = 9 } = req.queryParams || {};

        const filter = search ? {
            $or: [
                { title: { $regex: search, $options: "i" } },
                { body: { $regex: search, $options: "i" } }
            ]
        } : {};

        let sortOption = { createdAt: -1 };
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "title") sortOption = { title: 1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const blogs = await Blog.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit))
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        const totalBlogs = await Blog.countDocuments(filter);
        const totalPages = Math.ceil(totalBlogs / limit);

        res.render("home", {
            title: "Blogify",
            user: req.user || null,
            blogs: blogs || [],
            currentPage: parseInt(page),
            totalPages,
            totalBlogs,
            search,
            sort
        });
    } catch (error) {
        console.error("🚨 Home Route Error:", error.message);
        res.status(500).send("Internal Server Error - Check Logs");
    }
});

// ====================== ROUTES ======================
app.use("/admin", AdminRoute);
app.use("/user/profile", ProfileRoute);
app.use("/user", UserRoute);
app.use("/user", GoogleAuthRoute);
app.use("/blogs", BlogRoute);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
