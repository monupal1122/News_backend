const mongoose = require('mongoose');
const Category = require('./models/Category');
const Subcategory = require('./models/Subcategory');
require('dotenv').config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Clear existing
        await Category.deleteMany({});
        await Subcategory.deleteMany({});

        const categories = [
            { name: 'Business', slug: 'business', description: 'Business news' },
            { name: 'Technology', slug: 'technology', description: 'Tech news' },
            { name: 'Sports', slug: 'sports', description: 'Sports news' },
            { name: 'Entertainment', slug: 'entertainment', description: 'Entertainment news' }
        ];

        const createdCategories = await Category.insertMany(categories);
        console.log('Categories seeded');

        const subcategories = [
            { name: 'Finance', slug: 'finance', category: createdCategories[0]._id },
            { name: 'Markets', slug: 'markets', category: createdCategories[0]._id },
            { name: 'AI', slug: 'ai', category: createdCategories[1]._id },
            { name: 'Gadgets', slug: 'gadgets', category: createdCategories[1]._id },
            { name: 'Cricket', slug: 'cricket', category: createdCategories[2]._id },
            { name: 'Football', slug: 'football', category: createdCategories[2]._id },
            { name: 'Movies', slug: 'movies', category: createdCategories[3]._id },
            { name: 'Music', slug: 'music', category: createdCategories[3]._id }
        ];

        await Subcategory.insertMany(subcategories);
        console.log('Subcategories seeded');

        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
