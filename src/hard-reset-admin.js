const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const hardReset = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = process.env.ADMIN_EMAIL || 'admin@gmail.com';
        const newPassword = 'NewSecurePassword123'; // CHANGE THIS TO YOUR DESIRED PASSWORD

        const admin = await Admin.findOne({ email });
        if (!admin) {
            console.log('Admin not found. Creating new admin...');
            await Admin.create({
                email,
                password: newPassword
            });
            console.log(`Admin created. Email: ${email}, Password: ${newPassword}`);
        } else {
            admin.password = newPassword;
            // Clear any active reset tokens
            admin.passwordResetToken = undefined;
            admin.passwordResetExpires = undefined;

            await admin.save();
            console.log(`Password reset successful for ${email}. New password is: ${newPassword}`);
        }
        process.exit();
    } catch (error) {
        console.error('Error during hard reset:', error);
        process.exit(1);
    }
};

hardReset();
