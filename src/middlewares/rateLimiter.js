const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 5, // Limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes',
    handler: (req, res, next, options) => {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(options.statusCode).json({ message: options.message });
        }
        req.flash('error', options.message);
        res.redirect('/admin/login');
    }
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 1* 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 forgot password requests per windowMs
    message: 'Too many password reset requests, please try again after an hour',
    handler: (req, res, next, options) => {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(options.statusCode).json({ message: options.message });
        }
        res.render('admin/forgot-password', { error: options.message, message: null });
    }
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});

module.exports = { loginLimiter, forgotPasswordLimiter, apiLimiter };
