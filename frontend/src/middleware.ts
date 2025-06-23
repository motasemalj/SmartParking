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

    // If token has an error or no refresh token, redirect to login
    if (token.error === 'RefreshAccessTokenError' || !token.refreshToken) {
      console.log('Token has error or no refresh token, redirecting to login');
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
      authorized: ({ token }) => {
        return !!token && token.error !== 'RefreshAccessTokenError' && !!token.refreshToken;
      },
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/security/:path*', '/dashboard/:path*'],
}; 