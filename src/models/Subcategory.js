const mongoose = require('mongoose');
const { generateSlug } = require('../utils/slugGenerator');

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

// Pre-save hook to generate slug
subcategorySchema.pre('save', async function() {
    if (this.isModified('name') || this.isNew) {
        const baseSlug = generateSlug(this.name);
        // Ensure unique within category
        let slug = baseSlug;
        let counter = 1;
        while (true) {
            const existing = await this.constructor.findOne({ slug, category: this.category, _id: { $ne: this.isNew ? null : this._id } });
            if (!existing) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        this.slug = slug;
    }
});

module.exports = mongoose.model('Subcategory', subcategorySchema);
