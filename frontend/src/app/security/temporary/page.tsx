'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TemporaryAccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main dashboard since temporary access is now integrated there
    router.push('/security/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
} 