require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./src/models/Admin');

const verifyAuthor = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const author = await Admin.findOne({ email: 'ritin1122@gmail.com' }).select('+password');

        if (!author) {
            console.log('❌ Author NOT found!');
            process.exit(1);
        }

        console.log('✅ Author found!');
        console.log('Name:', author.name);
        console.log('Email:', author.email);
        console.log('Role:', author.role);
        console.log('Has Password:', !!author.password);

        // Test password
        const isPasswordCorrect = await author.comparePassword('ritin1122', author.password);
        console.log('Password "ritin1122" is correct:', isPasswordCorrect);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

verifyAuthor();
