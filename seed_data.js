const mongoose = require('mongoose');
require('dotenv').config();
const Category = require('./src/models/Category');
const Subcategory = require('./src/models/Subcategory');
const Article = require('./src/models/Article');
const Admin = require('./src/models/Admin');

async function seedData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create or get Admin/Author
        let author = await Admin.findOne({ role: 'admin' });
        if (!author) {
            author = await Admin.create({
                name: 'System Editor',
                email: 'editor@chronicle.com',
                password: 'password123',
                role: 'admin'
            });
        }

        // 2. Define Categories and Subcategories
        const data = [
            {
                name: 'National',
                slug: 'national',
                subs: ['Politics', 'Judiciary', 'Crime', 'Economy']
            },
            {
                name: 'Punjab',
                slug: 'punjab',
                subs: ['Chandigarh', 'Amritsar', 'Ludhiana', 'Agriculture']
            },
            {
                name: 'Entertainment',
                slug: 'entertainment',
                subs: ['Bollywood', 'Hollywood', 'Music', 'Regional Cinema']
            },
            {
                name: 'Sports',
                slug: 'sports',
                subs: ['Cricket', 'Football', 'Hockey', 'Olympics']
            },
            {
                name: 'Technology',
                slug: 'technology',
                subs: ['AI', 'Gadgets', 'Cybersecurity', 'Software']
            }
        ];

        for (const catInfo of data) {
            let category = await Category.findOne({ slug: catInfo.slug });
            if (!category) {
                category = await Category.create({
                    name: catInfo.name,
                    slug: catInfo.slug,
                    status: 'active'
                });
            }

            for (const subName of catInfo.subs) {
                const subSlug = subName.toLowerCase().replace(/ /g, '-');
                let subcategory = await Subcategory.findOne({ slug: subSlug, category: category._id });
                if (!subcategory) {
                    subcategory = await Subcategory.create({
                        name: subName,
                        slug: subSlug,
                        category: category._id,
                        status: 'active'
                    });
                }

                // 3. Create Articles for each subcategory
                for (let i = 1; i <= 3; i++) {
                    const title = `${catInfo.name} ${subName} Update - Story ${i}`;
                    const slug = `${catInfo.slug}-${subSlug}-story-${i}`;

                    const existing = await Article.findOne({ title });
                    if (!existing) {
                        await Article.create({
                            title,
                            summary: `This is a premium news summary for ${title} under ${subName} section.`,
                            content: `<p>This is the full rich content for <strong>${title}</strong>. It covers key events happening in ${catInfo.name} and specifically focusing on ${subName}.</p><p>Multiple updates are expected as the story develops.</p>`,
                            category: category._id,
                            subcategories: [subcategory._id],
                            author: author._id,
                            publishStatus: 'published',
                            isFeatured: i === 1,
                            tags: [catInfo.name.toLowerCase(), subName.toLowerCase(), 'breaking', 'update'],
                            featuredImage: `https://images.unsplash.com/photo-1504711432869-efd597cdd04b?q=80&w=1000&auto=format&fit=crop`
                        });
                        console.log(`Created article: ${title}`);
                    }
                }
            }
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedData();
