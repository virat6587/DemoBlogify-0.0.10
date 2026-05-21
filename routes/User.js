const { Router } = require("express");
const passport = require("passport");
const User = require("../models/user");
const { creatTokenForUser } = require("../services/authentication");

const router = Router();

// ====================== GOOGLE STRATEGY SETUP ======================
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (clientID && clientSecret && callbackURL) {
    passport.use(
        "google",
        new GoogleStrategy(
            {
                clientID,
                clientSecret,
                callbackURL,
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const user = await User.findOrCreateGoogleUser(profile);
                    return done(null, user);
                } catch (err) {
                    console.error("❌ Google Strategy Error:", err);
                    return done(err, null);
                }
            }
        )
    );
    console.log("✅ Google OAuth Strategy Registered Successfully");
} else {
    console.warn("⚠️ Google OAuth credentials missing - Google login disabled");
}

// ====================== PASSPORT SERIALIZE / DESERIALIZE ======================
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ====================== NORMAL AUTH ROUTES ======================
router.get("/signin", (req, res) => res.render("signin"));
router.get("/signup", (req, res) => res.render("signup"));

router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        await User.create({ fullName, email, password });
        res.redirect("/user/signin");
    } catch (error) {
        res.render("signup", { error: "Email already registered" });
    }
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;
    try {
        const token = await User.matchPassword(email, password);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        }).redirect("/");
    } catch (error) {
        res.render("signin", { error: "Incorrect Email or Password" });
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("token").redirect("/");
});

// ====================== GOOGLE OAUTH ROUTES ======================
router.get("/auth/google", (req, res, next) => {
    console.log("🔍 Google Debug:");
    console.log("   Client ID     :", clientID ? "✅ Present" : "❌ MISSING");
    console.log("   Client Secret :", clientSecret ? "✅ Present" : "❌ MISSING");
    console.log("   Callback URL  :", callbackURL || "❌ MISSING");

    if (!clientID || !clientSecret || !callbackURL) {
        return res.render("signin", { 
            error: "Google login is currently unavailable. Please use email/password." 
        });
    }

    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get("/auth/google/callback",
    passport.authenticate("google", { 
        failureRedirect: "/user/signin",
        failureMessage: true 
    }),
    (req, res) => {
        const token = creatTokenForUser(req.user);
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        }).redirect("/");
    }
);

module.exports = router;
