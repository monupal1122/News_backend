const Article = require('../models/Article');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Admin = require('../models/Admin');
const { generateSlug } = require('../utils/slugGenerator');

exports.getDashboard = async (req, res) => {
    try {
        const query = req.admin.role === 'admin' ? {} : { author: req.admin._id };

        const articleCount = await Article.countDocuments(query);
        const featuredCount = await Article.countDocuments({ ...query, isFeatured: true });

        const totalViews = await Article.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: "$viewCount" } } }
        ]);

        // Analytics: Articles per day (Last 7 Days)
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const articlesPerDay = await Article.aggregate([
            { $match: { ...query, createdAt: { $gte: last7Days } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing days
        const chartData = { labels: [], data: [] };
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = articlesPerDay.find(item => item._id === dateStr);

            chartData.labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            chartData.data.push(found ? found.count : 0);
        }

        // Top Performing Articles
        const topArticles = await Article.find(query)
            .select('title viewCount')
            .sort({ viewCount: -1 })
            .limit(5);

        const latestArticles = await Article.find(query).populate('category').sort({ createdAt: -1 }).limit(5);

        const view = req.admin.role === 'admin' ? 'admin/dashboard' : 'author/dashboard';
        res.render(view, {
            admin: req.admin,
            articleCount,
            featuredCount,
            totalViews: totalViews.length > 0 ? totalViews[0].total : 0,
            latestArticles,
            chartData,
            topArticles
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getArticles = async (req, res) => {
    try {
        const query = req.admin.role === 'admin' ? {} : { author: req.admin._id };
        const articles = await Article.find(query).populate('category author').sort({ createdAt: -1 });
        res.render('admin/articles', { articles, admin: req.admin });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.getCreateArticle = async (req, res) => {
    const categories = await Category.find().sort({ name: 1 });
    const authors = req.admin.role === 'admin' ? await Admin.find().sort({ name: 1 }) : [];

    res.render('admin/article-form', {
        mode: 'create',
        categories,
        authors,
        article: null, // Explicitly set to null for new articles
        admin: req.admin
    });
};

exports.getEditArticle = async (req, res) => {
    try {
        const article = await Article.findById(req.params.id).populate('author category subcategories');
        if (!article) {
            const redirectUrl = req.admin.role === 'admin' ? '/admin/articles' : '/author/articles';
            return res.redirect(redirectUrl);
        }

        // Ownership validation
        if (req.admin.role !== 'admin' && article.author.toString() !== req.admin._id.toString()) {
            return res.status(403).send('Not authorized to edit this article');
        }

        const categories = await Category.find().sort({ name: 1 });
        const subcategories = article.category ? await Subcategory.find({ category: article.category }).sort({ name: 1 }) : [];
        const authors = req.admin.role === 'admin' ? await Admin.find().sort({ name: 1 }) : [];

        res.render('admin/article-form', {
            article,
            admin: req.admin,
            mode: 'edit',
            categories,
            subcategories,
            authors
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
        const { name, slug, description, status } = req.body;
        const updatedSlug = slug || name.toLowerCase().replace(/ /g, '-');
        await Category.findByIdAndUpdate(id, { name, slug: updatedSlug, description, status });
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
        const { name, slug, category, description, status, displayOrder } = req.body;
        const updatedSlug = slug || name.toLowerCase().replace(/ /g, '-');
        await Subcategory.findByIdAndUpdate(id, {
            name,
            slug: updatedSlug,
            category,
            description,
            status,
            displayOrder
        });
        res.status(200).json({ message: 'Subcategory updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.getAccount = async (req, res) => {
    res.render('admin/account', { admin: req.admin });
};

exports.getAuthors = async (req, res) => {
    try {
        const authors = await Admin.find().sort({ name: 1 });
        res.render('admin/authors', { authors, admin: req.admin, activePage: 'authors' });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.createAuthor = async (req, res) => {
    try {
        const { name, email, password, role, bio } = req.body;

        // Check if user already exists
        const existing = await Admin.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        await Admin.create({
            name,
            email,
            password,
            role: role || 'author',
            bio
        });

        res.status(201).json({ message: 'Author account created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateAuthor = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, name, bio } = req.body;

        const author = await Admin.findById(id);
        if (!author) return res.status(404).json({ message: 'Author not found' });

        // Update fields if provided
        if (role) author.role = role;
        if (name) author.name = name;
        if (bio !== undefined) author.bio = bio;

        await author.save();
        res.status(200).json({ message: 'Author updated successfully', author });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteAuthor = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting self
        if (id === req.admin._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Check for articles
        const articleCount = await Article.countDocuments({ author: id });
        if (articleCount > 0) {
            return res.status(400).json({ message: 'Cannot delete author with associated articles. Reassign or delete articles first.' });
        }

        await Admin.findByIdAndDelete(id);
        res.status(200).json({ message: 'Author deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateProfile = async (req, res) => {
    try {
        const { name, bio, twitter, linkedin, facebook, instagram } = req.body;

        const updateData = {
            name,
            bio,
            socialLinks: { twitter, linkedin, facebook, instagram }
        };

        if (req.file) {
            updateData.profileImage = req.file.path; // Cloudinary URL
        }

        await Admin.findByIdAndUpdate(req.admin._id, updateData);

        req.flash('success_msg', 'Profile updated successfully');
        const redirectUrl = req.admin.role === 'admin' ? '/admin/account' : '/author/account';
        res.redirect(redirectUrl);
    } catch (error) {
        console.error(error);
        req.flash('error_msg', 'Failed to update profile');
        const redirectUrl = req.admin.role === 'admin' ? '/admin/account' : '/author/account';
        res.redirect(redirectUrl);
    }
};

exports.getArticlesByAuthor = async (req, res) => {
    try {
        const { id } = req.params;
        const author = await Admin.findById(id);
        if (!author) return res.redirect('/admin/authors');

        const articles = await Article.find({ author: id }).populate('category author').sort({ createdAt: -1 });

        res.render('admin/articles', {
            articles,
            admin: req.admin,
            title: `Articles by ${author.name}`
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

exports.suggestTags = async (req, res) => {
    try {
        const { title, summary } = req.body;
        if (!title) return res.status(400).json({ tags: [] });

        const combinedText = `${title} ${summary || ''}`;

        // 1. English Proper Nouns (Capitalized words in middle of sentence or anywhere)
        // This picks up names like "Rajpal Yadav", "Delhi High Court"
        const properNouns = combinedText.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

        // 2. Hindi word extraction (simplified - picking words longer than 2 chars)
        const hindiWords = combinedText.match(/[\u0900-\u097F]{3,}/g) || [];

        // 3. Technical/Common News Terms
        const commonTerms = ["Politics", "Breaking News", "Bollywood", "Entertainment", "India", "World", "Sports", "Tech"];
        const foundTerms = commonTerms.filter(term =>
            combinedText.toLowerCase().includes(term.toLowerCase())
        );

        // Combine and cleanup
        let allTags = [...new Set([...properNouns, ...hindiWords, ...foundTerms])];

        // Filter out common stop words if needed, but the current regex is selective
        const stopWords = ["The", "And", "For", "This", "That", "When", "With"];
        allTags = allTags.filter(tag => !stopWords.includes(tag) && tag.length > 2);

        // Limit to 8 most relevant-looking tags
        const suggestedTags = allTags.slice(0, 8);

        res.json({ tags: suggestedTags });
    } catch (error) {
        console.error('Tag Suggestion Error:', error);
        res.status(500).json({ tags: [] });
    }
};

exports.generateSlugAPI = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) return res.status(400).json({ slug: '' });

        const slug = generateSlug(title);
        res.json({ slug });
    } catch (error) {
        console.error('Slug Generation Error:', error);
        res.status(500).json({ slug: '' });
    }
};
