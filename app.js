const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const passport = require("passport");
const { graphqlHTTP } = require("express-graphql");

const UserRoute = require("./routes/User");
const GoogleAuthRoute = require("./routes/GoogleAuthentication");
const BlogRoute = require("./routes/Blog");
const AdminRoute = require("./routes/Admin");
const ProfileRoute = require("./routes/Profile");

const { checkForAuthenticationCookie } = require("./middlewares/authentication");
const { queryHandler } = require("./middlewares/queryParams");
const { schema, root } = require("./graphql/schema");

const app = express();
const PORT = process.env.PORT || 8000;

require("dotenv").config();

// Middleware
app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("./public")));

app.use(passport.initialize());
app.use(checkForAuthenticationCookie("token"));
app.use(queryHandler);                    // Query Params Middleware

// ====================== GRAPHQL ======================
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true
}));

// ====================== HOME ROUTE ======================
app.get("/", async (req, res) => {
    try {
        const Blog = require("./models/Blog");
        const { search, sort, page, limit, skip } = req.queryParams;

        const filter = search ? {
            $or: [
                { title: { $regex: search, $options: "i" } },
                { body: { $regex: search, $options: "i" } }
            ]
        } : {};

        let sortOption = { createdAt: -1 };
        if (sort === "oldest") sortOption = { createdAt: 1 };
        if (sort === "title") sortOption = { title: 1 };

        const blogs = await Blog.find(filter)
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .populate("createdBy", "fullName profileImageURL")
            .lean();

        const totalBlogs = await Blog.countDocuments(filter);
        const totalPages = Math.ceil(totalBlogs / limit);

        res.render("home", {
            title: "Blogify - Home",
            user: req.user || null,
            blogs,
            currentPage: page,
            totalPages,
            totalBlogs,
            search,
            sort
        });
    } catch (error) {
        console.error("Home Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Routes
app.use("/admin", AdminRoute);
app.use("/user/profile", ProfileRoute);
app.use("/user", UserRoute);
app.use("/user", GoogleAuthRoute);
app.use("/blogs", BlogRoute);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 GraphQL → http://localhost:${PORT}/graphql`);
});
