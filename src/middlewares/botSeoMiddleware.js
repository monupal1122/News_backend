const fs = require('fs');
const path = require('path');
const Article = require('../models/Article');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    SITE_URL: process.env.SITE_URL || 'http://localhost:8081',
    SITE_NAME: process.env.SITE_NAME || 'Daily News Views',
    API_URL: process.env.API_URL || 'https://admin.localhost:3000/api/api',
    TWITTER_HANDLE: process.env.TWITTER_HANDLE || '@dailyviews',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    CACHE_MAX_SIZE: 100
};

// ============================================
// IN-MEMORY CACHE
// ============================================
const articleCache = new Map();

const getCachedArticle = (key) => {
    const cached = articleCache.get(key);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
        return cached.data;
    }
    articleCache.delete(key);
    return null;
};

const setCachedArticle = (key, data) => {
    articleCache.set(key, { data, timestamp: Date.now() });

    // Clean old entries if cache is too large
    if (articleCache.size > CONFIG.CACHE_MAX_SIZE) {
        const firstKey = articleCache.keys().next().value;
        articleCache.delete(firstKey);
    }
};

// ============================================
// BOT DETECTION
// ============================================
const isBot = (userAgent) => {
    if (!userAgent) return false;

    const ua = userAgent.toLowerCase();

    // Priority exact matches (most reliable)
    const exactBots = [
        'facebookexternalhit',
        'facebookcatalog',
        'twitterbot',
        'xbot',
        'linkedinbot',
        'whatsapp',
        'telegrambot',
        'googlebot',
        'google-inspectiontool',
        'bingbot',
        'bingpreview',
        'pinterest',
        'discordbot',
        'slackbot',
        'redditbot',
        'applebot',
        'duckduckbot'
    ];

    // Check exact matches first
    for (const bot of exactBots) {
        if (ua.includes(bot)) return true;
    }

    // Additional patterns for broader detection
    const botPatterns = [
        'facebook',
        'twitter',
        'linkedin',
        'whatsapp',
        'telegram',
        'pinterest',
        'discord',
        'slack',
        'apple news',
        'google',
        'bing',
        'yahoo',
        'yandex',
        'duckduckgo',
        'reddit',
        'tiktok',
        'crawler',
        'spider',
        'scraper',
        'bot'
    ];

    return botPatterns.some(pattern => ua.includes(pattern));
};

// ============================================
// VALIDATION HELPERS
// ============================================
const isValidSlug = (slug) => {
    return /^[a-zA-Z0-9-_]+$/.test(slug);
};

const isValidCategory = (category) => {
    return /^[a-zA-Z0-9-_]+$/.test(category);
};

// ============================================
// DATA FETCHING (Direct DB - no HTTP call needed)
// ============================================
const fetchArticleFromDB = async (slugId) => {
    try {
        const lastDashIndex = slugId.lastIndexOf('-');
        if (lastDashIndex === -1) return null;

        const articleId = slugId.substring(lastDashIndex + 1);
        if (!/^\d+$/.test(articleId)) return null;

        const article = await Article.findOne({ publicId: articleId })
            .populate('category subcategories author')
            .lean();
        return article;
    } catch (err) {
        console.error('[BotSeoMiddleware] DB fetch error:', err.message);
        return null;
    }
};

// ============================================
// URL HELPERS
// ============================================
const makeAbsoluteUrl = (url) => {
    if (!url) return '';

    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Handle relative URLs starting with /
    if (url.startsWith('/')) {
        return `${CONFIG.SITE_URL}${url}`;
    }

    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
        return `https:${url}`;
    }

    // Default: prepend SITE_URL
    return `${CONFIG.SITE_URL}/${url}`;
};

const getAuthorName = (author) => {
    if (!author) return CONFIG.SITE_NAME;
    if (typeof author === 'string') return author;
    return author.name || author.username || CONFIG.SITE_NAME;
};

const formatDate = (date) => {
    if (!date) return new Date().toISOString();
    return new Date(date).toISOString();
};

const truncateDescription = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
};

