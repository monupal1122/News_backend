require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const fs = require('fs');

// Modules & Config
const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const Admin = require('./src/models/Admin');
const passport = require('./src/config/passport');
const apiRoutes = require('./src/routes/apiRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const authorRoutes = require('./src/routes/authorRoutes');
const { botSeoMiddleware } = require('./src/middlewares/botSeoMiddleware');

// Global Error Handlers
process.on('uncaughtException', (err) => {
    console.error('!!! UNCAUGHT EXCEPTION !!!');
    console.error(err);
});
process.on('unhandledRejection', (reason) => {
    console.error('!!! UNHANDLED REJECTION !!!');
    console.error(reason);
});

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_NAME = process.env.SITE_NAME || 'Daily News Views';

console.log('--- SYSTEM STACK ---');
console.log(`Node Version: ${process.version}`);
console.log(`Port Assigned: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log('--------------------');

// ============================================
// HELPER: FIND FRONTEND INDEX.HTML
// ============================================
const getIndexPath = () => {
    const possiblePaths = [
        path.join(__dirname, '../frontend/dist/index.html'),
        path.join(__dirname, 'frontend/dist/index.html'),
        path.join(__dirname, 'dist/index.html'),
        path.join(process.cwd(), 'frontend/dist/index.html'),
        path.join(process.cwd(), 'dist/index.html')
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
};

// ============================================
// 1. SEO Bot Middleware (MUST be before static files)
// ============================================
app.use(botSeoMiddleware);

// ============================================
// 2. Core Middlewares
// ============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Serve frontend static files (production)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
}

// ============================================
// 3. Session & Passport
// ============================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    const error = req.flash('error');
    res.locals.error = error.length > 0 ? error[0] : null;
    next();
});

// ============================================
// 4. Routes
// ============================================
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', version: process.version }));
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/author', authorRoutes);
app.get('/', (req, res) => res.redirect('/author/login'));

// SPA Fallback - serves React app for all other routes
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: "API route not found" });
    }

    const indexPath = getIndexPath();
    if (indexPath) return res.sendFile(indexPath);

    res.status(404).send("Not Found");
});

// ============================================
// 5. Error Handling
// ============================================
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.message);
    if (process.env.NODE_ENV === 'development') console.error(err.stack);
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'development' ? err.message : 'Something broke!';
    if (req.originalUrl.startsWith('/api')) {
        return res.status(statusCode).json({ status: 'error', message });
    }
    res.status(statusCode).send(message);
});

// ============================================
// 6. Server Startup
// ============================================
const startServer = async () => {
    app.listen(PORT, () => {
        console.log(`>>> SERVER BOOTED SUCCESS ON PORT: ${PORT} <<<`);
    });

    try {
        await connectDB();
        connectRedis();

        // Seed Admin if not exists
        const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
        if (!adminExists && process.env.ADMIN_EMAIL) {
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
