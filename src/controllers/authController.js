const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../services/emailService');

const signToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1d'
    });
};

const sendResponse = (req, res, statusCode, data, redirectPath) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(statusCode).json(data);
    }
    if (redirectPath) {
        return res.redirect(redirectPath);
    }
    // Default fallback
    res.status(statusCode).json(data);
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            if (req.originalUrl.startsWith('/api')) {
                return res.status(400).json({ message: 'Please provide email and password' });
            }
            return res.render('admin/login', { error: 'Please provide email and password' });
        }

        const admin = await Admin.findOne({ email }).select('+password');

        if (!admin || !(await admin.comparePassword(password, admin.password))) {
            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({ message: 'Incorrect email or password' });
            }
            return res.render('admin/login', { error: 'Incorrect email or password' });
        }

        const token = signToken(admin._id);
        const cookieOptions = {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        };

        res.cookie('token', token, cookieOptions);

        if (req.originalUrl.startsWith('/api')) {
            admin.password = undefined;
            return res.status(200).json({
                status: 'success',
                token,
                data: { admin }
            });
        }

        res.redirect('/admin/dashboard');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.logout = (req, res) => {
    res.cookie('token', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.redirect('/admin/login');
};

exports.getForgotPassword = (req, res) => {
    res.render('admin/forgot-password', { error: null, message: null });
};

exports.forgotPassword = async (req, res) => {
    try {
        console.log('Forgot password request for:', req.body.email);

        // 1) Get admin based on POSTed email
        const admin = await Admin.findOne({ email: req.body.email });

        // Security: Even if admin not found, don't reveal it.
        if (admin) {
            console.log('Admin found, generating token...');
            // 2) Generate the random reset token
            const resetToken = admin.createPasswordResetToken();
            await admin.save({ validateBeforeSave: false });

            // 3) Send it to admin's email
            const resetURL = `${req.protocol}://${req.get('host')}/admin/reset-password/${resetToken}`;
            const message = `Forgot your password? Submit a request with your new password to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!\nThis link is valid for 10 minutes.`;

            try {
                // Check if email config exists before sending
                if (!process.env.EMAIL_HOST || !process.env.EMAIL_USERNAME) {
                    throw new Error('Email configuration is missing in .env file');
                }

                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
                        <h2 style="color: #333;">Password Reset Request</h2>
                        <p>You requested a password reset for your Daily Chronicle Admin account. Click the button below to set a new password:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetURL}" style="background-color: #0b5f17; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset My Password</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #0b5f17;">${resetURL}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #999;">This link is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `;

                await sendEmail({
                    email: admin.email,
                    subject: 'Your password reset token (valid for 10 min)',
                    message,
                    html
                });
                console.log('Reset email sent successfully');
            } catch (err) {
                console.error('Email sending failed:', err.message);
                // We DON'T reset the token here so the user can still be manually helped
                // admin.passwordResetToken = undefined;
                // admin.passwordResetExpires = undefined;
                // await admin.save({ validateBeforeSave: false });
            }
        } else {
            console.log('Admin not found (responding with generic success)');
        }

        // 4) Generic Success Response
        const successMessage = 'If an account with that email exists, a password reset link has been sent.';
        if (req.originalUrl.startsWith('/api')) {
            return res.status(200).json({ status: 'success', message: successMessage });
        }
        res.render('admin/forgot-password', { error: null, message: successMessage });

    } catch (error) {
        console.error('FORGOT PASSWORD GLOBAL ERROR:', error);
        if (req.originalUrl.startsWith('/api')) {
            return res.status(500).json({ status: 'error', message: error.message });
        }
        res.render('admin/forgot-password', { error: 'An internal error occurred. Please try again later.', message: null });
    }
};

exports.getResetPassword = async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const admin = await Admin.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!admin) {
            return res.render('admin/forgot-password', {
                error: 'This reset link is invalid or has expired. Please request a new one.',
                message: null
            });
        }

        res.render('admin/reset-password', { token: req.params.token, error: null });
    } catch (error) {
        res.redirect('/admin/forgot-password');
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password, passwordConfirm } = req.body;
        console.log('Attempting password reset with token...');

        // 1. Strong Password Validation
        if (password !== passwordConfirm) {
            return res.render('admin/reset-password', { token: req.params.token, error: 'Passwords do not match' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
        if (!passwordRegex.test(password)) {
            const error = 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.';
            return res.render('admin/reset-password', { token: req.params.token, error });
        }

        // 2) Get admin based on the token
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const admin = await Admin.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        // 3) If token has not expired, and there is admin, set the new password
        if (!admin) {
            console.log('RESET FAILED: Token invalid or expired in DB');
            const error = 'Token is invalid or has expired';
            if (req.originalUrl.startsWith('/api')) return res.status(400).json({ message: error });
            return res.render('admin/reset-password', { token: req.params.token, error });
        }

        console.log('Admin found for token, updating password...');
        admin.password = password;
        admin.passwordResetToken = undefined;
        admin.passwordResetExpires = undefined;
        await admin.save();

        // 4) Log the admin in, send JWT
        const token = signToken(admin._id);
        res.cookie('token', token, {
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        if (req.originalUrl.startsWith('/api')) {
            return res.status(200).json({ status: 'success', message: 'Password reset successful!' });
        }

        req.flash('success_msg', 'Password reset successful! You are now logged in.');
        res.redirect('/admin/dashboard');

    } catch (error) {
        console.error('RESET PASSWORD ERROR:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.googleCallback = (req, res) => {
    const token = signToken(req.user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    };

    res.cookie('token', token, cookieOptions);
    res.redirect('/admin/dashboard');
};

exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const admin = await Admin.findById(req.admin._id).select('+password');

        // 1. Check if current password is correct
        if (!(await admin.comparePassword(currentPassword, admin.password))) {
            req.flash('error_msg', 'The current password you entered is incorrect.');
            return res.redirect('/admin/account');
        }

        // 2. Check if new passwords match
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'The new passwords do not match.');
            return res.redirect('/admin/account');
        }

        // 3. Check for strong password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            req.flash('error_msg', 'New password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number.');
            return res.redirect('/admin/account');
        }

        // 4. Update password
        admin.password = newPassword;
        await admin.save();

        req.flash('success_msg', 'Password updated successfully!');
        res.redirect('/admin/account');
    } catch (error) {
        console.error('UPDATE PASSWORD ERROR:', error);
        req.flash('error_msg', 'An error occurred while updating the password.');
        res.redirect('/admin/account');
    }
};
