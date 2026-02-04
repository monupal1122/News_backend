const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: [true, 'Description is required']
    },
    content: {
        type: String,
        required: [true, 'Content is required']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
        index: true
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory',
        required: [true, 'Subcategory is required'],
        index: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    author: {
        type: String,
        required: [true, 'Author is required']
    },
    publishedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    sourceName: {
        type: String,
        default: 'Daily Chronicle'
    },
    sourceUrl: {
        type: String,
        default: ''
    },
    viewCount: {
        type: Number,
        default: 0
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

// Full-text index for searching
articleSchema.index({ title: 'text', description: 'text', content: 'text' });

const Article = mongoose.model('Article', articleSchema);
module.exports = Article;
