import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

const authOptions: NextAuthOptions = {
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
            console.log('Access token from backend:', response.data.accessToken);
            console.log('Refresh token from backend:', response.data.refreshToken);
            return {
              id: user.id,
              name: user.name,
              phoneNumber: user.phoneNumber,
              userType: user.userType,
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
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
    async jwt({ token, user, trigger }) {
      console.log('JWT Callback - Token:', token);
      console.log('JWT Callback - User:', user);
      console.log('JWT Callback - Trigger:', trigger);
      
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.phoneNumber = user.phoneNumber;
        token.userType = user.userType;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour from now
        console.log('Updated token with user data:', token);
        return token as any;
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires || 0)) {
        console.log('Access token still valid');
        return token;
      }

      // Access token has expired, try to update it
      console.log('Access token expired, attempting refresh');
      console.log('Current token refreshToken:', token.refreshToken ? 'exists' : 'undefined');
      
      // If no refresh token exists, sign out the user
      if (!token.refreshToken) {
        console.log('No refresh token found, marking for sign out');
        return {
          ...token,
          error: 'RefreshAccessTokenError',
        };
      }
      
      return await refreshAccessToken(token);
    },
    async session({ session, token }) {
      console.log('Session Callback - Session:', session);
      console.log('Session Callback - Token:', token);
      
      // If there's a refresh error, return empty session to force re-authentication
      if (token.error === 'RefreshAccessTokenError') {
        console.log('Refresh error detected, returning empty session');
        return {
          ...session,
          user: {
            id: '',
            name: '',
            email: null,
            image: null,
            phoneNumber: '',
            userType: 'RESIDENT' as const,
          },
          accessToken: undefined,
          refreshToken: undefined,
          expires: new Date(0).toISOString(),
        };
      }
      
      if (token) {
        session.user.id = token.id;
        session.user.phoneNumber = token.phoneNumber;
        session.user.userType = token.userType;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
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

async function refreshAccessToken(token: {
  refreshToken?: string;
  accessTokenExpires?: number;
  error?: string;
  [key: string]: unknown;
}) {
  try {
    console.log('Refreshing access token...');
    
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
      {
        refreshToken: token.refreshToken,
      }
    );

    const refreshedTokens = response.data;

    console.log('Token refresh successful');

    return {
      ...token,
      accessToken: refreshedTokens.accessToken,
      accessTokenExpires: Date.now() + 60 * 60 * 1000, // 1 hour from now
      refreshToken: refreshedTokens.refreshToken ?? token.refreshToken, // Fall back to old refresh token, but note that
      // many libraries give you a new refresh token when you refresh an access token
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 