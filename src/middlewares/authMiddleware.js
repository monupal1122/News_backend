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
        return res.redirect('/admin/login');
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
            return res.redirect('/admin/login');
        }

        // 4) Check if user changed password after the token was issued
        if (currentAdmin.changedPasswordAfter(decoded.iat)) {
            res.clearCookie('token');
            if (req.originalUrl.startsWith('/api')) {
                return res.status(401).json({ message: 'User recently changed password! Please log in again.' });
            }
            return res.redirect('/admin/login');
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
        return res.redirect('/admin/login');
    }
};

module.exports = { protectAdmin };
