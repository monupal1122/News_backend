require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');

const createAuthor = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if author already exists
        const existingAuthor = await Admin.findOne({ email: 'ritin1122@gmail.com' });
        if (existingAuthor) {
            console.log('⚠️  Author already exists!');
            process.exit(0);
        }

        // Create new author
        const author = await Admin.create({
            name: 'Ritin',
            email: 'ritin1122@gmail.com',
            password: 'ritin1122',
            role: 'author',
            bio: 'Content Author'
        });

        console.log('✅ Author created successfully!');
        console.log('Email:', author.email);
        console.log('Role:', author.role);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createAuthor();
