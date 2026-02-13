const Article = require('../models/Article');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Admin = require('../models/Admin');
const { client } = require('../config/redis');

// @desc    Get all articles (paginated)
// @route   GET /api/articles
exports.getArticles = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let cachedData = null;
        const cacheKey = `articles:page:${page}:limit:${limit}`;
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
            .populate('category subcategories author')
            .sort({ createdAt: -1 })
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
        const cacheKey = 'articles:featured';
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
            .populate('category subcategories author')
            .sort({ createdAt: -1 })
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
        const cacheKey = `articles:category:${category}:page:${page}:limit:${limit}`;
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
            .populate('category subcategories author')
            .sort({ createdAt: -1 })
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
            .populate('category subcategories author')
            .sort({ createdAt: -1 })
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
        ).populate('category subcategories author');

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        res.status(200).json(article);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get article by public ID (numeric nanoid)
// @route   GET /api/articles/public/:publicId
exports.getArticleByPublicId = async (req, res) => {
    try {
        const article = await Article.findOneAndUpdate(
            { publicId: req.params.publicId },
            { $inc: { viewCount: 1 } },
            { new: true }
        ).populate('category subcategories author');

        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        res.status(200).json(article);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get article by SEO URL
// @route   GET /api/articles/:category/:subcategory/:slug-:id
exports.getArticleBySlug = async (req, res) => {
    try {
        // Article is already validated and attached by middleware
        const article = await Article.findByIdAndUpdate(
            req.article._id,
            { $inc: { viewCount: 1 } },
            { new: true }
        ).populate('category subcategories author');

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
            .populate('category subcategories author')
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
                .populate('category subcategories author')
                .sort({ createdAt: -1 })
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
            author: req.body.author || req.admin._id,
            isFeatured: req.body.isFeatured === 'true',
            tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(tag => tag.trim())) : []
        };
        if (req.file) {
            articleData.featuredImage = req.file.path;
        }

        const article = new Article(articleData);
        await article.save();

        // Clear cache
        try {
            await client.flushAll();
        } catch (err) {
            console.error('Redis error:', err);
        }

        if (req.originalUrl.startsWith('/admin')) {
            return res.redirect('/admin/articles');
        }
        if (req.originalUrl.startsWith('/author')) {
            return res.redirect('/author/articles');
        }

        res.status(201).json(article);
    } catch (error) {
        console.error('Create Article Error:', error);
        if (req.originalUrl.startsWith('/admin') || req.originalUrl.startsWith('/author')) {
            const categories = await Category.find().sort({ name: 1 });
            const authors = req.admin.role === 'admin' ? await Admin.find().sort({ name: 1 }) : [];
            const subcategories = req.body.category ? await Subcategory.find({ category: req.body.category }).sort({ name: 1 }) : [];

            return res.render('admin/article-form', {
                article: req.body,
                admin: req.admin,
                mode: 'create',
                categories,
                subcategories,
                authors,
                error: error.message
            });
        }
        res.status(500).json({ message: error.message });
    }
};

exports.updateArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            if (req.originalUrl.startsWith('/admin')) return res.redirect('/admin/articles');
            return res.status(404).json({ message: 'Article not found' });
        }

        // Ownership validation: Admin can edit anything, Author can only edit their own
        if (req.admin.role !== 'admin' && article.author.toString() !== req.admin._id.toString()) {
            if (req.originalUrl.startsWith('/admin')) {
                return res.status(403).send('Not authorized to edit this article');
            }
            return res.status(403).json({ message: 'Not authorized to edit this article' });
        }

        const articleData = {
            ...req.body,
            isFeatured: req.body.isFeatured === 'true',
            tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(tag => tag.trim())) : article.tags
        };
        if (req.file) {
            articleData.featuredImage = req.file.path;
        }

        // Normalize subcategories to prevent CastError
        if (articleData.subcategories === "" || articleData.subcategories === null) {
            articleData.subcategories = [];
        } else if (typeof articleData.subcategories === 'string') {
            articleData.subcategories = [articleData.subcategories];
        } else if (Array.isArray(articleData.subcategories)) {
            articleData.subcategories = articleData.subcategories.filter(id => id && id.trim() !== "");
        }

        Object.assign(article, articleData);
        await article.save();

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
        if (req.originalUrl.startsWith('/author')) {
            return res.redirect('/author/articles');
        }

        res.status(200).json(article);
    } catch (error) {
        if (req.originalUrl.startsWith('/admin') || req.originalUrl.startsWith('/author')) {
            console.error('Update Article Error Details:', error);
            const article = await Article.findById(req.params.id);
            const categories = await Category.find().sort({ name: 1 });
            const subcategories = req.body.category ? await Subcategory.find({ category: req.body.category }).sort({ name: 1 }) : [];
            const authors = req.admin.role === 'admin' ? await Admin.find().sort({ name: 1 }) : [];

            return res.render('admin/article-form', {
                article: { ...article ? article.toObject() : {}, ...req.body },
                admin: req.admin,
                mode: 'edit',
                categories,
                subcategories,
                authors,
                error: error.message
            });
        }
        console.error('API Update Article Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.deleteArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) {
            if (req.headers['accept']?.includes('application/json')) {
                return res.status(404).json({ message: 'Article not found' });
            }
            if (req.originalUrl.startsWith('/author')) return res.redirect('/author/articles');
            return res.redirect('/admin/articles');
        }

        // Ownership validation
        if (req.admin.role !== 'admin' && article.author.toString() !== req.admin._id.toString()) {
            if (req.headers['accept']?.includes('application/json')) {
                return res.status(403).json({ message: 'Not authorized to delete this article' });
            }
            return res.status(403).send('Not authorized to delete this article');
        }

        await article.deleteOne();

        try {
            await client.flushAll();
        } catch (err) {
            console.error('Redis error:', err);
        }

        if (req.headers['accept']?.includes('application/json')) {
            return res.status(200).json({ message: 'Article deleted' });
        }

        if (req.originalUrl.startsWith('/author')) {
            return res.redirect('/author/articles');
        }
        res.redirect('/admin/articles');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get articles by subcategory
// @route   GET /api/articles/subcategory/:category/:subcategory
exports.getArticlesBySubcategory = async (req, res) => {
    try {
        const { category, subcategory } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        // Find subcategory by slug and check category
        const subcategoryDoc = await Subcategory.findOne({ slug: subcategory }).populate('category');
        if (!subcategoryDoc || subcategoryDoc.category.slug !== category) {
            return res.status(404).json({ message: 'Subcategory not found' });
        }

        const articles = await Article.find({ subcategories: subcategoryDoc._id })
            .populate('category subcategories author')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get articles by tag
// @route   GET /api/articles/tag/:tag
exports.getArticlesByTag = async (req, res) => {
    try {
        const tag = req.params.tag.toLowerCase();
        const limit = parseInt(req.query.limit) || 20;

        const articles = await Article.find({ tags: tag })
            .populate('category subcategories author')
            .sort({ createdAt: -1 })
            .limit(limit);

        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

