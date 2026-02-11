const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const passport = require('passport');
const articleController = require('../controllers/articleController');
const { protectAdmin, restrictTo } = require('../middlewares/authMiddleware');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const { upload } = require('../config/cloudinary');
const { loginLimiter, forgotPasswordLimiter } = require('../middlewares/rateLimiter');

// Auth
router.get('/', (req, res) => res.redirect('/admin/login'));
router.get('/login', (req, res) => res.render('admin/login'));
router.post('/login', loginLimiter, authController.adminLogin);
router.get('/logout', authController.logout);

// Google Auth Middleware Check
const checkGoogleConfig = (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        req.flash('error', 'Google Login is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.');
        return res.redirect('/admin/login');
    }
    next();
};

router.get('/auth/google', checkGoogleConfig, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
    checkGoogleConfig,
    passport.authenticate('google', { failureRedirect: '/admin/login' }),
    authController.googleCallback
);

// Forgot Password
router.get('/forgot-password', authController.getForgotPassword);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.get('/reset-password/:token', authController.getResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Protected Admin Routes
router.use(protectAdmin);

router.get('/dashboard', restrictTo('admin'), adminController.getDashboard);
router.get('/articles', adminController.getArticles);
router.get('/articles/create', restrictTo('author'), adminController.getCreateArticle);
router.get('/articles/edit/:id', adminController.getEditArticle);

// Categories (Admin Only)
router.get('/categories', restrictTo('admin'), adminController.getCategories);
router.post('/categories', restrictTo('admin'), async (req, res) => {
    try {
        const { name, slug, description, status } = req.body;
        await Category.create({
            name,
            slug: slug || name.toLowerCase().replace(/ /g, '-'),
            description,
            status: status || 'active'
        });
        res.redirect('/admin/categories');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.delete('/delete/categories/:id', restrictTo('admin'), adminController.deleteCategory);
router.put('/update/categories/:id', restrictTo('admin'), adminController.updateCategory);

// Subcategories (Admin Only)
router.get('/subcategories', restrictTo('admin'), adminController.getSubcategories);
router.put('/subcategories/:id', restrictTo('admin'), adminController.updatesubcategory);
router.delete('/subcategories/:id', restrictTo('admin'), adminController.deletesubcategory);
router.post('/subcategories', restrictTo('admin'), async (req, res) => {
    try {
        const { name, slug, category, description, status, displayOrder } = req.body;
        await Subcategory.create({
            name,
            slug: slug || name.toLowerCase().replace(/ /g, '-'),
            description,
            category,
            status: status || 'active',
            displayOrder: displayOrder || 0
        });
        res.redirect('/admin/subcategories');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// Account & Settings
router.get('/account', adminController.getAccount);
router.post('/update-profile', upload.single('profileImage'), adminController.updateProfile);
router.post('/update-password', authController.updatePassword);

// Authors Management (Admin sees all, Author sees list but can't edit)
router.get('/authors', adminController.getAuthors);
router.post('/authors', restrictTo('admin'), adminController.createAuthor);
router.put('/authors/:id', restrictTo('admin'), adminController.updateAuthor);
router.delete('/authors/:id', restrictTo('admin'), adminController.deleteAuthor);
router.get('/authors/:id/articles', restrictTo('admin'), adminController.getArticlesByAuthor);

// Article CRUD (called via AJAX or form submission)
router.post('/articles', upload.single('image'), articleController.createArticle);
router.post('/articles/:id', upload.single('image'), articleController.updateArticle);
router.delete('/articles/:id', articleController.deleteArticle);

module.exports = router;