// ============================================
// META TAG GENERATOR
// ============================================
const generateMetaTags = (article, canonicalUrl, req) => {
    // Extract article data
    const title = article.seoMetadata?.title || article.title;
    const description = article.seoMetadata?.description || article.summary || article.description || '';
    const image = makeAbsoluteUrl(article.featuredImage || article.image || '');
    const authorName = getAuthorName(article.author);
    const publishedAt = article.publishedAt || article.createdAt;
    const updatedAt = article.updatedAt;
    const tags = article.tags || [];

    // Get category name
    const categoryName = article.category?.name || article.category || '';

    // Image dimensions
    const imageWidth = article.featuredImageWidth || article.imageWidth || 1200;
    const imageHeight = article.featuredImageHeight || article.imageHeight || 630;

    // Truncate descriptions
    const ogDescription = truncateDescription(description, 200);
    const metaDescription = truncateDescription(description, 160);

    // Generate comprehensive meta tags
    const metaTags = `
    <title>${title} | ${CONFIG.SITE_NAME}</title>
    <link rel="canonical" href="${canonicalUrl}" />
    <meta name="description" content="${metaDescription}" />
    
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
    <meta property="og:site_name" content="${CONFIG.SITE_NAME}" />
    
    <!-- Article specific Open Graph -->
    <meta property="article:published_time" content="${formatDate(publishedAt)}" />
    <meta property="article:modified_time" content="${formatDate(updatedAt)}" />
    <meta property="article:author" content="${authorName}" />
    <meta property="article:section" content="${categoryName}" />
    ${tags.map(tag => `    <meta property="article:tag" content="${tag}" />`).join('\n')}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="${CONFIG.TWITTER_HANDLE}" />
    <meta name="twitter:creator" content="${CONFIG.TWITTER_HANDLE}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${ogDescription}" />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="${title}" />
    <meta name="twitter:url" content="${canonicalUrl}" />
    
    <!-- LinkedIn specific -->
    <meta property="linkedin:owner" content="${CONFIG.SITE_NAME}" />
    
    <!-- WhatsApp / Telegram -->
    <meta property="og:see_also" content="${CONFIG.SITE_URL}" />`;

    return metaTags;
};

// ============================================
// FIND INDEX.HTML
// ============================================
const findIndexHtml = () => {
    const possiblePaths = [
        path.join(__dirname, '../../frontend/dist/index.html'),
        path.join(__dirname, '../../../frontend/dist/index.html'),
        path.join(__dirname, '../../dist/index.html'),
        path.join(process.cwd(), 'frontend/dist/index.html'),
        path.join(process.cwd(), 'dist/index.html'),
        path.join(process.cwd(), '../frontend/dist/index.html'),
        path.join(__dirname, '../public/index.html')
    ];

    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    return null;
};

// ============================================
// MAIN MIDDLEWARE
// ============================================
const botSeoMiddleware = async (req, res, next) => {
    // Get user agent
    const userAgent = req.headers['user-agent'] || '';

    // Only process requests from bots
    if (!isBot(userAgent)) {
        return next();
    }

    // Check if this is an article URL pattern: /:category/:subcategory/:slugId
    const { category, subcategory, slugId } = req.params;

    // If not an article URL pattern, let it pass
    if (!category || !subcategory || !slugId) {
        return next();
    }

    // Validate URL parameters
    if (!isValidCategory(category) || !isValidCategory(subcategory) || !isValidSlug(slugId)) {
        return next();
    }

    console.log(`[BotSeoMiddleware] Bot detected: ${userAgent.substring(0, 50)}... - ${req.path}`);

    const cacheKey = `${category}/${subcategory}/${slugId}`;

    try {
        // Try to get from cache first
        let article = getCachedArticle(cacheKey);

        if (!article) {
            // Fetch directly from MongoDB
            article = await fetchArticleFromDB(slugId);

            if (!article) {
                return next(); // Fall through if not found
            }

            // Cache the article
            setCachedArticle(cacheKey, article);
        }

        // Validate article has required fields
        if (!article || !article.title) {
            return res.status(404).send('Article not found');
        }

        // Generate canonical URL
        const canonicalUrl = `${CONFIG.SITE_URL}/${category}/${subcategory}/${slugId}`;

        // Generate meta tags
        const metaTags = generateMetaTags(article, canonicalUrl, req);

        // Find and read index.html
        const indexPath = findIndexHtml();

        if (!indexPath) {
            console.error('[BotSeoMiddleware] Could not find index.html');
            return res.status(500).send('Server Error');
        }

        let html = fs.readFileSync(indexPath, 'utf8');

        // Inject meta tags after <head>
        html = html.replace(/<head>/i, `<head>${metaTags}`);

        // Set appropriate headers
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('X-Robots-Tag', 'index, follow');
        res.setHeader('X-Served-By', 'BotSeoMiddleware');

        console.log(`[BotSeoMiddleware] Served dynamic OG tags for: ${article.title.substring(0, 30)}...`);

        res.send(html);

    } catch (err) {
        console.error('[BotSeoMiddleware] Error:', {
            message: err.message,
            code: err.code,
            category,
            subcategory,
            slugId,
            userAgent: userAgent.substring(0, 50)
        });

        // For article not found (404), return 404
        if (err.response?.status === 404) {
            return res.status(404).send('Article not found');
        }

        // For other errors, fall through to next handler
        next();
    }
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
    botSeoMiddleware,
    isBot,
    generateMetaTags,
    makeAbsoluteUrl,
    CONFIG
};
