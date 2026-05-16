const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const UserRoute = require("./routes/User");
const UserBlogsRoute = require("./routes/Blog");
const Blog = require("./models/Blog");
const cookieParser = require("cookie-parser");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

dotenv.config();

const PORT = process.env.PORT || 8000;
const app = express();

// MongoDB Connection with better error handling
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => {
        console.error("❌ MongoDB Connection Error:", err.message);
    });

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", express.static(path.resolve("./public")));

app.use(checkForAuthenticationCookie("token"));

// Home Route with better error handling
app.get("/", async (req, res) => {
    try {
        const allBlogs = await Blog.find({}).sort({ createdAt: -1 }).lean();
        
        res.render("home", {
            user: req.user || null,
            blogs: allBlogs || []
        });
    } catch (error) {
        console.error("Home Route Error:", error);
        res.status(500).send("Internal Server Error - Please try again later");
    }
});

app.use("/user", UserRoute);
app.use("/blogs", UserBlogsRoute);

// 404 Handler
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
