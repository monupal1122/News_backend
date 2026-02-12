
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const Admin = require('./src/models/Admin');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to Database
        await connectDB();

        // Connect to Redis (non-blocking)
        connectRedis();

        // Seed Admin if not exists
        const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        if (!adminExists) {
            await Admin.create({
                name: 'System Admin',
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'admin'
            });
            console.log('Admin user seeded successfully');
        }

        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    } catch (error) {
        console.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
};

startServer();
