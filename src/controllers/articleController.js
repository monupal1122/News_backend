const Article = require('../models/Article');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const { client } = require('../config/redis');

// @desc    Get all articles (paginated)
// @route   GET /api/articles
exports.getArticles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let cachedData = null;
        const cacheKey = `user:${userId}`;
        try {
            if (client.isOpen) {
                cachedData = await client.get(cacheKey);
            }
        } catch (err) {
            console.error('Redis Get Error:', err.message);
        }

        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        const total = await Article.countDocuments();
        const articles = await Article.find()
            .populate('category subcategory')
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        const response = {
            articles,
            page,
            pages: Math.ceil(total / limit),
            total
        };

        try {
            if (client.isOpen) {
                await client.setEx(cacheKey, 300, JSON.stringify(response)); // Cache for 5 mins
            }
        } catch (err) {
            console.error('Redis Set Error:', err.message);
        }

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get featured articles
// @route   GET /api/articles/featured
exports.getFeaturedArticles = async (req, res) => {
    try {
        let cachedData = null;
        try {
            if (client.isOpen) {
                cachedData = await client.get(cacheKey);
            }
        } catch (err) {
            console.error('Redis Get Error:', err.message);
        }

        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        const articles = await Article.find({ isFeatured: true })
            .populate('category subcategory')
            .sort({ publishedAt: -1 })
            .limit(5);

        try {
            if (client.isOpen) {
                await client.setEx(cacheKey, 600, JSON.stringify(articles)); // Cache for 10 mins
            }
        } catch (err) {
            console.error('Redis Set Error:', err.message);
        }

        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get articles by category
// @route   GET /api/articles/category/:category
exports.getArticlesByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let cachedData = null;
        try {
            if (client.isOpen) {
                cachedData = await client.get(cacheKey);
            }
        } catch (err) {
            console.error('Redis Get Error:', err.message);
        }

        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        // Check if category is a slug or an ID
        let query = { category };
        if (category.match(/^[0-9a-fA-F]{24}$/)) {
            query = { category };
        } else {
            const foundCategory = await Category.findOne({ slug: category });
            if (foundCategory) {
                query = { category: foundCategory._id };
            }
        }

        const articles = await Article.find(query)
            .populate('category subcategory')
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        try {
            if (client.isOpen) {
                await client.setEx(cacheKey, 300, JSON.stringify(articles));
            }
        } catch (err) {
            console.error('Redis Set Error:', err.message);
        }

        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get articles by subcategory
// @route   GET /api/articles/subcategory/:subcategory
exports.getArticlesBySubcategory = async (req, res) => {
    try {
        const { subcategory } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let query = { subcategory };
        if (!subcategory.match(/^[0-9a-fA-F]{24}$/)) {
            const foundSubcategory = await Subcategory.findOne({ slug: subcategory });
            if (foundSubcategory) {
                query = { subcategory: foundSubcategory._id };
            }
        }

        const articles = await Article.find(query)
            .populate('category subcategory')
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get article by ID
// @route   GET /api/articles/:id
exports.getArticleById = async (req, res) => {
    try {
        const article = await Article.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewCount: 1 } },
            { new: true }
        ).populate('category subcategory');

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        res.status(200).json(article);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search articles
// @route   GET /api/articles/search
exports.searchArticles = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: 'Search query is required' });

        // 1. Try Full-Text Search first for ranked results
        let articles = await Article.find(
            { $text: { $search: q } },
            { score: { $meta: 'textScore' } }
        )
            .populate('category subcategory')
            .sort({ score: { $meta: 'textScore' } })
            .limit(20);

        // 2. If no results or short query, try Regex partial search
        if (articles.length === 0) {
            articles = await Article.find({
                $or: [
                    { title: { $regex: q, $options: 'i' } },
                    { description: { $regex: q, $options: 'i' } }
                ]
            })
                .populate('category subcategory')
                .sort({ publishedAt: -1 })
                .limit(20);
        }

        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin CRUD Operations
exports.createArticle = async (req, res) => {
    try {
        const articleData = {
            ...req.body,
            isFeatured: req.body.isFeatured === 'true'
        };
        if (req.file) {
            articleData.imageUrl = req.file.path;
        }

        const article = await Article.create(articleData);

        // Clear cache
        try {
            await client.flushAll();
        } catch (err) {
            console.error('Redis error:', err);
        }

        if (req.originalUrl.startsWith('/admin')) {
            return res.redirect('/admin/articles');
        }

        res.status(201).json(article);
    } catch (error) {
        console.error('Create Article Error:', error);
        if (req.originalUrl.startsWith('/admin')) {
            const categories = await Category.find().sort({ name: 1 });
            const subcategories = req.body.category ? await Subcategory.find({ category: req.body.category }).sort({ name: 1 }) : [];

            return res.render('admin/article-form', {
                article: req.body,
                admin: req.admin,
                mode: 'create',
                categories,
                subcategories,
                error: error.message
            });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.updateArticle = async (req, res) => {
    try {
        const articleData = {
            ...req.body,
            isFeatured: req.body.isFeatured === 'true'
        };
        if (req.file) {
            articleData.imageUrl = req.file.path;
        }

        const article = await Article.findByIdAndUpdate(req.params.id, articleData, { new: true });

        if (!article) {
            if (req.originalUrl.startsWith('/admin')) return res.redirect('/admin/articles');
            return res.status(404).json({ message: 'Article not found' });
        }

        try {
            await client.flushAll();
        } catch (err) {
            console.error('Redis error:', err);
        }

        if (req.originalUrl.startsWith('/admin')) {
            return res.redirect('/admin/articles');
        }

        res.status(200).json(article);
    } catch (error) {
        if (req.originalUrl.startsWith('/admin')) {
            const article = await Article.findById(req.params.id);
            const categories = await Category.find().sort({ name: 1 });
            const subcategories = req.body.category ? await Subcategory.find({ category: req.body.category }).sort({ name: 1 }) : [];

            return res.render('admin/article-form', {
                article: { ...article ? article.toObject() : {}, ...req.body },
                admin: req.admin,
                mode: 'edit',
                categories,
                subcategories,
                error: error.message
            });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.deleteArticle = async (req, res) => {
    try {
        const article = await Article.findByIdAndDelete(req.params.id);
        if (!article) {
            if (req.headers['accept']?.includes('application/json')) {
                return res.status(404).json({ message: 'Article not found' });
            }
            return res.redirect('/admin/articles');
        }

        try {
            await client.flushAll();
        } catch (err) {
            console.error('Redis error:', err);
        }

        if (req.headers['accept']?.includes('application/json')) {
            return res.status(200).json({ message: 'Article deleted' });
        }

        res.redirect('/admin/articles');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

