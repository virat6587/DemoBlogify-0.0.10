const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const NotificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },

  type: {
    type: String,
    enum: [
      "comment",
      "reply",
      "like",
      "follow",           // Instant follow on public account
      "follow_request",   // Pending follow request on private account
      "follow_accepted",  // Request accepted
      "new_blog",         // New blog from followed user
      "mention"
    ],
    required: true
  },

  title: String,
  message: String,

  // Related entities
  blog: {
    type: Schema.Types.ObjectId,
    ref: "blog"
  },

  actor: {
    type: Schema.Types.ObjectId,
    ref: "user"
  },

  // For follow requests: pending requester ID
  requester: {
    type: Schema.Types.ObjectId,
    ref: "user"
  },

  // For follow requests: status tracking
  requestStatus: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: null
  },

  // Blog image for new_blog notifications
  blogImageURL: {
    type: String,
    default: null
  },

  // Status
  isRead: { type: Boolean, default: false },

}, { timestamps: true });

// Index for performance
NotificationSchema.index({ recipient: 1, isRead: 1 });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });

const Notification = mongoose.models.Notification || model("Notification", NotificationSchema);
module.exports = Notification;
