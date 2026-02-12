
require('dotenv').config();
const app = require('./src/app');
console.log('App starting...');
const connectDB = require('./src/config/db');
console.log('DB module loaded');
const { connectRedis } = require('./src/config/redis');
console.log('Redis module loaded');
const Admin = require('./src/models/Admin');
console.log('Models loaded');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    console.log(`Starting server on port ${PORT}...`);
    // 1. Start listening immediately (Prevents 503)
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`=========================================`);
        console.log(`SERVER IS LIVE ON PORT ${PORT}`);
        console.log(`=========================================`);
    });

    server.on('error', (err) => {
        console.error('Server failed to start:', err);
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
