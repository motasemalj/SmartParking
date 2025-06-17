'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import DashboardHeader from './components/DashboardHeader';

interface Plate {
  id: string;
  plateCode: string;
  plateNumber: string;
  country: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  documents: {
    id: string;
    type: string;
    url: string;
  }[];
}

interface Entry {
  id: string;
  type: 'ENTRY' | 'EXIT';
  timestamp: string;
  plate: {
    plateCode: string;
    plateNumber: string;
    country: string;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [history, setHistory] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'loading') {
      setLoading(true);
      return;
    }

    const fetchPlates = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!session?.accessToken) {
          console.error('No access token found in session:', session);
          setError('Authentication required');
          return;
        }

        console.log('Session:', session);
        console.log('Access Token:', session.accessToken);
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/plates`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );

        console.log('Plates response:', response.data);
        setPlates(response.data);
      } catch (err: any) {
        console.error('Error fetching plates:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to fetch plates');
      } finally {
        setLoading(false);
      }
    };

    if (session?.accessToken) {
      console.log('Session has access token, fetching plates');
      fetchPlates();
    } else {
      console.log('No access token in session, skipping fetch');
      setLoading(false);
    }
  }, [session, status, router]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/plates/history`,
          {
            headers: { Authorization: `Bearer ${session?.accessToken}` },
          }
        );
        setHistory(response.data);
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    };

    if (session?.accessToken) {
      fetchHistory();
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      const fetchPlatesPolling = async () => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/plates`,
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }
          );
          setPlates(response.data);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to fetch plates');
        }
      };
      fetchPlatesPolling();
      const interval = setInterval(fetchPlatesPolling, 5000);
      return () => clearInterval(interval);
    }
  }, [status, session]);

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      const fetchHistoryPolling = async () => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/plates/history`,
            {
              headers: { Authorization: `Bearer ${session.accessToken}` },
            }
          );
          setHistory(response.data);
        } catch (err) {
          // Optionally handle error
        }
      };
      fetchHistoryPolling();
      const interval = setInterval(fetchHistoryPolling, 5000);
      return () => clearInterval(interval);
    }
  }, [status, session]);

  const handleRemovePlate = async (plateId: string) => {
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/plates/${plateId}`,
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );
      setPlates((prevPlates) => prevPlates.filter((plate) => plate.id !== plateId));
    } catch (err) {
      console.error('Error removing plate:', err);
    }
  };

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">My Plates</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your registered number plates
                </p>
              </div>
              <Link
                href="/dashboard/add-plate"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Plate
              </Link>
            </div>
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
          ) : plates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No plates registered yet</p>
              <Link
                href="/dashboard/add-plate"
                className="mt-4 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add your first plate
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remove</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plates.map((plate) => (
                    <tr key={plate.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {plate.plateCode} {plate.plateNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {plate.country}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {plate.type === 'PERSONAL' ? 'Resident' : 'Guest'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${plate.status === 'APPROVED' ? 'bg-green-100 text-green-800' : plate.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                        >
                          {plate.status === 'APPROVED' ? 'Approved' : plate.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {plate.documents.length > 0 ? (
                          <a
                            href={plate.documents[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Document
                          </a>
                        ) : (
                          <span className="text-gray-400">No Document</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRemovePlate(plate.id)}
                          className="text-red-600 hover:text-red-800 font-medium px-3 py-1 rounded transition"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 