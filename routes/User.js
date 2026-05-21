const { Router } = require("express");
const User = require("../models/user");
const router = Router();

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        await User.create({ fullName, email, password });
        console.log("User successfully created in MongoDB");
        return res.redirect("/user/signin"); 
    } catch (error) {
        console.error("Signup Error Details:", error);
        // FIX: Removed the non-existent token and safely render the signup page with an error
        return res.render("signup", { 
            error: "Registration failed. Check if email is already used." 
        });
    }
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        console.error("Signin Error:", error.message);
        return res.render("signin", { error: "Incorrect Email or Password" });
    }
});

router.get("/logout", (req, res) => {
    // FIX: Changed token to a string literal "token" to target the cookie name
    return res.clearCookie("token").redirect("/");
});

module.exports = router;

