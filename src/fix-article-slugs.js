require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const { generateSlug, ensureUniqueSlug } = require('./utils/slugGenerator');
const Article = require('./models/Article');

const fixArticleSlugs = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const articles = await Article.find();

        for (const article of articles) {
            const baseSlug = generateSlug(article.title);
            const newSlug = await ensureUniqueSlug(baseSlug, Article, article._id);

            if (article.slug !== newSlug) {
                console.log(`Updating article "${article.title}": ${article.slug} -> ${newSlug}`);
                article.slug = newSlug;
                await article.save();
            }
        }

        console.log('Article slugs fixed');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing article slugs:', error);
        process.exit(1);
    }
};

fixArticleSlugs();
