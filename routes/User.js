const { Router } = require("express");
const User = require("../models/user");

const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        await User.create({ fullName, email, password });
        console.log("User created:", email);
        return res.redirect("/user/signin");
    } catch (error) {
        console.error("Signup Error:", error.message);
        return res.render("signup", { 
            error: "Email already registered or invalid data" 
        });
    }
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    try {
        const token = await User.matchPassword(email, password);
        return res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        }).redirect("/");
    } catch (error) {
        console.error("Signin Error:", error.message);
        return res.render("signin", { error: "Incorrect Email or Password" });
    }
});

router.get("/logout", (req, res) => {
    return res.clearCookie("token").redirect("/");
});

module.exports = router;
