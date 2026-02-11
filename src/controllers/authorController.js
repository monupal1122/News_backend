const Admin = require('../models/Admin');
const Article = require('../models/Article');

exports.getAuthorProfile = async (req, res) => {
    try {
        const author = await Admin.findById(req.params.id);
        if (!author) {
            return res.status(404).json({ message: 'Author not found' });
        }

        const articleCount = await Article.countDocuments({ author: req.params.id, publishStatus: 'published' });
        const authorData = author.toObject();
        authorData.articleCount = articleCount;

        res.status(200).json(authorData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getAuthorArticles = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 12;

        const articles = await Article.find({ author: id, publishStatus: 'published' })
            .populate('category subcategories author')
            .sort({ publishedAt: -1 })
            .limit(limit);

        res.status(200).json(articles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
