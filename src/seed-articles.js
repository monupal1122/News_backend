const mongoose = require('mongoose');
const Article = require('./models/Article');
const Category = require('./models/Category');
const Subcategory = require('./models/Subcategory');
require('dotenv').config();

const seedArticles = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing articles if any (optional, but keep for fresh start)
        await Article.deleteMany({});

        const techCat = await Category.findOne({ slug: 'technology' });
        const aiSub = await Subcategory.findOne({ slug: 'ai' });

        const bizCat = await Category.findOne({ slug: 'business' });
        const marketSub = await Subcategory.findOne({ slug: 'markets' });

        const sportsCat = await Category.findOne({ slug: 'sports' });
        const cricketSub = await Subcategory.findOne({ slug: 'cricket' });

        const articles = [
            {
                title: "The Future of AI: How LLMs are Changing the World",
                description: "A deep dive into the latest developments in Large Language Models and their impact on various industries.",
                content: "<p>Artificial Intelligence is evolving at an unprecedented pace. Large Language Models like GPT-4 and Gemini are redefining how we interact with technology, automate tasks, and generate creative content. This article explores the ethical implications, technological breakthroughs, and future trends of the AI revolution.</p><p>From coding assistants to automated customer service, the applications are vast. However, challenges like bias, misinformation, and job displacement remain at the forefront of the conversation.</p>",
                category: techCat._id,
                subcategory: aiSub._id,
                author: "Antigravity AI",
                sourceName: "Tech Today",
                imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop",
                isFeatured: true,
                viewCount: 1250,
                publishedAt: new Date(Date.now() - 3600000) // 1 hour ago
            },
            {
                title: "Global Markets Rally as Inflation Cools",
                description: "Stocks hit record highs as new economic data suggests a soft landing for the global economy.",
                content: "<p>Investors are breathing a sigh of relief as inflation figures come in lower than expected. Central banks may begin cutting interest rates sooner than anticipated, leading to a surge in tech stocks and emerging markets. Experts suggest that the path forward remains optimistic despite geopolitical tensions.</p><p>The S&P 500 reached a new all-time high today, driven by strong earnings from the energy and healthcare sectors.</p>",
                category: bizCat._id,
                subcategory: marketSub._id,
                author: "Antigravity AI",
                sourceName: "Financial Times",
                imageUrl: "https://images.unsplash.com/photo-1611974717483-5828518e2746?q=80&w=1000&auto=format&fit=crop",
                isFeatured: false,
                viewCount: 850,
                publishedAt: new Date(Date.now() - 7200000) // 2 hours ago
            },
            {
                title: "India Clinches Thrilling Victory in Test Series",
                description: "A last-minute wicket sealed the series win for India in a historic performance.",
                content: "<p>The final day of the test series saw a display of masterclass bowling and resilient batting. Indian fans are celebrating as the team clinches the trophy after a decade-long wait for a victory on foreign soil.</p>",
                category: sportsCat._id,
                subcategory: cricketSub._id,
                author: "Antigravity AI",
                sourceName: "Sports Central",
                imageUrl: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1000&auto=format&fit=crop",
                isFeatured: true,
                viewCount: 2100,
                publishedAt: new Date(Date.now() - 86400000) // 1 day ago
            }
        ];

        await Article.insertMany(articles);
        console.log('Dummy articles seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding articles:', error);
        process.exit(1);
    }
};

seedArticles();
