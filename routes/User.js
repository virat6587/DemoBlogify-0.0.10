const { Router } = require("express");
const passport = require("passport");
const User = require("../models/user");
const { creatTokenForUser } = require("../services/authentication");

const router = Router();

// ====================== GOOGLE STRATEGY ======================
const GoogleStrategy = require("passport-google-oauth20").Strategy;

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        "google",
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
            },
            async (accessToken, refreshToken, profile, done) => {
                console.log("📌 Google Profile Received:", profile.emails?.[0]?.value);

                try {
                    const user = await User.findOrCreateGoogleUser(profile);
                    console.log("✅ User Created/Found:", user.email, "| ID:", user._id);
                    return done(null, user);
                } catch (err) {
                    console.error("❌ Google Strategy Failed:", err.message);
                    return done(err);
                }
            }
        )
    );
    console.log("✅ Google Strategy Loaded");
}

// Serialize / Deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (e) {
        done(e);
    }
});

// Normal Routes...
router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

router.post("/signup", async (req, res) => {
    try {
        await User.create(req.body);
        res.redirect("/user/signin");
    } catch (e) {
        res.render("signup", { error: "Email already exists" });
    }
});

router.post("/signin", async (req, res) => {
    try {
        const token = await User.matchPassword(req.body.email, req.body.password);
        res.cookie("token", token, { httpOnly: true, sameSite: "strict" }).redirect("/");
    } catch (e) {
        res.render("signin", { error: "Invalid credentials" });
    }
});

router.get("/logout", (req, res) => res.clearCookie("token").redirect("/"));

// Google Routes
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/user/signin",
        session: false
    }),
    (req, res) => {
        if (!req.user) return res.redirect("/user/signin");

        const token = creatTokenForUser(req.user);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.redirect("/");
    }
);

module.exports = router;
