const Notification = require("../models/Notification");
const { sendEmail } = require("./email");

class NotificationService {
    // Create notification
    static async createNotification(recipientId, type, data) {
        try {
            const notification = await Notification.create({
                recipient: recipientId,
                type,
                title: data.title,
                message: data.message,
                blog: data.blog || null,
                actor: data.actor || null
            });

            return notification;
        } catch (error) {
            console.error("❌ Error creating notification:", error);
        }
    }

    // Send email notification
    static async sendEmailNotification(user, type, data) {
        try {
            if (!user.notificationSettings[type === 'comment' ? 'emailOnComment' : 
                                           type === 'follow' ? 'emailOnNewFollower' : 
                                           'emailDigest']) {
                return;
            }

            const templates = {
                comment: {
                    subject: `New comment on "${data.blogTitle}"`,
                    body: `<p>${data.actorName} commented on your blog:</p><p>"${data.comment}"</p>`
                },
                like: {
                    subject: `Someone liked your blog "${data.blogTitle}"`,
                    body: `<p>${data.actorName} liked your blog.</p>`
                },
                follow: {
                    subject: `${data.actorName} started following you`,
                    body: `<p>${data.actorName} started following you. Visit their profile!</p>`
                }
            };

            const template = templates[type] || templates.comment;

            await sendEmail(user.email, template.subject, template.body);
        } catch (error) {
            console.error("❌ Error sending email notification:", error);
        }
    }

    // Get user notifications
    static async getUserNotifications(userId, limit = 10, page = 1) {
        try {
            const skip = (page - 1) * limit;
            
            const notifications = await Notification.find({ recipient: userId })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(skip)
                .populate("actor", "fullName profileImageURL")
                .populate("blog", "title slug");

            const total = await Notification.countDocuments({ recipient: userId });

            return {
                notifications,
                total,
                pages: Math.ceil(total / limit)
            };
        } catch (error) {
            console.error("❌ Error getting notifications:", error);
            return { notifications: [], total: 0, pages: 0 };
        }
    }

    // Mark as read
    static async markAsRead(notificationId) {
        try {
            await Notification.findByIdAndUpdate(
                notificationId,
                { isRead: true },
                { new: true }
            );
        } catch (error) {
            console.error("❌ Error marking notification as read:", error);
        }
    }

    // Mark all as read
    static async markAllAsRead(userId) {
        try {
            await Notification.updateMany(
                { recipient: userId, isRead: false },
                { isRead: true }
            );
        } catch (error) {
            console.error("❌ Error marking all notifications as read:", error);
        }
    }

    // Get unread count
    static async getUnreadCount(userId) {
        try {
            return await Notification.countDocuments({ 
                recipient: userId, 
                isRead: false 
            });
        } catch (error) {
            console.error("❌ Error getting unread count:", error);
            return 0;
        }
    }
}

module.exports = NotificationService;

