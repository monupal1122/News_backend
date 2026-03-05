require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const fs = require('fs');

// PRERENDER.IO CONFIGURATION
// Must be configured before 'app' initialization for best results
const prerender = require('prerender-node');
prerender.set('prerenderToken', process.env.PRERENDER_TOKEN || 'MKc29XdWcppSm65HX6n4');
prerender.set('host', 'korsimnaturals.com');
// prerender.set('debug', true); // Uncomment to debug if bots aren't being intercepted

// Modules & Config
const connectDB = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const Admin = require('./src/models/Admin');
const Article = require('./src/models/Article');
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
const PORT = process.env.PORT || 3000;

// Site configuration
const SITE_URL = process.env.SITE_URL || 'https://korsimnaturals.com';
const SITE_NAME = 'Daily News Views';

console.log('--- SYSTEM STACK ---');
console.log(`Node Version: ${process.version}`);
console.log(`Port Assigned: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Prerender Token: ${process.env.PRERENDER_TOKEN ? 'Configured' : 'Using default'}`);
console.log('--------------------');

// ============================================
// COMPREHENSIVE BOT DETECTION FOR SEO
// ============================================
const isSocialBot = (userAgent) => {
    if (!userAgent) return false;
    
    const ua = userAgent.toLowerCase();
    
    // List of social media and search bots to detect
    const botPatterns = [
        // Facebook / Meta
        'facebookexternalhit',
        'facebookcatalog',
        
        // Twitter / X
        'twitterbot',
        'xbot',
        
        // LinkedIn
        'linkedinbot',
        'linkedin',
        
        // WhatsApp
        'whatsapp',
        
        // Telegram
        'telegrambot',
        
        // Pinterest
        'pinterest',
        'pinterestbot',
        
        // Discord / Slack
        'discord',
        'slackbot',
        
        // Apple
        'applebot',
        'apple news',
        
        // Google
        'googlebot',
        'google-inspectiontool',
        'googleother',
        'google-stackdriver',
        'feedfetcher-google',
        
        // Bing
        'bingbot',
        'bingpreview',
        
        // Yahoo
        'yahoo',
        'yandexbot',
        
        // DuckDuckGo
        'duckduckbot',
        
        // Reddit
        'redditbot',
        
        // TikTok
        'tiktok',
        
        // General SEO bots
        'bot',
        'crawler',
        'spider',
        'scraper'
    ];
    
    // Priority exact matches (more reliable)
    const exactBots = [
        'facebookexternalhit',
        'twitterbot',
        'linkedinbot',
        'whatsapp',
        'telegrambot',
        'googlebot',
        'bingbot',
        'pinterest',
        'discordbot',
        'slackbot'
    ];
    
    // Check exact matches first
    for (const bot of exactBots) {
        if (ua.includes(bot)) return true;
    }
    
    // Then check partial matches
    return botPatterns.some(pattern => ua.includes(pattern));
};

// ============================================
// SEO META TAG INJECTION FOR SOCIAL BOTS
// ============================================
// This route MUST be placed BEFORE static file middleware

// Helper function to get author name
const getAuthorName = (author) => {
    if (!author) return SITE_NAME;
    if (typeof author === 'string') return author;
    return author.name || author.username || SITE_NAME;
};

// Helper function to format date for Open Graph
const formatDate = (date) => {
    if (!date) return new Date().toISOString();
    return new Date(date).toISOString();
};

// Helper to truncate description
const truncateDescription = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

