const mongoose = require('mongoose');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugGenerator');

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        index: true
    },
    slug: {
        type: String,
        required: [true, 'Slug is required'],
        unique: true,
        lowercase: true,
        trim: true
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

// Pre-save hook to generate slug
articleSchema.pre('save', async function (next) {
    // Only generate slug if title is modified or it is a new document
    if (this.isModified('title') || this.isNew) {
        const baseSlug = generateSlug(this.title);
        this.slug = await ensureUniqueSlug(baseSlug, this.constructor, this.isNew ? null : this._id);
    }
    // Continue if we don't need to update slug, or after updating it
});

const Article = mongoose.model('Article', articleSchema);
module.exports = Article;
