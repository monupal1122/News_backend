
require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const Admin = require('./src/models/Admin');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    // 1. Start listening immediately (Prevents 503)
    app.listen(PORT, () => {
        console.log(`Server is booting in ${process.env.NODE_ENV} mode on port ${PORT}...`);
    });

    try {
        // 2. Connect to Database (Non-blocking)
        await connectDB();

        // 3. Connect to Redis (non-blocking)
        connectRedis();

        // 4. Seed Admin if not exists
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
    } catch (error) {
        console.error(`Post-startup error: ${error.message}`);
    }
};

startServer();
