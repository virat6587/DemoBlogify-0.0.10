const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    salt: { type: String },
    password: { type: String },
    googleId: { type: String, unique: true, sparse: true },
    profileImageURL: { type: String, default: "/imgs/default.png" },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
}, { timestamps: true });

// ====================== PASSWORD HASHING ======================
UserSchema.pre("save", function (next) {          // ← NO "async" here
    if (!this.password || !this.isModified("password") || this.googleId) {
        return next();
    }

    try {
        const salt = randomBytes(16).toString("hex");
        const hashedPassword = createHmac("sha256", salt)
            .update(this.password)
            .digest("hex");

        this.salt = salt;
        this.password = hashedPassword;
        next();
    } catch (error) {
        console.error("Password Hashing Error:", error);
        next(error);
    }
});

// ====================== STATIC METHODS ======================
UserSchema.static("matchPassword", async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error("User not found");
    if (!user.password) throw new Error("This account uses Google Sign-In");

    const userProvidedHash = createHmac("sha256", user.salt)
        .update(password)
        .digest("hex");

    if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

    return creatTokenForUser(user);
});

UserSchema.static("findOrCreateGoogleUser", async function (profile) {
    let user = await this.findOne({ googleId: profile.id });

    if (!user) {
        user = await this.findOne({ email: profile.emails[0].value });

        if (user) {
            user.googleId = profile.id;
            if (profile.photos?.[0]?.value) {
                user.profileImageURL = profile.photos[0].value;
            }
            await user.save();
        } else {
            user = await this.create({
                fullName: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
                profileImageURL: profile.photos?.[0]?.value || "/imgs/default.png"
            });
        }
    }
    return user;
});

const User = mongoose.models.user || model("user", UserSchema);
module.exports = User;
