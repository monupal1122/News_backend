const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Article = require('./src/models/Article');
const Category = require('./src/models/Category');
const Subcategory = require('./src/models/Subcategory');
const Admin = require('./src/models/Admin');

dotenv.config();

async function test() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newswebsite');

    const cat = await Category.findOne();
    const sub = await Subcategory.findOne();
    const author = await Admin.findOne();

    const art = new Article({
        title: 'Test Title',
        content: 'Test Content',
        category: cat._id,
        subcategory: sub._id,
        author: author._id
    });

    try {
        await art.validate();
        console.log('Validation successful');
        console.log('Slug:', art.slug);
        console.log('PublicId:', art.publicId);
    } catch (err) {
        console.error('Full Validation Error:', JSON.stringify(err, null, 2));
    }
    process.exit();
}

test();
