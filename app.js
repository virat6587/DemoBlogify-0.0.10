const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const UserRoute = require("./routes/User");
const UserBlogsRoute = require("./routes/Blog");
const Blog = require("./models/blog");
const cookieParser = require("cookie-parser");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 8000;
const app = express();

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected to Atlas"))
    .catch((err) => console.error("Mongo Connection Error:", err));

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/", express.static(path.resolve("./public")));

app.use(checkForAuthenticationCookie("token"));

app.get("/", async (req, res) => {
    try {
        const allBlogs = await Blog.find({}).sort({ createdAt: -1 });
        
        res.render("home", {
            user: req.user,
            blogs: allBlogs
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.use("/user", UserRoute);
app.use("/blogs", UserBlogsRoute);

app.listen(PORT, () => {
    console.log(`Server started at http://localhost:${PORT}`);
});

module.exports = app;
