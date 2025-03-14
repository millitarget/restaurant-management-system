# Vercel Environment Variables Setup

When deploying your Restaurant Management System to Vercel, you need to configure the following environment variables in your Vercel project settings:

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | https://mwjijtujxhsirwtyivcc.supabase.co |
| `SUPABASE_KEY` | Your Supabase API key | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |
| `NODE_ENV` | Set to "production" for deployment | production |

## How to Add Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Click on "Settings" at the top navigation
4. Select "Environment Variables" from the left sidebar
5. Add each environment variable:
   - Enter the name (e.g., `SUPABASE_URL`)
   - Enter the value
   - Select "Production" for Environment
   - Click "Add"
6. Repeat for all required variables
7. Deploy or redeploy your project

## Securing Your Environment Variables

Never commit your actual Supabase keys directly to your GitHub repository. Use the `.env.example` file to show which variables are needed, but keep your actual values in the Vercel environment variables settings.

## Troubleshooting

If you're experiencing API connection issues after deployment, verify that:

1. All environment variables are correctly set in Vercel
2. The values match those in your Supabase project
3. Your API URLs in the frontend code are using the `API_CONFIG.getUrl()` helper function

Example of correct API URL usage in frontend code:
```javascript
// Correct
const response = await fetch(API_CONFIG.getUrl('/orders'));

// Incorrect (hardcoded URL)
const response = await fetch('http://localhost:3000/orders');
``` 