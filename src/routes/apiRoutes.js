const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const categoryController = require('../controllers/categoryController');
const authorController = require('../controllers/authorController');
const authController = require('../controllers/authController');
const DeleteCategory = require('../controllers/categoryController');
const { apiLimiter, loginLimiter, forgotPasswordLimiter } = require('../middlewares/rateLimiter');
const { validateSeoSlug } = require('../middlewares/seoMiddleware');

// Auth Routes
router.post('/auth/login', loginLimiter, authController.login);
router.post('/auth/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/auth/reset-password/:token', authController.resetPassword);

// Public News Routes
router.get('/articles', apiLimiter, articleController.getArticles);
router.get('/articles/featured', articleController.getFeaturedArticles);
router.get('/articles/category/:category', articleController.getArticlesByCategory);
router.get('/articles/subcategory/:category/:subcategory', articleController.getArticlesBySubcategory);
router.get('/articles/search', articleController.searchArticles);
router.get('/articles/:category/:subcategory/:slugId', validateSeoSlug, articleController.getArticleBySlug);
router.get('/articles/:id', articleController.getArticleById);
router.get('/articles/public/:publicId', articleController.getArticleByPublicId);
router.get('/articles/author/:id', authorController.getAuthorArticles);
router.get('/articles/tag/:tag', articleController.getArticlesByTag);

// Author Routes
router.get('/authors/:id', authorController.getAuthorProfile);

// Category Routes
router.get('/categories', categoryController.getCategories);
router.delete('/categories/:id', categoryController.deleteCategory);
router.put('/categories/:id', categoryController.updateCategory);
router.get('/categories/full', categoryController.getCategoriesWithSubcategories);
router.get('/categories/:categoryId/subcategories', categoryController.getSubcategoriesByCategory);

// Subcategory Routes
router.put('/subcategories/:id', categoryController.updateSubcategory);
router.delete('/subcategories/:id', categoryController.deleteSubcategory);

// Ads Routes
const adsRoutes = require('./adsroute');
router.use('/ads', adsRoutes);

module.exports = router;
