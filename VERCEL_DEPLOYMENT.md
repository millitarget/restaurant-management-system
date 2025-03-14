# Vercel Deployment Guide

This guide provides step-by-step instructions for deploying this Restaurant Management System to Vercel via GitHub.

## Prerequisites

1. Ensure your code is pushed to a GitHub repository
2. Create a [Vercel account](https://vercel.com/signup) if you don't have one
3. Have your Supabase credentials ready (URL and API keys)

## Deployment Steps

### 1. Import Your GitHub Repository

1. Log in to your Vercel account
2. Click on "Add New" > "Project"
3. Import your GitHub repository (authorize Vercel to access GitHub if needed)
4. Select the restaurant management system repository

### 2. Configure Project Settings

1. **Project Name**: Enter a name for your deployment
2. **Framework Preset**: Select "Other" (we're using our custom configuration)
3. **Root Directory**: Leave as `.` (the root of your repository)
4. **Build and Output Settings**: Leave blank (our vercel.json handles this)

### 3. Configure Environment Variables

Click on "Environment Variables" and add the following:

```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
NODE_ENV=production
```

Replace `your_supabase_url`, `your_supabase_key`, and `your_supabase_service_key` with your actual Supabase credentials.

### 4. Deploy

Click "Deploy" and wait for the deployment to complete.

## Troubleshooting

If you encounter a 404 error after deployment:

1. Check Vercel deployment logs for any build errors
2. Verify that your vercel.json file is in the root directory
3. Make sure your frontend HTML files are correctly located in frontend/public/
4. Check that your API routes in the backend match what your frontend expects

## Understanding the Deployment Configuration

The `vercel.json` file configures how your application is built and served:

```json
{
  "version": 2,
  "builds": [
    { "src": "frontend/public/**/*", "use": "@vercel/static" },
    { "src": "backend/src/index.js", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/src/index.js" },
    { "src": "/(.*)", "dest": "frontend/public/$1", "continue": true },
    { "handle": "filesystem" }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

This configuration:
- Builds the static frontend files
- Sets up the Node.js backend as a serverless function
- Routes API requests to the backend
- Routes all other requests to the frontend
- Sets the environment to production

## Updating Your Deployment

When you push new changes to your GitHub repository, Vercel will automatically rebuild and redeploy your application.

## Custom Domains

To use a custom domain:

1. Go to your project in the Vercel dashboard
2. Click on "Settings" > "Domains"
3. Add your custom domain and follow the verification steps 