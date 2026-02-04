const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465, // MUST be true for port 465
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Required for many Webmail SMTP servers
        }
    });

    // 2) Define the email options
    const mailOptions = {
        from: `Daily Chronicle <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html, // Add this line
    };

    // 3) Actually send the email
    return await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
