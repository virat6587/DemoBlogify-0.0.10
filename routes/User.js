// routes/User.js
const { Router } = require("express");
const User = require("../models/user");
const { creatTokenForUser } = require("../services/authentication");
const { sendOTP } = require("../services/email");

const router = Router();

// In-memory OTP store (Use Redis in production)
const otpStore = new Map(); // email -> {otp, expiry, userData}

router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

// Send OTP on Signup
router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.render("signup", { error: "Email already registered" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        otpStore.set(email.toLowerCase(), {
            otp,
            expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
            userData: { fullName, email: email.toLowerCase(), password }
        });

        const emailSent = await sendOTP(email, otp);

        if (!emailSent) {
            return res.render("signup", { error: "Failed to send OTP. Please try again." });
        }

        res.render("signup", { 
            emailForVerification: email.toLowerCase(),
            success: "OTP sent successfully! Check your email."
        });

    } catch (error) {
        console.error(error);
        res.render("signup", { error: "Something went wrong" });
    }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    try {
        const stored = otpStore.get(email.toLowerCase());

        if (!stored) return res.json({ success: false, message: "OTP expired or invalid" });
        if (Date.now() > stored.expiry) {
            otpStore.delete(email.toLowerCase());
            return res.json({ success: false, message: "OTP has expired" });
        }
        if (stored.otp !== otp) {
            return res.json({ success: false, message: "Incorrect OTP" });
        }

        // Create User
        await User.create(stored.userData);
        otpStore.delete(email.toLowerCase());

        // Auto Login
        const token = await User.matchPassword(email, stored.userData.password);

        res.cookie("token", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        res.json({ success: true, redirect: "/" });

    } catch (error) {
        console.error(error);
        res.json({ success: false, message: "Verification failed" });
    }
});

// Login & Logout (unchanged)
router.post("/signin", async (req, res) => {
    try {
        const token = await User.matchPassword(req.body.email, req.body.password);
        res.cookie("token", token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        }).redirect("/");
    } catch (e) {
        res.render("signin", { error: "Invalid credentials" });
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });
    res.redirect("/");
});

module.exports = router;
