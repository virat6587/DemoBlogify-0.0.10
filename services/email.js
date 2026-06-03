const nodemailer = require('nodemailer');

// ====================== GMAIL TRANSPORTER SETUP ======================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email Service Error:", error.message);
        console.error("❌ Full Error:", error);
    } else {
        console.log("✅ Email Service Ready - Connected to Gmail");
    }
});

// ====================== SEND OTP EMAIL ======================
const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Signup OTP - Blogify',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
                <div style="background-color: white; border-radius: 10px; padding: 30px; text-align: center;">
                    <h2 style="color: #667eea; margin: 0 0 10px 0;">Verify Your Email</h2>
                    <p style="color: #666; margin: 0 0 20px 0; font-size: 14px;">Use this code to complete your signup:</p>
                    
                    <div style="background-color: #f5f5f5; border: 3px dashed #667eea; border-radius: 8px; padding: 25px; margin: 20px 0;">
                        <h1 style="font-size: 48px; letter-spacing: 15px; color: #333; margin: 0; font-family: 'Courier New', monospace; font-weight: bold;">${otp}</h1>
                    </div>
                    
                    <p style="color: #999; margin: 15px 0; font-size: 14px;">
                        <strong>⏱️ This code expires in 5 minutes</strong>
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; margin: 10px 0;">
                        If you didn't request this code, please ignore this email.
                    </p>
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        © 2024 Blogify. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP Email Sent to ${email}`);
        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error("❌ Failed to send OTP email:", error.message);
        console.error("❌ Full Error:", error);
        throw new Error(`Email service error: ${error.message}`);
    }
};

// ====================== SEND RESET PASSWORD EMAIL ======================
const sendResetPasswordEmail = async (email, resetLink) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Reset Your Blogify Password',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
                <div style="background-color: white; border-radius: 10px; padding: 30px;">
                    <h2 style="color: #667eea; margin: 0 0 10px 0; text-align: center;">Password Reset Request</h2>
                    
                    <p style="color: #666; margin: 15px 0; line-height: 1.6;">
                        We received a request to reset your Blogify password. Click the button below to create a new password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #999; margin: 15px 0; font-size: 13px;">
                        Or copy and paste this link in your browser:
                    </p>
                    <p style="background-color: #f5f5f5; padding: 12px; border-radius: 5px; word-break: break-all; color: #667eea; font-size: 12px; font-family: 'Courier New', monospace;">
                        ${resetLink}
                    </p>
                    
                    <p style="color: #e74c3c; font-weight: bold; margin: 15px 0; font-size: 14px;">
                        ⏱️ This link will expire in 30 minutes
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; margin: 10px 0;">
                        If you didn't request this, please ignore this email and your password will remain unchanged.
                    </p>
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        © 2024 Blogify. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Reset Password Email Sent to ${email}`);
        return { success: true, message: 'Reset link sent successfully' };
    } catch (error) {
        console.error("❌ Failed to send reset password email:", error.message);
        console.error("❌ Full Error:", error);
        throw new Error(`Email service error: ${error.message}`);
    }
};

// ====================== SEND COMMENT NOTIFICATION EMAIL ======================
const sendCommentNotificationEmail = async (recipientEmail, data) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `New comment on "${data.blogTitle}"`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
                <div style="background-color: white; border-radius: 10px; padding: 30px;">
                    <h2 style="color: #667eea; margin: 0 0 10px 0;">New Comment on Your Blog</h2>
                    
                    <p style="color: #666; margin: 15px 0; line-height: 1.6;">
                        <strong>${data.actorName}</strong> commented on your blog <strong>"${data.blogTitle}"</strong>:
                    </p>
                    
                    <div style="background-color: #f5f5f5; border-left: 4px solid #667eea; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="color: #333; margin: 0; font-style: italic;">
                            "${data.comment}"
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${data.blogLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            View Blog & Reply
                        </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        © 2024 Blogify. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Comment Notification Email Sent to ${recipientEmail}`);
        return { success: true };
    } catch (error) {
        console.error("❌ Failed to send comment notification email:", error.message);
        console.error("❌ Full Error:", error);
        throw error;
    }
};

// ====================== SEND FOLLOW NOTIFICATION EMAIL ======================
const sendFollowNotificationEmail = async (recipientEmail, data) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: `${data.followerName} started following you`,
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
                <div style="background-color: white; border-radius: 10px; padding: 30px; text-align: center;">
                    <h2 style="color: #667eea; margin: 0 0 10px 0;">New Follower</h2>
                    
                    <p style="color: #666; margin: 15px 0; line-height: 1.6;">
                        <strong>${data.followerName}</strong> started following you!
                    </p>
                    
                    <div style="margin: 25px 0;">
                        <img src="${data.followerImage}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid #667eea;">
                    </div>
                    
                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${data.profileLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            View Profile
                        </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                    
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        © 2024 Blogify. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Follow Notification Email Sent to ${recipientEmail}`);
        return { success: true };
    } catch (error) {
        console.error("❌ Failed to send follow notification email:", error.message);
        console.error("❌ Full Error:", error);
        throw error;
    }
};

// ====================== GENERIC SEND EMAIL (FOR OTHER PURPOSES) ======================
const sendEmail = async (to, subject, htmlContent) => {
    const mailOptions = {
        from: `"Blogify" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email Sent to ${to}`);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error("❌ Failed to send email:", error.message);
        console.error("❌ Full Error:", error);
        throw new Error(`Email service error: ${error.message}`);
    }
};

module.exports = { 
    sendOTPEmail, 
    sendResetPasswordEmail,
    sendCommentNotificationEmail,
    sendFollowNotificationEmail,
    sendEmail 
};
