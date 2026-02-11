const mongoose = require('mongoose');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugGenerator');
const { generateNumericId } = require('../utils/idGenerator');

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
    publicId: {
        type: Number,
        unique: true,
        index: true
    },
    summary: {
        type: String,
        trim: true
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
    subcategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory',
        index: true
    }],
    featuredImage: {
        type: String,
        default: ''
    },
    mediaGallery: [{
        type: String
    }],
    tags: [{
        type: String,
        index: true
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: [true, 'Author is required'],
        index: true
    },
    publishStatus: {
        type: String,
        enum: ['draft', 'pending', 'published'],
        default: 'draft',
        index: true
    },
    publishedAt: {
        type: Date,
        index: true
    },
    seoMetadata: {
        title: String,
        description: String,
        keywords: [String]
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

// Pre-validate hook to generate slug and publicId
articleSchema.pre('validate', async function () {
    try {
        // Handle Slug
        if (this.isModified('title') || !this.slug) {
            const baseSlug = generateSlug(this.title || 'untitled');
            this.slug = await ensureUniqueSlug(baseSlug, this.constructor, this.isNew ? null : this._id);
        }

        // Handle PublicId
        if (this.isNew && !this.publicId) {
            this.publicId = await generateUniquePublicId(this.constructor);
        }

        // Handle Tags normalization
        if (this.tags && Array.isArray(this.tags)) {
            this.tags = this.tags.map(tag => tag.trim().toLowerCase());
        }
    } catch (error) {
        throw error;
    }
});

// Helper function to generate unique publicId
async function generateUniquePublicId(Model) {
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
        const publicId = generateNumericId();
        const existing = await Model.findOne({ publicId });

        if (!existing) {
            return publicId;
        }
    }

    throw new Error('Unable to generate unique public ID after multiple attempts');
}

const Article = mongoose.model('Article', articleSchema);
module.exports = Article;
