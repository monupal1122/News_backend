const mongoose = require('mongoose');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugGenerator');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true
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
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

// Pre-save hook to generate slug
categorySchema.pre('save', async function () {
    if (this.isModified('name') || this.isNew) {
        const baseSlug = generateSlug(this.name);
        this.slug = await ensureUniqueSlug(baseSlug, this.constructor, this.isNew ? null : this._id);
    }
});

module.exports = mongoose.model('Category', categorySchema);
