'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import SecurityNav from '../components/SecurityNav';
import { format } from 'date-fns';
import { CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Plate {
  id: string;
  plateCode: string;
  plateNumber: string;
  country: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    phoneNumber: string;
    homeNumber: string;
  };
  documents: {
    id: string;
    type: string;
    url: string;
  }[];
}

interface SecurityUser {
  id: string;
  name: string;
}

export default function SecurityDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityUsers, setSecurityUsers] = useState<SecurityUser[]>([]);
  const [selectedSecurity, setSelectedSecurity] = useState<string>('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchPlates();
      fetchSecurityUsers();
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      const fetchPlatesPolling = async () => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/security/plates`,
            {
              headers: { Authorization: `Bearer ${session.accessToken}` },
            }
          );
          setPlates(response.data);
        } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to fetch plates');
        } finally {
          setLoading(false);
        }
      };
      fetchPlatesPolling();
      const interval = setInterval(fetchPlatesPolling, 5000);
      return () => clearInterval(interval);
    }
  }, [status, session]);

  const fetchSecurityUsers = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/security/users`,
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );
      setSecurityUsers(response.data);
      if (response.data.length > 0) {
        setSelectedSecurity(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching security users:', err);
    }
  };

  const fetchPlates = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.accessToken) {
        console.error('No access token found in session');
        setError('Authentication required');
        return;
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/security/plates`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );
      setPlates(response.data);
    } catch (err: any) {
      console.error('Error fetching plates:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to fetch plates');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (plateId: string) => {
    try {
      if (!selectedSecurity) {
        setError('Please select a security officer');
        return;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/security/plates/${plateId}/approve`,
        { securityId: selectedSecurity },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );
      fetchPlates();
    } catch (err: any) {
      console.error('Error approving plate:', err);
      setError(err.response?.data?.message || 'Failed to approve plate');
    }
  };

  const handleReject = async (plateId: string) => {
    try {
      if (!selectedSecurity) {
        setError('Please select a security officer');
        return;
      }

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/security/plates/${plateId}/reject`,
        { securityId: selectedSecurity },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        }
      );
      fetchPlates();
    } catch (err: any) {
      console.error('Error rejecting plate:', err);
      setError(err.response?.data?.message || 'Failed to reject plate');
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/security/report`,
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
          responseType: 'blob',
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `security-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading report:', err);
      setError('Failed to download report');
    }
  };

  const filteredPlates = plates.filter(plate => filter === 'ALL' || plate.status === filter);

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SecurityNav />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Plate Requests</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage and review number plate requests
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedSecurity}
                onChange={(e) => setSelectedSecurity(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {securityUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleDownloadReport}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download Report
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'ALL'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('PENDING')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('APPROVED')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'APPROVED'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setFilter('REJECTED')}
                className={`px-4 py-2 rounded-md ${
                  filter === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plate Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlates.map((plate) => (
                    <tr key={plate.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {plate.plateCode} {plate.plateNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {plate.country} • {plate.type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{plate.user.name}</div>
                        <div className="text-sm text-gray-500">{plate.user.homeNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            plate.status === 'APPROVED'
                              ? 'bg-green-100 text-green-800'
                              : plate.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {plate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(plate.createdAt), 'PPp')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(plate.id)}
                            className="text-green-600 hover:text-green-900"
                            disabled={plate.status === 'APPROVED'}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleReject(plate.id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={plate.status === 'REJECTED'}
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        </div>
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