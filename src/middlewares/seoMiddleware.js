const Article = require('../models/Article');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

/**
 * Middleware to validate SEO URL slug and redirect if necessary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateSeoSlug = async (req, res, next) => {
    try {
        const { category: categorySlug, subcategory: subcategorySlug, slugId } = req.params;

        // Parse slug and id from slugId (e.g., "landslide-in-kullu-villagers-terrified-6984311266")
        const lastDashIndex = slugId.lastIndexOf('-');
        if (lastDashIndex === -1) {
            return res.status(400).json({ message: 'Invalid URL format' });
        }

        const slug = slugId.substring(0, lastDashIndex);
        const articleId = slugId.substring(lastDashIndex + 1);

        // Validate articleId format
        if (!articleId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: 'Invalid article ID' });
        }

        // Fetch article with populated category and subcategory
        const article = await Article.findById(articleId).populate('category subcategory');
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Check if category slug matches
        if (article.category.slug !== categorySlug) {
            // Redirect to correct URL
            const correctUrl = `/${article.category.slug}/${article.subcategory.slug}/${article.slug}-${article._id}`;
            return res.redirect(301, correctUrl);
        }

        // Check if subcategory slug matches
        if (article.subcategory.slug !== subcategorySlug) {
            // Redirect to correct URL
            const correctUrl = `/${article.category.slug}/${article.subcategory.slug}/${article.slug}-${article._id}`;
            return res.redirect(301, correctUrl);
        }

        // Check if slug matches
        if (article.slug !== slug) {
            // Redirect to correct URL
            const correctUrl = `/${article.category.slug}/${article.subcategory.slug}/${article.slug}-${article._id}`;
            return res.redirect(301, correctUrl);
        }

        // Attach article to request for controller use
        req.article = article;
        next();
    } catch (error) {
        console.error('SEO Middleware Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    validateSeoSlug
};
