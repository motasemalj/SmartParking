# Smart Parking Platform

A modern smart parking platform for gated communities in the UAE, featuring automated number plate recognition and seamless access control.

## Features

- User authentication via phone number and OTP
- Number plate management for residents and guests
- Real-time notifications for vehicle entry/exit
- Security dashboard for access control
- Admin panel for system configuration
- Vehicle license (Mulkeya) document processing
- Comprehensive reporting and logging

## Tech Stack

### Frontend
- Next.js 14 with TypeScript
- Tailwind CSS
- NextAuth.js
- React Query
- React Hook Form
- Shadcn/ui for components

### Backend
- Node.js with Express
- PostgreSQL
- Prisma ORM
- Redis for OTP
- AWS S3 for document storage
- JWT authentication

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis
- AWS Account (for S3)
- Hikvision ANPR Camera (for production)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Frontend (.env.local)
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_S3_BUCKET=your-bucket-name

   # Backend (.env)
   DATABASE_URL="postgresql://user:password@localhost:5432/smart_parking"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET=your-secret-key
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_REGION=your-region
   ```

4. Initialize the database:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

5. Start the development servers:
   ```bash
   # Start backend
   cd backend
   npm run dev

   # Start frontend
   cd frontend
   npm run dev
   ```

## Project Structure

```
smart-parking-platform/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js app directory
│   │   ├── components/      # Reusable components
│   │   ├── lib/            # Utility functions
│   │   └── types/          # TypeScript types
│   └── public/             # Static assets
│
├── backend/                 # Express backend application
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic
│   └── prisma/            # Database schema and migrations
│
└── docs/                   # Documentation
```

## API Documentation

API documentation is available at `/api-docs` when running the backend server.

## License

MIT 