const { Router } = require("express");
const crypto = require("crypto");
const User = require("../models/user");
const { sendOTP } = require("../services/email");

const router = Router();

// In-memory OTP storage
const otpCache = {};

// ====================== PAGES ======================
router.get("/signin", (req, res) => res.render("signin"));   // Registration Page
router.get("/signup", (req, res) => res.render("signup"));   // Login Page

// ====================== SEND OTP ======================
router.post("/send-otp", async (req, res) => {
    const { fullName, email, password } = req.body;

    try {
        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email is already registered." });
        }

        const otp = crypto.randomInt(100000, 999999).toString();

        otpCache[email] = {
            fullName,
            email,
            password,
            otp,
            expiresAt: Date.now() + 300000 // 5 minutes
        };

        console.log(`✅ OTP Generated for ${email} | OTP: ${otp}`);

        // Send OTP via Email Service
        const emailSent = await sendOTP(email, otp);

        if (!emailSent) {
            delete otpCache[email];
            return res.status(500).json({ success: false, message: "Failed to send OTP email. Please try again." });
        }

        return res.json({ 
            success: true, 
            message: "OTP sent successfully! Check your email.",
            otp: process.env.NODE_ENV === "development" ? otp : undefined
        });

    } catch (error) {
        console.error("🚨 Send OTP Error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// ====================== VERIFY OTP & CREATE ACCOUNT ======================
router.post("/signin", async (req, res) => {
    const { email, otp } = req.body;
    const sessionRecord = otpCache[email];

    if (!sessionRecord) {
        return res.status(400).json({ success: false, message: "OTP expired or not found. Please request a new one." });
    }

    if (Date.now() > sessionRecord.expiresAt) {
        delete otpCache[email];
        return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    if (sessionRecord.otp !== otp) {
        return res.status(400).json({ success: false, message: "Incorrect OTP." });
    }

    try {
        await User.create({
            fullName: sessionRecord.fullName,
            email: sessionRecord.email,
            password: sessionRecord.password,
            isVerified: true
        });

        delete otpCache[email];
        return res.json({ success: true, message: "Account created successfully! Redirecting to login..." });
    } catch (error) {
        console.error("🚨 Database Error:", error);
        return res.status(500).json({ success: false, message: "Error creating account." });
    }
});

// ====================== LOGIN ======================
router.post("/signup", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        return res.cookie("token", token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }).json({ 
            success: true, 
            message: "Login successful! Redirecting...",
            redirect: "/" 
        });
    } catch (error) {
        console.error("Login Error:", error.message);
        return res.status(401).json({ 
            success: false, 
            message: "Incorrect Email or Password" 
        });
    }
});

// ====================== LOGOUT ======================
router.get("/logout", (req, res) => {
    return res.clearCookie("token").redirect("/");
});

module.exports = router;
