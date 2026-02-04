const mongoose = require('mongoose');
const Category = require('./models/Category');
const Subcategory = require('./models/Subcategory');
require('dotenv').config();

const getIds = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const categories = await Category.find();
    const subcategories = await Subcategory.find();

    console.log('---CATEGORIES---');
    categories.forEach(c => console.log(`${c.name}: ${c._id}`));
    console.log('---SUBCATEGORIES---');
    subcategories.forEach(s => console.log(`${s.name} (${s.category}): ${s._id}`));
    process.exit();
};

getIds();
