const Article = require('../models/Article');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

exports.getDashboard = async (req, res) => {
    try {
        const articleCount = await Article.countDocuments();
        const featuredCount = await Article.countDocuments({ isFeatured: true });
        const totalViews = await Article.aggregate([
            { $group: { _id: null, total: { $sum: "$viewCount" } } }
        ]);

        const latestArticles = await Article.find().populate('category').sort({ createdAt: -1 }).limit(5);

        res.render('admin/dashboard', {
            admin: req.admin,
            articleCount,
            featuredCount,
            totalViews: totalViews.length > 0 ? totalViews[0].total : 0,
            latestArticles
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.getArticles = async (req, res) => {
    try {
        const articles = await Article.find().populate('category').sort({ createdAt: -1 });
        res.render('admin/articles', { articles, admin: req.admin });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.getCreateArticle = async (req, res) => {
    const categories = await Category.find().sort({ name: 1 });
    res.render('admin/article-form', {
        article: null,
        admin: req.admin,
        mode: 'create',
        categories
    });
};

exports.getEditArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id);
        if (!article) return res.redirect('/admin/articles');
        const categories = await Category.find().sort({ name: 1 });
        const subcategories = article.category ? await Subcategory.find({ category: article.category }).sort({ name: 1 }) : [];

        res.render('admin/article-form', {
            article,
            admin: req.admin,
            mode: 'edit',
            categories,
            subcategories
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/categories', { categories, admin: req.admin });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};
//delete category
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndDelete(id);
        res.status(200).json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
//update category
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description } = req.body;
        const updatedSlug = slug || name.toLowerCase().replace(/ /g, '-');
        await Category.findByIdAndUpdate(id, { name, slug: updatedSlug, description });
        res.status(200).json({ message: 'Category updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

//subcategories get
exports.getSubcategories = async (req, res) => {
    try {
        const subcategories = await Subcategory.find().populate('category').sort({ name: 1 });
        const categories = await Category.find().sort({ name: 1 });
        res.render('admin/subcategories', { subcategories, categories, admin: req.admin });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.deletesubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const articleCount = await Article.countDocuments({ subcategory: id });
        if (articleCount > 0) {
            return res.status(400).json({ message: 'Cannot delete subcategory with associated articles' });
        }
        await Subcategory.findByIdAndDelete(id);
        res.status(200).json({ message: 'Subcategory deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
//update subcategory
exports.updatesubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, category, description } = req.body;
        const updatedSlug = slug || name.toLowerCase().replace(/ /g, '-');
        await Subcategory.findByIdAndUpdate(id, { name, slug: updatedSlug, category, description });
        res.status(200).json({ message: 'Subcategory updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.getAccount = async (req, res) => {
    res.render('admin/account', { admin: req.admin });
};
