const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`!!! MongoDB Connection Error: ${error.message} !!!`);
        console.error('The app will continue running, but DB features will fail.');
    }
};

module.exports = connectDB;
