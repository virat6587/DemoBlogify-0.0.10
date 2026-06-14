const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { createHmac, randomBytes } = require("crypto");
const { creatTokenForUser } = require("../services/authentication");

const UserSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  salt: { type: String },
  password: { type: String },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  profileImageURL: {
    type: String,
    default: "/imgs/default.png"
  },

  // Profile Enhancements
  bio: {
    type: String,
    default: "",
    maxlength: 500
  },
  website: {
    type: String,
    default: ""
  },

  role: {
    type: String,
    enum: ["USER", "ADMIN"],
    default: "USER"
  },

  theme: {
    type: String,
    enum: ["light", "dark"],
    default: "light"
  },

  // ====================== PRIVACY ======================
  isPrivate: {
    type: Boolean,
    default: false
  },

  // ====================== SOCIAL FEATURES (Refactored) ======================
  // Users this person follows (accepted)
  following: [{
    type: Schema.Types.ObjectId,
    ref: "user"
  }],

  // Users who follow this person (accepted) — kept as followers for backward compat
  followers: [{
    type: Schema.Types.ObjectId,
    ref: "user"
  }],

  // Pending follow requests received (for private accounts)
  pendingFollowers: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "user"
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Users this person has requested to follow (pending outgoing)
  pendingFollowing: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "user"
    },
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Notification Settings
  notificationSettings: {
    emailOnComment: { type: Boolean, default: true },
    emailOnNewFollower: { type: Boolean, default: true },
    emailDigest: { type: Boolean, default: true }
  },

  // User Preferences
  preferences: {
    reading: {
      largeReaderFont: { type: Boolean, default: false },
      focusMode: { type: Boolean, default: false },
      wideContent: { type: Boolean, default: false },
      autoSaveReading: { type: Boolean, default: true }
    },
    privacy: {
      privateProfile: { type: Boolean, default: false },
      approveFollowers: { type: Boolean, default: false },
      allowComments: { type: Boolean, default: true },
      hideActivity: { type: Boolean, default: false }
    }
  },

  lastExportAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });

// ====================== INDEXES ======================
UserSchema.index({ email: 1 });
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });
UserSchema.index({ "pendingFollowers.user": 1 });
UserSchema.index({ "pendingFollowing.user": 1 });

// ====================== VIRTUALS ======================
UserSchema.virtual("followerCount").get(function() {
  return this.followers ? this.followers.length : 0;
});

UserSchema.virtual("followingCount").get(function() {
  return this.following ? this.following.length : 0;
});

UserSchema.virtual("pendingFollowerCount").get(function() {
  return this.pendingFollowers ? this.pendingFollowers.length : 0;
});

// ====================== PASSWORD HASHING ======================
UserSchema.pre("save", async function (next) {
  if (this.googleId || !this.password || !this.isModified("password")) {
    return next();
  }

  try {
    const salt = randomBytes(16).toString("hex");
    this.salt = salt;
    this.password = createHmac("sha256", salt)
      .update(this.password)
      .digest("hex");
    next();
  } catch (error) {
    next(error);
  }
});

// ====================== STATIC METHODS ======================
UserSchema.static("matchPassword", async function (email, password) {
  const user = await this.findOne({ email: email.toLowerCase() });
  if (!user) throw new Error("User not found");
  if (!user.password) throw new Error("This account uses Google Sign-In");

  const userProvidedHash = createHmac("sha256", user.salt)
    .update(password)
    .digest("hex");

  if (user.password !== userProvidedHash) throw new Error("Incorrect Password");

  return creatTokenForUser(user);
});

UserSchema.static("findOrCreateGoogleUser", async function (profile) {
  try {
    const email = profile.emails[0].value.toLowerCase();
    const googleId = profile.id;

    let user = await this.findOne({ googleId });

    if (!user) {
      user = await this.findOne({ email });

      if (user) {
        user.googleId = googleId;
        if (profile.photos?.[0]?.value) {
          user.profileImageURL = profile.photos[0].value;
        }
        await user.save();
      } else {
        user = await this.create({
          fullName: profile.displayName || "Google User",
          email: email,
          googleId: googleId,
          profileImageURL: profile.photos?.[0]?.value || "/imgs/default.png"
        });
      }
    }

    return user;
  } catch (error) {
    console.error("❌ findOrCreateGoogleUser Error:", error.message);
    throw error;
  }
});

// ====================== FOLLOW METHODS (Updated for Privacy) ======================

// Check if following (accepted)
UserSchema.methods.isFollowing = function(userId) {
  return this.following.some(id => id.toString() === userId.toString());
};

// Check if user is a follower (accepted)
UserSchema.methods.isFollower = function(userId) {
  return this.followers.some(id => id.toString() === userId.toString());
};

// Check if there's a pending follow request TO this user
UserSchema.methods.hasPendingRequestFrom = function(userId) {
  return this.pendingFollowers.some(p => p.user.toString() === userId.toString());
};

// Check if this user has a pending request TO another user
UserSchema.methods.hasPendingRequestTo = function(userId) {
  return this.pendingFollowing.some(p => p.user.toString() === userId.toString());
};

// Check if mutual followers (both follow each other — accepted)
UserSchema.methods.isMutualFollower = function(userId) {
  const theyFollowMe = this.followers.some(id => id.toString() === userId.toString());
  const iFollowThem = this.following.some(id => id.toString() === userId.toString());
  return theyFollowMe && iFollowThem;
};

// Check if visitor is an accepted follower (or owner)
UserSchema.methods.isAcceptedFollower = function(userId) {
  return this.followers.some(id => id.toString() === userId.toString());
};

// Add pending follow request
UserSchema.methods.addPendingFollower = async function(userId) {
  if (!this.hasPendingRequestFrom(userId)) {
    this.pendingFollowers.push({ user: userId, requestedAt: new Date() });
    await this.save();
  }
};

// Remove pending follow request
UserSchema.methods.removePendingFollower = async function(userId) {
  this.pendingFollowers = this.pendingFollowers.filter(
    p => p.user.toString() !== userId.toString()
  );
  await this.save();
};

// Accept follow request: move from pending to followers
UserSchema.methods.acceptFollower = async function(userId) {
  this.pendingFollowers = this.pendingFollowers.filter(
    p => p.user.toString() !== userId.toString()
  );
  if (!this.isFollower(userId)) {
    this.followers.push(userId);
  }
  await this.save();
};

// Reject follow request
UserSchema.methods.rejectFollower = async function(userId) {
  this.pendingFollowers = this.pendingFollowers.filter(
    p => p.user.toString() !== userId.toString()
  );
  await this.save();
};

// Legacy follow (public account — instant)
UserSchema.methods.followUser = async function(userId) {
  if (!this.isFollowing(userId)) {
    this.following.push(userId);
    await this.save();
  }
};

UserSchema.methods.unfollowUser = async function(userId) {
  this.following = this.following.filter(id => id.toString() !== userId.toString());
  await this.save();
};

UserSchema.methods.addFollower = async function(userId) {
  if (!this.isFollower(userId)) {
    this.followers.push(userId);
    await this.save();
  }
};

UserSchema.methods.removeFollower = async function(userId) {
  this.followers = this.followers.filter(id => id.toString() !== userId.toString());
  await this.save();
};

// ====================== CREATE MODEL ======================
const User = mongoose.models.user || model("user", UserSchema);

module.exports = User;
