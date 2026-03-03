require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
// PRERENDER.IO CONFIGURATION
// Must be configured before 'app' initialization for best results
const Article = require('./src/models/Article');

// Modules & Config
const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const Admin = require('./src/models/Admin');
const passport = require('./src/config/passport');
const apiRoutes = require('./src/routes/apiRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const authorRoutes = require('./src/routes/authorRoutes');

// Global Error Handlers for Production Stability
process.on('uncaughtException', (err) => {
    console.error('!!! UNCAUGHT EXCEPTION !!!');
    console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('!!! UNHANDLED REJECTION !!!');
    console.error(reason);
});

const app = express();
// USE THE PORT HOSTINGER GIVES US, OR FALLBACK TO 5000
const PORT = process.env.PORT || 5000;

console.log('--- SYSTEM STACK ---');
console.log(`Node Version: ${process.version}`);
console.log(`Port Assigned: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Prerender Token: ${process.env.PRERENDER_TOKEN ? 'Configured' : 'Using default'}`);
console.log('--------------------');

// 1. Set View Engine (Adjusted path for root)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Helper for SEO Image URLs
const toAbsoluteUrl = (img) => {
    const siteUrl = "https://korsimnaturals.com";
    const adminUrl = "https://admin.korsimnaturals.com";
    if (!img || img.trim() === "") return `${siteUrl}/logo1.webp`;
    if (img.startsWith("https://") || img.startsWith("http://")) return img;
    const clean = img.replace(/^public[\\/]/, "").replace(/\\/g, "/");
    return `${adminUrl}${clean.startsWith("/") ? clean : "/" + clean}`;
};

// 2. SEO Meta Tag Injection
// Intercept article routes to inject dynamic meta tags before serving HTML
app.get('/:category/:subcategory/:slugId', async (req, res, next) => {
    try {
        const { slugId } = req.params;
        if (slugId.includes('.')) return next(); // Skip files

        // Extract publicId from "slug-id" (e.g., landslide-in-kullu-villagers-terrified-6984311266)
        const match = slugId.match(/(\d+)$/);
        const publicId = match ? match[1] : null;

        const article = await Article.findOne({ publicId });

        if (!article) {
            return res.status(404).send('Article not found');
        }

        const filePath = path.resolve(__dirname, '../frontend/dist/index.html');
        if (!fs.existsSync(filePath)) {
            return res.status(500).send('Production build not found. Run npm run build first.');
        }

        let html = fs.readFileSync(filePath, 'utf8');

        // Replace placeholders with dynamic content
        // Note: Using regex with 'g' flag to replace all occurrences if needed
        const siteUrl = "https://korsimnaturals.com";
        const title = article.title + " | Korsim Naturals";
        const desc = (article.summary || article.seoMetadata?.description || "").substring(0, 160);
        const img = toAbsoluteUrl(article.featuredImage);

        html = html
            .replace(/__OG_TITLE__/g, title)
            .replace(/__OG_DESCRIPTION__/g, desc)
            .replace(/__OG_IMAGE__/g, img)
            .replace(/__OG_URL__/g, `${siteUrl}${req.originalUrl}`);

        res.send(html);
    } catch (error) {
        console.error('SEO Injection Error:', error);
        res.status(500).send('An error occurred');
    }
});

// 3. Middlewares
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Session & Passport
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

// 4. Global Variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    const error = req.flash('error');
    res.locals.error = error.length > 0 ? error[0] : null;
    next();
});

// 5. Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/author', authorRoutes);

// Serve static assets from the frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Fallback: All other routes serve index.html with default placeholders
app.get('*', (req, res) => {
    const filePath = path.resolve(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        const siteUrl = "https://korsimnaturals.com";

        // Fill defaults for non-article pages
        html = html
            .replace(/__OG_TITLE__/g, "Daily News Views | Top News Headlines")
            .replace(/__OG_DESCRIPTION__/g, "Get the latest news and top headlines.")
            .replace(/__OG_IMAGE__/g, `${siteUrl}/logo1.webp`)
            .replace(/__OG_URL__/g, siteUrl);

        return res.send(html);
    }
    res.status(404).send('Not found');
});

// 6. Error Handling
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

// 7. Server Startup
const startServer = async () => {
    // Start listening immediately (Prevents Hostinger 503)
    app.listen(PORT, () => {
        console.log(` SERVER BOOTED SUCCESS ON PORT: ${PORT}`);
    });

    try {
        await connectDB();
        connectRedis();

        // Seed Admin
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
