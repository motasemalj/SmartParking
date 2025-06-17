'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import DashboardHeader from '../components/DashboardHeader';

interface Entry {
  id: string;
  type: 'ENTRY' | 'EXIT';
  timestamp: string;
  plate: {
    plateCode: string;
    plateNumber: string;
    country: string;
    type: string;
  };
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/plates/history`,
          {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          }
        );

        setHistory(response.data);
      } catch (err) {
        setError('Failed to fetch history');
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (session?.accessToken) {
      fetchHistory();
    }
  }, [session, status, router]);

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Entry History</h1>
            <p className="mt-1 text-sm text-gray-500">
              View the history of your vehicle entries and exits
            </p>
          </div>

          <DashboardHeader />

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No history found</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {history.map((entry) => (
                  <li key={entry.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                              entry.type === 'ENTRY'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {entry.type === 'ENTRY' ? 'In' : 'Out'}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {entry.plate.plateCode} {entry.plate.plateNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {entry.plate.country} • {entry.plate.type}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 