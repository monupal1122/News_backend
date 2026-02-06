require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const { generateSlug } = require('./utils/slugGenerator');
const Subcategory = require('./models/Subcategory');

const fixSubcategorySlugs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const subcategories = await Subcategory.find();

        for (const subcategory of subcategories) {
            const baseSlug = generateSlug(subcategory.name);
            let slug = baseSlug;
            let counter = 1;

            while (true) {
                const existing = await Subcategory.findOne({
                    slug,
                    category: subcategory.category,
                    _id: { $ne: subcategory._id }
                });
                if (!existing) break;
                slug = `${baseSlug}-${counter}`;
                counter++;
            }

            if (subcategory.slug !== slug) {
                console.log(`Updating ${subcategory.name}: ${subcategory.slug} -> ${slug}`);
                subcategory.slug = slug;
                await subcategory.save();
            }
        }

        console.log('Subcategory slugs fixed');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing slugs:', error);
        process.exit(1);
    }
};

fixSubcategorySlugs();
