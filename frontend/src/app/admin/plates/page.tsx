'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import AdminNav from '../components/AdminNav';
import {
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

interface Plate {
  id: string;
  plateCode: string;
  plateNumber: string;
  country: string;
  emirate?: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  documents: { id: string; url: string }[];
  user: {
    id: string;
    name: string;
    phoneNumber: string;
    homeNumber: string;
  };
  createdAt: string;
  approvedBy?: {
    id: string;
    name: string;
  };
}

export default function PlatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Plate['status'] | 'ALL'>('ALL');
  const [updatingPlates, setUpdatingPlates] = useState<Set<string>>(new Set());
  const [platesCache, setPlatesCache] = useState<{ [key in Plate['status'] | 'ALL']?: Plate[] }>({});

  const fetchPlates = useCallback(async (statusOverride?: Plate['status'] | 'ALL') => {
    const statusToFetch = statusOverride ?? statusFilter;
    if (platesCache[statusToFetch]) {
      setPlates(platesCache[statusToFetch]!);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/plates${statusToFetch !== 'ALL' ? `?status=${statusToFetch}` : ''}`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` }
      });
      setPlates(response.data);
      setPlatesCache(prev => ({ ...prev, [statusToFetch]: response.data }));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setError(err.response?.data?.message || 'Failed to fetch plates');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken, statusFilter, platesCache]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }
    if (status === 'authenticated') {
      fetchPlates();
    }
  }, [session, status, router, fetchPlates]);

  useEffect(() => {
    fetchPlates(statusFilter);
  }, [statusFilter]);

  const handleUpdateStatus = async (plateId: string, newStatus: Plate['status']) => {
    try {
      setUpdatingPlates(prev => new Set(prev).add(plateId));

      console.log('Updating plate status...');
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/plates/${plateId}`,
        { status: newStatus },
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` }
        }
      );
      console.log('Update response:', response);

      setPlates((prevPlates) =>
        prevPlates.map((plate) =>
          plate.id === plateId ? { ...plate, status: newStatus } : plate
        )
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error('Error updating plate status:', err.response?.data || error);
      alert(err.response?.data?.message || 'Failed to update plate status');
    } finally {
      setUpdatingPlates(prev => {
        const newSet = new Set(prev);
        newSet.delete(plateId);
        return newSet;
      });
    }
  };

  const filteredPlates = plates.filter(
    (plate) =>
      (plate.plateCode + ' ' + plate.plateNumber).toLowerCase().includes(searchTerm.toLowerCase()) ||
      plate.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plate.user.phoneNumber.includes(searchTerm) ||
      (statusFilter !== 'ALL' && plate.status === statusFilter)
  );

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Plates</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage plate registrations and approvals
            </p>
          </div>

          <div className="mb-6">
            <AdminNav />
          </div>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="max-w-lg w-full">
              <label htmlFor="search" className="sr-only">
                Search plates
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search plates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as Plate['status'] | 'ALL')}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900 bg-white"
              >
                <option value="ALL" className="text-gray-900 bg-white">All Status</option>
                <option value="PENDING" className="text-gray-900 bg-white">Pending</option>
                <option value="APPROVED" className="text-gray-900 bg-white">Approved</option>
                <option value="REJECTED" className="text-gray-900 bg-white">Rejected</option>
              </select>
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
          ) : filteredPlates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No plates found</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPlates.map((plate) => (
                    <tr key={plate.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {plate.plateCode} {plate.plateNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {plate.country} • {plate.type}
                          {plate.country === 'UAE' && plate.emirate && (
                            <span> • {plate.emirate}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {plate.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {plate.user.phoneNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {plate.user.homeNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {plate.status === 'APPROVED' && (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          )}
                          {plate.status === 'REJECTED' && (
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                          )}
                          {plate.status === 'PENDING' && (
                            <ClockIcon className="h-5 w-5 text-yellow-500" />
                          )}
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
                        </div>
                        {plate.status === 'APPROVED' && plate.approvedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            Approved by: {plate.approvedBy.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {plate.documents.length > 0 ? (
                          <button
                            onClick={async () => {
                              try {
                                const response = await axios.get(
                                  `${process.env.NEXT_PUBLIC_API_URL}${plate.documents[0].url}`,
                                  {
                                    headers: { Authorization: `Bearer ${session?.accessToken}` },
                                    responseType: 'blob',
                                  }
                                );
                                
                                // Create a blob URL and open it in a new tab
                                const blob = new Blob([response.data], { 
                                  type: response.headers['content-type'] || 'application/octet-stream' 
                                });
                                const url = window.URL.createObjectURL(blob);
                                const newWindow = window.open(url, '_blank');
                                
                                // Clean up the blob URL after the window loads
                                if (newWindow) {
                                  newWindow.onload = () => {
                                    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
                                  };
                                }
                              } catch (error) {
                                console.error('Error viewing document:', error);
                                alert('Failed to view document');
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4 mr-1.5" />
                            View Document
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">No Document</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-3">
                          {/* Approve/Reject Buttons */}
                          {plate.status !== 'EXPIRED' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(plate.id, 'APPROVED')}
                                disabled={updatingPlates.has(plate.id)}
                                className={`inline-flex items-center px-2 py-1 text-xs font-normal rounded focus:outline-none focus:ring-1 focus:ring-green-300 transition-colors duration-200 bg-green-500 text-white hover:bg-green-600`}
                                title={'Approve plate request'}
                              >
                                {updatingPlates.has(plate.id) ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                                    Approve
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(plate.id, 'REJECTED')}
                                disabled={updatingPlates.has(plate.id)}
                                className={`inline-flex items-center px-2 py-1 text-xs font-normal rounded focus:outline-none focus:ring-1 focus:ring-red-300 transition-colors duration-200 bg-red-500 text-white hover:bg-red-600`}
                                title={'Reject plate request'}
                              >
                                {updatingPlates.has(plate.id) ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <XCircleIcon className="h-3 w-3 mr-1" />
                                    Reject
                                  </>
                                )}
                              </button>
                            </>
                          )}
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