'use client';

import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

export default function ClearSessionPage() {
  useEffect(() => {
    // Clear the session and redirect to login
    signOut({ callbackUrl: '/auth/login' });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Clearing session and redirecting to login...</p>
      </div>
    </div>
  );
} 