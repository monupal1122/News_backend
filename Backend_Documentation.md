# Backend - News Website 🖥️

This is the Node.js / Express backend for the News Website project, providing an API and an admin panel for content management.

## 🚀 Tech Stack

- **Framework:** [Express.js](https://expressjs.com/)
- **Database:** [MongoDB](https://www.mongodb.com/) (using Mongoose)
- **Caching:** [Redis](https://redis.io/)
- **Template Engine:** [EJS](https://ejs.co/) (for Admin Panel)
- **Authentication:** [Passport.js](https://www.passportjs.org/) (Google OAuth and Local)
- **Security:** [Helmet](https://helmetjs.github.io/), [CORS](https://expressjs.com/en/resources/middleware/cors.html)
- **File Upload:** [Multer](https://github.com/expressjs/multer) and [Cloudinary](https://cloudinary.com/)
- **SEO/Prerendering:** [Prerender.io](https://prerender.io/) and Dynamic OG Tag injection

## 📁 Project Structure

- `src/config`: Connection configurations (DB, Redis, Passport, Cloudinary)
- `src/controllers`: Request handlers and business logic
- `src/middlewares`: Security (Rate limiting, SEO bot detection, Auth)
- `src/models`: Mongoose schemas for MongoDB
- `src/routes`: API and Admin panel route definitions
- `src/services`: External service integrations (Email, Cloudinary)
- `src/utils`: Reusable helper functions (ID/slug generators)
- `src/views`: Server-side rendered views for the admin and author panels

## ⚙️ Key Backend Features

- **Dynamic API:** RESTful endpoints for news, categories, tags, and authors
- **Admin & Author Panels:** Full-featured dashboards for content management
- **SEO Optimization:** Integrated bot detection and meta-tag injection for social media previews
- **Rate Limiting:** Protection for login and API endpoints
- **Role-based Auth:** Distinct functionality for admins and contributing authors
- **Image Integration:** Automatic upload and optimization through Cloudinary

## 🛠️ Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (Local or Atlas)
- Redis server (Local or Cloud)
- Cloudinary account (for image uploads)
- Google OAuth credentials (optional, for social login)

### Installation

```bash
cd server
npm install
```

### Environment Configuration

Create a `.env` file in the `server` root (follow `.env.example` as a template):

```env
PORT=3000
MONGODB_URI=your-mongodb-connection-string
REDIS_URL=your-redis-url
JWT_SECRET=your-secret-key
ADMIN_EMAIL=your-admin-email
ADMIN_PASSWORD=your-admin-password
CLOUD_NAME=your-cloudinary-name
CLOUD_API_KEY=your-cloudinary-api-key
CLOUD_API_SECRET=your-cloudinary-api-secret
PRERENDER_TOKEN=your-prerender-io-token
SITE_URL=your-website-url
```

### Running the Server

Start in development mode with nodemon:

```bash
npm run dev
```

Start for production:

```bash
npm start
```

## 🛤️ API Endpoint Overview (Prefix: `/api`)

- **Auth:** `/auth/login`, `/auth/forgot-password`, `/auth/reset-password/:token`
- **Articles:**
  - `GET /articles` - Fetch news with pagination
  - `GET /articles/category/:category` - Articles by category
  - `GET /articles/:category/:subcategory/:slugId` - Single article view
- **Categories:** `GET /categories`, `GET /categories/full`
- **Authors:** `GET /authors/:id`
- **Ads:** `GET /api/ads`

## 📦 Deployment Note

This server is designed to be the primary entry point for both the API and the pre-built React frontend. It will serve static files from `../frontend/dist` and handle SPA routing fallbacks.
