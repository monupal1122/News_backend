const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');
const { protectAdmin, restrictTo } = require('../middlewares/authMiddleware');
const { loginLimiter } = require('../middlewares/rateLimiter');

const { upload } = require('../config/cloudinary');
const articleController = require('../controllers/articleController');

// Author Login
router.get('/', (req, res) => res.redirect('/author/login'));
router.get('/login', (req, res) => res.render('author/login', { error: null }));
router.post('/login', loginLimiter, authController.authorLogin);
router.get('/logout', authController.logout);

// Protected Author Routes
router.use(protectAdmin);
router.use(restrictTo('author')); // Strict author-only access for this router

router.get('/dashboard', adminController.getDashboard);
router.get('/articles', adminController.getArticles);
router.get('/articles/create', adminController.getCreateArticle);
router.get('/articles/edit/:id', adminController.getEditArticle);
router.get('/account', adminController.getAccount);
router.post('/update-profile', upload.single('profileImage'), adminController.updateProfile);
router.get('/authors', adminController.getAuthors);

// Article CRUD for Authors
router.post('/articles', upload.single('image'), articleController.createArticle);
router.post('/articles/:id', upload.single('image'), articleController.updateArticle);
router.delete('/articles/:id', articleController.deleteArticle);

module.exports = router;
