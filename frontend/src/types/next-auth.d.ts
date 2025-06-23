import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    phoneNumber: string;
    userType: 'ADMIN' | 'SECURITY' | 'RESIDENT';
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    accessToken?: string;
    refreshToken?: string;
    user: {
      id: string;
      name: string;
      email?: string | null;
      image?: string | null;
      phoneNumber: string;
      userType: 'ADMIN' | 'SECURITY' | 'RESIDENT';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    phoneNumber: string;
    userType: 'ADMIN' | 'SECURITY' | 'RESIDENT';
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
  }
} 