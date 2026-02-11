const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const protectAdmin = async (req, res, next) => {
    let token;

    // Check for token in cookies
    if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }
        const redirectUrl = req.originalUrl.startsWith('/author') ? '/author/login' : '/admin/login';
        return res.redirect(redirectUrl);
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3) Check if user still exists
        const currentAdmin = await Admin.findById(decoded.id);
        if (!currentAdmin) {
            res.clearCookie('token');
            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            const redirectUrl = req.originalUrl.startsWith('/author') ? '/author/login' : '/admin/login';
            return res.redirect(redirectUrl);
        }

        // 4) Check if user changed password after the token was issued
        if (currentAdmin.changedPasswordAfter(decoded.iat)) {
            res.clearCookie('token');
            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({ message: 'User recently changed password! Please log in again.' });
            }
            const redirectUrl = req.originalUrl.startsWith('/author') ? '/author/login' : '/admin/login';
            return res.redirect(redirectUrl);
        }

        // Grant access to protected route
        req.admin = currentAdmin;
        res.locals.admin = currentAdmin;

        next();
    } catch (error) {
        console.error(error);
        res.clearCookie('token');
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
        const redirectUrl = req.originalUrl.startsWith('/author') ? '/author/login' : '/admin/login';
        return res.redirect(redirectUrl);
    }
};

const restrictTo = (...roles) => {
    return (req, res, next) => {
        // req.admin is set by protectAdmin
        if (!roles.includes(req.admin.role)) {
            if (req.originalUrl.startsWith('/api')) {
                return res.status(403).json({
                    message: 'You do not have permission to perform this action'
                });
            }
            return res.status(403).render('error', {
                message: 'You do not have permission to access this page'
            });
        }
        next();
    };
};

module.exports = { protectAdmin, restrictTo };
