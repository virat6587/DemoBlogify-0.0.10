const nodemailer = require('nodemailer');
require('dotenv').config();

// ====================== VALIDATE EMAIL CONFIG ======================
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error("❌ CRITICAL: EMAIL_USER or EMAIL_PASSWORD not set in .env file");
    console.error("❌ Please add EMAIL_USER and EMAIL_PASSWORD to .env");
}

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

// Verify transporter connection on startup with detailed logging
transporter.verify((error, success) => {
    if (error) {
        console.error("\n❌ ============= EMAIL SERVICE ERROR =============");
        console.error("❌ Failed to connect to Gmail SMTP");
        console.error("❌ Error Message:", error.message);
        console.error("❌ Error Code:", error.code);
        console.error("❌ Error Command:", error.command);
        console.error("❌ EMAIL_USER:", process.env.EMAIL_USER);
        console.error("❌ EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : "NOT SET");
        console.error("❌ EMAIL_PASSWORD (first 5 chars):", process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.substring(0, 5) : "NOT SET");
        console.error("❌ Has spaces in password:", process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.includes(' ') : "N/A");
        console.error("❌ ============================================\n");
    } else {
        console.log("\n✅ ============= EMAIL SERVICE READY =============");
        console.log("✅ Connected to Gmail SMTP Successfully");
        console.log("✅ Email User:", process.env.EMAIL_USER);
        console.log("✅ Password length:", process.env.EMAIL_PASSWORD.length);
        console.log("✅ =============================================\n");
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
        console.log(`\n📧 ========== SENDING OTP EMAIL ==========`);
        console.log(`📧 To: ${email}`);
        console.log(`📧 From: ${process.env.EMAIL_USER}`);
        console.log(`📧 OTP: ${otp}`);
        
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP Email Sent Successfully!`);
        console.log(`✅ Message ID: ${info.messageId}`);
        console.log(`📧 =====================================\n`);
        return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
        console.error("\n❌ ========== OTP EMAIL FAILED ==========");
        console.error("❌ Error Message:", error.message);
        console.error("❌ Error Code:", error.code);
        console.error("❌ Error Command:", error.command);
        console.error("❌ Full Stack:", error.stack);
        console.error("❌ =====================================\n");
        throw new Error(`Failed to send OTP: ${error.message}`);
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
        console.log(`\n📧 ========== SENDING RESET EMAIL ==========`);
        console.log(`📧 To: ${email}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Reset Password Email Sent Successfully!`);
        console.log(`✅ Message ID: ${info.messageId}`);
        console.log(`📧 =====================================\n`);
        return { success: true, message: 'Reset link sent successfully' };
    } catch (error) {
        console.error("\n❌ ========== RESET EMAIL FAILED ==========");
        console.error("❌ Error Message:", error.message);
        console.error("❌ Error Code:", error.code);
        console.error("❌ =====================================\n");
        throw new Error(`Failed to send reset email: ${error.message}`);
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
        console.log(`📧 Sending comment notification to: ${recipientEmail}`);
        await transporter.sendMail(mailOptions);
        console.log(`✅ Comment notification sent successfully`);
        return { success: true };
    } catch (error) {
        console.error("❌ Failed to send comment notification:", error.message);
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
        console.log(`📧 Sending follow notification to: ${recipientEmail}`);
        await transporter.sendMail(mailOptions);
        console.log(`✅ Follow notification sent successfully`);
        return { success: true };
    } catch (error) {
        console.error("❌ Failed to send follow notification:", error.message);
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
        console.log(`📧 Sending email to: ${to}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully`);
        return { success: true, message: 'Email sent successfully' };
    } catch (error) {
        console.error("❌ Failed to send email:", error.message);
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

