const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Subcategory name is required'],
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        lowercase: true,
        trim: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    description: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Compound index to ensure unique subcategory names within a category
subcategorySchema.index({ name: 1, category: 1 }, { unique: true });
subcategorySchema.index({ slug: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Subcategory', subcategorySchema);
