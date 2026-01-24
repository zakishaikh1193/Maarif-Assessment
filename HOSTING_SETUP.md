# Hosting Setup Guide for Maarif Assessment Portal

## ⚠️ IMPORTANT: Quick Fix for Current Errors

The errors you're seeing indicate:
1. **Backend not running** - Node.js server needs to be started
2. **Reverse proxy not configured** - Web server needs to route `/api/*` to Node.js
3. **Frontend not built/deployed** - Need to build and copy files to `public_html`

### Quick Steps:

1. **Start Backend Server** (via SSH or cPanel Node.js Selector):
   ```bash
   cd /home/legatolx/maarif-assessment.legatolxp.online/backend
   pm2 start server.js --name maarif-backend
   # OR use cPanel Node.js Selector
   ```

2. **Build Frontend**:
   ```bash
   cd /home/legatolx/maarif-assessment.legatolxp.online
   npm run build
   cp -r dist/* public_html/
   ```

3. **Copy .htaccess**:
   ```bash
   cp .htaccess public_html/.htaccess
   ```

4. **Update backend/.env**:
   - Set `NODE_ENV=production`
   - Set `CORS_ORIGIN=https://maarif-assessment.legatolxp.online`
   - Update database credentials

---

## Overview
This application consists of:
- **Frontend**: React/Vite app (static files)
- **Backend**: Node.js/Express API server

## Hosting Requirements

### 1. Backend Server Setup

The backend needs to run as a Node.js process. For cPanel hosting, you'll typically need:

#### Option A: Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Navigate to backend directory
cd backend

# Start the server with PM2
pm2 start server.js --name maarif-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
```

#### Option B: Using Node.js Application Manager (cPanel)
1. Go to cPanel → Node.js Selector
2. Create a new application
3. Set:
   - Application root: `/home/legatolx/maarif-assessment.legatolxp.online/backend`
   - Application URL: `/api` (or leave blank)
   - Application startup file: `server.js`
   - Application mode: Production
4. Set environment variables (see below)
5. Click "Create" and then "Run"

### 2. Environment Variables

Update `backend/.env` with production values:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=legatolx_maarif_assessment
DB_PASSWORD=admin@Byline25
DB_NAME=legatolx_maarif_assessment

# JWT Configuration
JWT_SECRET=bxLUADIYG65423XAxbl^x%3UE379043fhjIHAg
JWT_EXPIRES_IN=24h

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS - IMPORTANT: Set to your production domain
CORS_ORIGIN=https://maarif-assessment.legatolxp.online

# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyBL4QK_J3kCuYHeBxxhW0M80jZwVHuB9QE
```

### 3. Frontend Build

Build the frontend for production:

```bash
# Navigate to project root
cd /path/to/project

# Install dependencies (if not done)
npm install

# Build for production
npm run build

# The build output will be in the 'dist' folder
```

### 4. File Structure on Server

Your server should have this structure:

```
/home/legatolx/maarif-assessment.legatolxp.online/
├── backend/              # Backend Node.js application
│   ├── server.js
│   ├── .env             # Production environment variables
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── ...
├── dist/                 # Frontend build output (copy contents to public_html)
│   ├── index.html
│   ├── assets/
│   └── ...
├── .htaccess            # Apache/LiteSpeed configuration
└── public_html/         # Web root (copy dist contents here)
    ├── index.html
    ├── assets/
    └── .htaccess
```

### 5. Web Server Configuration

#### For Apache/LiteSpeed (.htaccess)

The `.htaccess` file should be in your `public_html` directory:

```apache
# Enable Rewrite Engine
RewriteEngine On

# Handle API requests - proxy to Node.js backend
# For LiteSpeed, you may need to use different proxy syntax
RewriteCond %{REQUEST_URI} ^/api/(.*)$
RewriteRule ^api/(.*)$ http://localhost:5000/api/$1 [P,L]

# Alternative for LiteSpeed (if above doesn't work):
# RewriteCond %{REQUEST_URI} ^/api/(.*)$
# RewriteRule ^api/(.*)$ http://127.0.0.1:5000/api/$1 [P,L]

# Handle frontend routes - serve index.html for SPA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !^/api/
RewriteRule ^ index.html [L]
```

#### For LiteSpeed Web Server (Alternative Configuration)

If `.htaccess` doesn't work, you may need to configure LiteSpeed directly:

1. Go to cPanel → LiteSpeed Web Server Cache
2. Or configure via `.htaccess` with LiteSpeed-specific directives

**Note**: LiteSpeed may require the `mod_proxy` and `mod_rewrite` modules to be enabled.

### 6. Troubleshooting

#### Issue: "File not found /api/auth/login"

**Solution**: The web server isn't proxying API requests to Node.js. Check:
1. Is the Node.js backend running? (Check PM2 or Node.js Selector)
2. Is the backend listening on port 5000?
3. Is the reverse proxy configured correctly in `.htaccess`?
4. Are `mod_proxy` and `mod_rewrite` enabled?

#### Issue: "File not found /assets/index-*.js"

**Solution**: Frontend build files aren't in the correct location:
1. Run `npm run build` in the project root
2. Copy all contents from `dist/` to `public_html/`
3. Ensure file permissions are correct (644 for files, 755 for directories)

#### Issue: CORS errors

**Solution**: Update `CORS_ORIGIN` in `backend/.env`:
```env
CORS_ORIGIN=https://maarif-assessment.legatolxp.online
```

#### Issue: Database connection errors

**Solution**: 
1. Verify database credentials in `backend/.env`
2. Ensure database user has proper permissions
3. Check if database host allows connections from localhost

### 7. Testing

After setup, test:

1. **Backend Health Check**:
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"status":"OK",...}`

2. **API Endpoint**:
   ```bash
   curl https://maarif-assessment.legatolxp.online/api/
   ```
   Should return API information

3. **Frontend**:
   Visit: `https://maarif-assessment.legatolxp.online/`
   Should load the React app

### 8. Alternative: Separate Subdomain for API

If reverse proxy doesn't work, you can:
1. Run backend on a subdomain: `api.maarif-assessment.legatolxp.online`
2. Update `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'https://api.maarif-assessment.legatolxp.online/api/';
   ```
3. Configure CORS to allow the main domain

### 9. PM2 Management Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs maarif-backend

# Restart
pm2 restart maarif-backend

# Stop
pm2 stop maarif-backend

# Monitor
pm2 monit
```
