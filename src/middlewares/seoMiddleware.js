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

        // Validate articleId format (Numeric publicId)
        if (!articleId.match(/^\d+$/)) {
            return res.status(400).json({ message: 'Invalid article ID' });
        }

        // Fetch article with populated category and subcategories
        const article = await Article.findOne({ publicId: articleId }).populate('category subcategories');
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }

        // Get the valid subcategory from the array that matches the URL, or default to the first one
        const matchedSubcategory = article.subcategories.find(s => s.slug === subcategorySlug);
        const primarySubcategory = matchedSubcategory || article.subcategories[0];

        // If no subcategory is found (edge case), use a placeholder or handle error
        // But schema requires at least one subcategory
        const canonicalSubcategorySlug = primarySubcategory ? primarySubcategory.slug : 'general';

        // Check if slugs match, redirect to correct URL if they don't
        try {
            const decodedSlug = decodeURIComponent(slug);
            const canonicalSubcategorySlug = primarySubcategory ? primarySubcategory.slug : 'general';
            const correctUrl = `/articles/${article.category.slug}/${canonicalSubcategorySlug}/${article.slug}-${article.publicId}`;

            if (article.category.slug !== categorySlug || !matchedSubcategory || article.slug !== decodedSlug) {
                // If it's an API request, we just continue to show the article
                if (req.originalUrl.startsWith('/api')) {
                    return next();
                }
                return res.redirect(301, correctUrl);
            }
        } catch (err) {
            console.error('Decoding Error:', err);
            // If decoding fails, just continue
            return next();
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
