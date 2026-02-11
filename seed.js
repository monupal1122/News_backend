const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./src/models/Category');
const Subcategory = require('./src/models/Subcategory');
const Article = require('./src/models/Article');
const Admin = require('./src/models/Admin');
const { generateSlug } = require('./src/utils/slugGenerator');

dotenv.config();

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newswebsite');
        console.log('Connected');

        const admin = await Admin.findOne({ role: 'author' }) || await Admin.create({
            name: 'Breaking News Author',
            email: 'author@news.com',
            password: 'password123',
            role: 'author'
        });

        const categories = [
            { name: 'National', sub: ['Politics', 'Education', 'Crime'] },
            { name: 'Punjab', sub: ['Amritsar', 'Ludhiana', 'Jalandhar'] },
            { name: 'Sports', sub: ['Cricket', 'Hockey', 'Badminton'] }
        ];

        for (const c of categories) {
            let cat = await Category.findOne({ name: c.name });
            if (!cat) cat = await Category.create({ name: c.name, slug: generateSlug(c.name) });

            for (const s of c.sub) {
                let sub = await Subcategory.findOne({ name: s, category: cat._id });
                if (!sub) await Subcategory.create({ name: s, category: cat._id, slug: generateSlug(s) });
            }
        }

        const catNational = await Category.findOne({ name: 'National' });
        const subPolitics = await Subcategory.findOne({ name: 'Politics' });

        const articles = [
            {
                title: 'Major Policy Change Announced in New Delhi',
                summary: 'The government has unveiled a new education policy aiming to transform the learning landscape over the next decade.',
                content: '<p>New Delhi: The Union Cabinet today approved a comprehensive set of reforms...</p>',
                category: catNational._id,
                subcategory: subPolitics._id,
                author: admin._id,
                publishStatus: 'published',
                publishedAt: new Date(),
                tags: ['india', 'politics', 'education'],
                featuredImage: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2'
            },
            {
                title: 'Punjab Farmers Welcome Bumper Wheat Season',
                summary: 'Favorable weather conditions have led to a record-breaking wheat harvest across the state of Punjab.',
                content: '<p>Chandigarh: Agricultural experts are predicting a 15% increase in yield...</p>',
                category: await Category.findOne({ name: 'Punjab' }).then(c => c._id),
                subcategory: await Subcategory.findOne({ name: 'Amritsar' }).then(s => s._id),
                author: admin._id,
                publishStatus: 'published',
                publishedAt: new Date(),
                tags: ['punjab', 'agriculture', 'news'],
                featuredImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef'
            }
        ];

        for (const a of articles) {
            const exists = await Article.findOne({ title: a.title });
            if (!exists) {
                const article = new Article(a);
                await article.save();
                console.log(`Saved: ${a.title}`);
            }
        }

        console.log('Success');
        process.exit();
    } catch (err) {
        console.error('FAIL:', err);
        process.exit(1);
    }
}

seed();
