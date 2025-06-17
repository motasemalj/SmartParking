import 'next-auth';

declare module 'next-auth' {
  interface User {
    userType?: 'RESIDENT' | 'SECURITY' | 'ADMIN';
    accessToken?: string;
  }

  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name: string;
      email: string;
      phoneNumber: string;
      userType: 'ADMIN' | 'USER';
    };
  }
} 