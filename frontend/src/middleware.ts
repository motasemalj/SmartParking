import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // If user is not authenticated, redirect to login
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }

    // Handle admin routes
    if (path.startsWith('/admin')) {
      if (token.userType !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Handle security routes
    if (path.startsWith('/security')) {
      if (token.userType !== 'SECURITY') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Handle resident routes
    if (path.startsWith('/dashboard')) {
      if (token.userType === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
      if (token.userType === 'SECURITY') {
        return NextResponse.redirect(new URL('/security/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/security/:path*', '/dashboard/:path*'],
}; 