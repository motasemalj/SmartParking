# Environment Variables Setup

## For Local Development
Create a `.env.local` file in the frontend directory with:

```env
NEXT_PUBLIC_API_URL=https://smartparking-production-b700.up.railway.app
NEXTAUTH_SECRET=your-nextauth-secret-key-here
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

## For Vercel Production
Add these environment variables in your Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://smartparking-production-b700.up.railway.app
NEXTAUTH_SECRET=your-nextauth-secret-key-here
NEXTAUTH_URL=https://smart-parking-chi.vercel.app
NODE_ENV=production
```

## How to Add to Vercel:
1. Go to your Vercel dashboard
2. Select your project: `smart-parking-chi`
3. Go to Settings → Environment Variables
4. Add each variable above
5. Redeploy automatically 