const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Admin = require('../models/Admin');

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/admin/auth/google/callback"
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Check if admin already exists
                let admin = await Admin.findOne({ googleId: profile.id });

                if (admin) {
                    return done(null, admin);
                }

                // If not, check if an admin with the same email exists
                const email = profile.emails[0].value.toLowerCase();
                admin = await Admin.findOne({ email: email.toLowerCase() });

                if (admin) {
                    admin.googleId = profile.id;
                    await admin.save();
                    return done(null, admin);
                }

                // If no admin exists at all, we might not want to create one automatically
                // for security reasons, or we can allow it if it's the first one.
                // For now, let's just return an error or null if not found.
                return done(null, false, { message: 'No admin account found with this email.' });
            } catch (err) {
                return done(err, null);
            }
        }
    ));
} else {
    console.warn('Google OAuth credentials missing. Google login will be disabled.');
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const admin = await Admin.findById(id);
        done(null, admin);
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
