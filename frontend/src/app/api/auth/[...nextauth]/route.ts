import NextAuth, { DefaultSession, NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name: string;
      email?: string | null;
      image?: string | null;
      phoneNumber: string;
      userType: 'ADMIN' | 'SECURITY' | 'RESIDENT';
    };
  }

  interface User {
    id: string;
    name: string;
    phoneNumber: string;
    userType: 'ADMIN' | 'SECURITY' | 'RESIDENT';
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    phoneNumber: string;
    userType: 'ADMIN' | 'SECURITY' | 'RESIDENT';
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        phoneNumber: { label: 'Phone Number', type: 'text' },
        otp: { label: 'OTP', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.otp) {
          console.log('Missing credentials');
          return null;
        }

        try {
          console.log('Attempting to verify credentials:', credentials.phoneNumber);
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/otp/verify`,
            {
              phoneNumber: credentials.phoneNumber,
              otp: credentials.otp,
            }
          );

          console.log('Backend response:', response.data);

          if (response.data && response.data.user) {
            const user = response.data.user;
            console.log('User data from backend:', user);
            console.log('Token from backend:', response.data.token);
            return {
              id: user.id,
              name: user.name,
              phoneNumber: user.phoneNumber,
              userType: user.userType,
              accessToken: response.data.token,
            };
          }
          console.log('No user found in response');
          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log('JWT Callback - Token:', token);
      console.log('JWT Callback - User:', user);
      
      if (user) {
        token.id = user.id;
        token.phoneNumber = user.phoneNumber;
        token.userType = user.userType;
        token.accessToken = user.accessToken;
        console.log('Updated token with user data:', token);
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Session:', session);
      console.log('Session Callback - Token:', token);
      
      if (token) {
        session.user.id = token.id;
        session.user.phoneNumber = token.phoneNumber;
        session.user.userType = token.userType;
        session.accessToken = token.accessToken;
        console.log('Updated session with token data:', session);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If the URL is relative, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If the URL is already absolute, return it
      else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  debug: process.env.NODE_ENV === 'development',
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 