// Article SEO route - catches bot requests for article URLs
app.get('/:category/:subcategory/:slugId', async (req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    
    // Only process requests from social bots
    if (!isSocialBot(userAgent)) {
        return next();
    }
    
    console.log(`[SEO BOT DETECTED] ${userAgent.substring(0, 50)}... - Requesting: ${req.url}`);
    
    const { category, subcategory, slugId } = req.params;
    
    // Validate URL parameters
    if (!category || !subcategory || !slugId) {
        return next();
    }
    
    // Parse slug and ID from slugId (format: "article-title-1234567890")
    const lastDashIndex = slugId.lastIndexOf('-');
    if (lastDashIndex === -1) {
        return next();
    }
    
    const slug = slugId.substring(0, lastDashIndex);
    const articleId = slugId.substring(lastDashIndex + 1);
    
    // Validate articleId is numeric
    if (!/^\d+$/.test(articleId)) {
        return next();
    }
    
    try {
        // Fetch article from MongoDB with populated fields
        const article = await Article.findOne({ publicId: articleId })
            .populate('category subcategories author');
        
        if (!article) {
            console.log(`[SEO] Article not found: ${articleId}`);
            return res.status(404).send('Article not found');
        }
        
        // Get the primary subcategory
        const primarySubcategory = article.subcategories && article.subcategories.length > 0 
            ? article.subcategories[0] 
            : null;
        
        // Build canonical URL
        const canonicalUrl = `${SITE_URL}/${article.category.slug}/${primarySubcategory ? primarySubcategory.slug : 'general'}/${article.slug}-${article.publicId}`;
        
        // Extract article data for meta tags
        const title = article.seoMetadata?.title || article.title;
        const description = article.seoMetadata?.description || article.summary || '';
        const image = article.featuredImage || '';
        const authorName = getAuthorName(article.author);
        const publishedAt = article.publishedAt || article.createdAt;
        const updatedAt = article.updatedAt;
        const tags = article.tags || [];
        
        // Image dimensions (use defaults if not set)
        const imageWidth = article.featuredImageWidth || 1200;
        const imageHeight = article.featuredImageHeight || 630;
        
        // Truncate description for OG tags
        const ogDescription = truncateDescription(description, 200);
        
        // Generate comprehensive meta tags
        const seoMetaTags = `
    <title>${title} | ${SITE_NAME}</title>
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="description" content="${truncateDescription(description, 160)}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${ogDescription}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:url" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:width" content="${imageWidth}" />
    <meta property="og:image:height" content="${imageHeight}" />
    <meta property="og:image:alt" content="${title}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    
    <!-- Article specific Open Graph -->
    <meta property="article:published_time" content="${formatDate(publishedAt)}" />
    <meta property="article:modified_time" content="${formatDate(updatedAt)}" />
    <meta property="article:author" content="${authorName}" />
    <meta property="article:section" content="${article.category?.name || category}" />
    ${tags.map(tag => `    <meta property="article:tag" content="${tag}" />`).join('\n')}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@dailyviews" />
    <meta name="twitter:creator" content="@dailyviews" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${ogDescription}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="${title}" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    
    <!-- LinkedIn specific -->
    <meta property="linkedin:owner" content="${SITE_NAME}" />
    
    <!-- WhatsApp / Telegram (uses Open Graph) -->
    <meta property="og:see_also" content="${SITE_URL}" />`;
        
        // Find the built dist/index.html
        // Try multiple possible locations
        const possiblePaths = [
            path.join(__dirname, 'frontend/dist/index.html'),
            path.join(__dirname, '../frontend/dist/index.html'),
            path.join(__dirname, 'dist/index.html'),
            path.join(process.cwd(), 'frontend/dist/index.html'),
            path.join(process.cwd(), 'dist/index.html')
        ];
        
        let indexPath = null;
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                indexPath = p;
                break;
            }
        }
        
        if (!indexPath) {
            console.error('[SEO] Could not find index.html in any location');
            return res.status(500).send('Server Error');
        }
        
        // Read and inject meta tags
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Inject SEO meta tags after <head>
        html = html.replace(/<head>/i, `<head>${seoMetaTags}`);
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Robots-Tag', 'index, follow');
        
        console.log(`[SEO] Serving dynamic OG tags for article: ${article.title.substring(0, 30)}...`);
        
        res.send(html);
        
    } catch (error) {
        console.error('[SEO ERROR]', error.message);
        // On error, fall through to regular route handling
        next();
    }
});

// 1. Set View Engine (Adjusted path for root)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 2. PRERENDER MIDDLEWARE - Must be BEFORE all other middleware
// Middleware to log User-Agents and force Prerender for known bots
app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || '';
    if (userAgent.includes('LinkedInBot') || userAgent.includes('facebookexternalhit')) {
        console.log(`[BOT DETECTED]: ${userAgent} - Requesting: ${req.url}`);
        req.shouldShowPrerender = true;
    }
    next();
});
app.use(prerender);

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

// Also serve static files from frontend/dist
const frontendDistPath = path.join(__dirname, 'frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
}

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
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running', version: process.version });
});

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);
app.use('/author', authorRoutes);

app.get('/', (req, res) => {
    res.redirect('/author/login');
});

// SPA fallback - serves React app for all other routes
// This should be the LAST route
app.get('*', (req, res) => {
    // Try to find index.html in various locations
    const possiblePaths = [
        path.join(__dirname, 'frontend/dist/index.html'),
        path.join(__dirname, '../frontend/dist/index.html'),
        path.join(__dirname, 'dist/index.html'),
        path.join(process.cwd(), 'frontend/dist/index.html'),
        path.join(process.cwd(), 'dist/index.html')
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return res.sendFile(p);
        }
    }
    
    // If no index.html found, show a simple message
    res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${SITE_NAME}</title>
        </head>
        <body>
            <div id="root">
                <h1>${SITE_NAME}</h1>
                <p>Loading...</p>
            </div>
        </body>
        </html>
    `);
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
        console.log(`>>> SERVER BOOTED SUCCESS ON PORT: ${PORT} <<<`);
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
