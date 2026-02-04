const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCategoriesWithSubcategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 }).lean();
        const categoriesWithSubs = await Promise.all(categories.map(async (cat) => {
            const subcategories = await Subcategory.find({ category: cat._id }).sort({ name: 1 });
            return { ...cat, subcategories };
        }));
        res.status(200).json(categoriesWithSubs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSubcategoriesByCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const subcategories = await Subcategory.find({ category: categoryId }).sort({ name: 1 });
        res.status(200).json(subcategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Admin handlers (simple for now)
exports.createCategory = async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndDelete(id);
        res.status(200).json({ message: 'Category deleted' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}
exports.createSubcategory = async (req, res) => {
    try {
        const subcategory = await Subcategory.create(req.body);
        res.status(201).json(subcategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedCategory = await Category.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedSubcategory = await Subcategory.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json(updatedSubcategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.deleteSubcategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Subcategory.findByIdAndDelete(id);
        res.status(200).json({ message: 'Subcategory deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
