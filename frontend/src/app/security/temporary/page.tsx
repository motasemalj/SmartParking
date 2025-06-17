'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import SecurityNav from '../components/SecurityNav';
import { format } from 'date-fns';

interface TemporaryAccess {
  id: string;
  visitorName: string;
  phoneNumber: string;
  purpose: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'EXPIRED';
  createdBy: {
    name: string;
  };
}

export default function TemporaryAccessPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [endTime, setEndTime] = useState('');
  const [accessList, setAccessList] = useState<TemporaryAccess[]>([]);

  useEffect(() => {
    console.log('Session status:', status);
    console.log('Session data:', session);
    
    if (status === 'authenticated' && session?.accessToken) {
      console.log('Session is authenticated, fetching access list...');
      fetchAccessList();
    } else if (status === 'unauthenticated') {
      console.log('Session is unauthenticated, redirecting to login...');
      router.push('/auth/login');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      const fetchAccessListPolling = async () => {
        if (!session?.accessToken) return;
        try {
          const response = await axios.get(
            'http://localhost:5002/api/security/temporary-access',
            {
              headers: { 
                Authorization: `Bearer ${session.accessToken}`,
                'Content-Type': 'application/json'
              },
            }
          );
          setAccessList(response.data);
        } catch (err: any) {
          setError('Failed to fetch access list');
        }
      };
      fetchAccessListPolling();
      const interval = setInterval(fetchAccessListPolling, 5000);
      return () => clearInterval(interval);
    }
  }, [status, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!session?.accessToken) {
      console.error('No access token found in session');
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      console.log('Sending request with token:', session.accessToken);
      const response = await axios.post(
        'http://localhost:5002/api/security/temporary-access',
        {
          visitorName,
          phoneNumber,
          purpose,
          endTime: new Date(endTime).toISOString(),
        },
        {
          headers: { 
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          },
        }
      );

      console.log('Response:', response.data);
      setSuccess('Temporary access granted successfully');
      setVisitorName('');
      setPhoneNumber('');
      setPurpose('');
      setEndTime('');
      fetchAccessList();
    } catch (err: any) {
      console.error('Error granting temporary access:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to grant temporary access');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessList = async () => {
    if (!session?.accessToken) {
      console.error('No access token found in session');
      setError('Authentication required');
      return;
    }

    try {
      console.log('Fetching access list with token:', session.accessToken);
      const response = await axios.get(
        'http://localhost:5002/api/security/temporary-access',
        {
          headers: { 
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json'
          },
        }
      );
      console.log('Access list response:', response.data);
      setAccessList(response.data);
    } catch (err: any) {
      console.error('Error fetching access list:', err);
      console.error('Error response:', err.response?.data);
      setError('Failed to fetch access list');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SecurityNav />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Grant Access Form */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Grant Temporary Access
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>Provide temporary access to visitors.</p>
                </div>
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label htmlFor="visitorName" className="block text-sm font-medium text-gray-700">
                      Visitor Name
                    </label>
                    <input
                      type="text"
                      name="visitorName"
                      id="visitorName"
                      required
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      id="phoneNumber"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
                      Purpose
                    </label>
                    <textarea
                      name="purpose"
                      id="purpose"
                      required
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
                      Access Until
                    </label>
                    <input
                      type="datetime-local"
                      name="endTime"
                      id="endTime"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {loading ? 'Granting Access...' : 'Grant Access'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Access List */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Active Access List</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>View all active temporary access grants.</p>
                </div>
                <div className="mt-5">
                  <div className="flow-root">
                    <ul className="-my-5 divide-y divide-gray-200">
                      {accessList.map((access) => (
                        <li key={access.id} className="py-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {access.visitorName}
                              </p>
                              <p className="text-sm text-gray-500">{access.phoneNumber}</p>
                              <p className="text-sm text-gray-500">{access.purpose}</p>
                              <p className="text-sm text-gray-500">
                                Until: {format(new Date(access.endTime), 'PPp')}
                              </p>
                            </div>
                            <div>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  access.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {access.status}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 