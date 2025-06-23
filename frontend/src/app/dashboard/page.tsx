'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import DashboardHeader from './components/DashboardHeader';
import { apiClient } from '@/lib/api-client';
import useSWR from 'swr';

interface Plate {
  id: string;
  plateCode: string;
  plateNumber: string;
  country: string;
  emirate?: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  expiresAt?: string;
  approvedBy?: {
    name: string;
  };
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

interface PlatesResponse {
  plates: Plate[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface HistoryResponse {
  history: Entry[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface FullHistoryResponse {
  history: Entry[];
  pagination: PaginationInfo;
}

const fetcher = (url: string, token: string) =>
  apiClient.get(url, { headers: { Authorization: `Bearer ${token}` } });

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'plates' | 'history'>('plates');
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [deletingPlates, setDeletingPlates] = useState<Set<string>>(new Set());

  // SWR for plates
  const {
    data: platesData,
    error: platesError,
    isLoading: platesLoading,
    mutate: mutatePlates
  } = useSWR(
    status === 'authenticated' && session?.accessToken ? ['/api/plates', session.accessToken] : null,
    ([url, token]) => fetcher(url, token),
    { refreshInterval: 30000 }
  );
  const plates = Array.isArray(platesData) ? platesData : (platesData as PlatesResponse)?.plates || [];

  // SWR for recent history (5 entries)
  const {
    data: historyData,
    error: historyError,
    isLoading: historyLoading,
    mutate: mutateHistory
  } = useSWR(
    status === 'authenticated' && session?.accessToken ? ['/api/plates/history?limit=5', session.accessToken] : null,
    ([url, token]) => fetcher(url, token),
    { refreshInterval: 30000 }
  );
  const history = (historyData as HistoryResponse)?.history || [];

  // SWR for full entry history (paginated)
  const {
    data: fullHistoryData,
    error: fullHistoryError,
    isLoading: fullHistoryLoading,
    mutate: mutateFullHistory
  } = useSWR(
    status === 'authenticated' && session?.accessToken && activeTab === 'history'
      ? [`/api/plates/history?page=${currentPage}&limit=20`, session.accessToken]
      : null,
    ([url, token]) => fetcher(url, token)
  );
  const fullHistory = (fullHistoryData as FullHistoryResponse)?.history || [];
  const pagination = (fullHistoryData as FullHistoryResponse)?.pagination || null;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  const handleTabChange = (tab: 'plates' | 'history') => {
    setActiveTab(tab);
    if (tab === 'history') setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRemovePlate = async (plateId: string) => {
    try {
      setDeletingPlates(prev => new Set(prev).add(plateId));
      setRemoveError(null);
      await apiClient.delete(`/api/plates/${plateId}`);
      setSuccessMessage('Plate has been successfully removed');
      mutatePlates();
      mutateHistory();
      mutateFullHistory();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setRemoveError(err.response?.data?.message || 'Failed to remove plate. Please try again.');
      setTimeout(() => setRemoveError(null), 5000);
    } finally {
      setDeletingPlates(prev => {
        const newSet = new Set(prev);
        newSet.delete(plateId);
        return newSet;
      });
      setShowConfirmation(null);
    }
  };

  const confirmRemove = (plateId: string) => setShowConfirmation(plateId);
  const cancelRemove = () => setShowConfirmation(null);

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col space-y-4">
              {/* Logout button at the top */}
              <div className="flex justify-end">
                <button
                  onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
              
              {/* Title and Add Plate button */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">My Plates</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your registered number plates
                  </p>
                </div>
                <Link
                  href="/dashboard/add-plate"
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-4 sm:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-full sm:w-auto"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Plate
                </Link>
              </div>
            </div>
          </div>

          <DashboardHeader activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
                <div className="ml-auto pl-3">
                  <div className="-mx-1.5 -my-1.5">
                    <button
                      type="button"
                      onClick={() => setSuccessMessage(null)}
                      className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                    >
                      <span className="sr-only">Dismiss</span>
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {removeError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{removeError}</p>
                </div>
                <div className="ml-auto pl-3">
                  <div className="-mx-1.5 -my-1.5">
                    <button
                      type="button"
                      onClick={() => setRemoveError(null)}
                      className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                    >
                      <span className="sr-only">Dismiss</span>
                      <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Plates Section */}
          {activeTab === 'plates' && (
            <>
              {platesLoading && (
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3"></div>
                    <span className="text-sm text-gray-600">Updating plates...</span>
                  </div>
                </div>
              )}
              
              {/* Mobile card view */}
              <div className="sm:hidden">
                {plates.map((plate: Plate) => (
                  <div key={plate.id} className="border-b border-gray-200 p-4 last:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          {plate.plateCode} {plate.plateNumber}
                        </div>
                        {plate.country === 'UAE' && plate.emirate && (
                          <div className="text-sm text-gray-500 mb-2">
                            {plate.emirate}
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          {plate.country} • {plate.type === 'PERSONAL' ? 'Resident' : 'Guest'}
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                          ${plate.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                            plate.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                            plate.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'}`}
                        >
                          {plate.status === 'APPROVED' ? 'Approved' : 
                           plate.status === 'REJECTED' ? 'Rejected' : 
                           plate.status === 'EXPIRED' ? 'Expired' :
                           'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    {plate.type === 'GUEST' && plate.status === 'APPROVED' && plate.expiresAt && (
                      <div className="text-xs text-gray-500 mb-3">
                        Expires: {format(new Date(plate.expiresAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                    {plate.type === 'GUEST' && plate.status === 'EXPIRED' && plate.expiresAt && (
                      <div className="text-xs text-red-500 mb-3">
                        Expired: {format(new Date(plate.expiresAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                    {plate.status === 'APPROVED' && plate.approvedBy && (
                      <div className="text-xs text-gray-500 mb-3">
                        Approved by: {plate.approvedBy.name}
                      </div>
                    )}
                    
                    <div className="flex flex-col space-y-2">
                      {plate.documents.length > 0 ? (
                        <button
                          onClick={async () => {
                            try {
                              const response = await apiClient.rawRequest({
                                url: plate.documents[0].url,
                                method: 'GET',
                                responseType: 'blob',
                              });
                              
                              const blob = new Blob([response.data as BlobPart], { 
                                type: response.headers['content-type'] || 'application/octet-stream' 
                              });
                              const url = window.URL.createObjectURL(blob);
                              const newWindow = window.open(url, '_blank');
                              
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
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900 font-medium text-left transition-colors"
                        >
                          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Document
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">No Document</span>
                      )}
                      
                      {showConfirmation === plate.id ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center mb-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                            <span className="text-sm font-medium text-red-800">Confirm Removal</span>
                          </div>
                          <p className="text-xs text-red-700 mb-3">
                            Are you sure you want to remove {plate.plateCode} {plate.plateNumber}? This action cannot be undone.
                          </p>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRemovePlate(plate.id)}
                              disabled={deletingPlates.has(plate.id)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {deletingPlates.has(plate.id) ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                  Removing...
                                </>
                              ) : (
                                <>
                                  <TrashIcon className="h-3 w-3 mr-1" />
                                  Remove
                                </>
                              )}
                            </button>
                            <button
                              onClick={cancelRemove}
                              disabled={deletingPlates.has(plate.id)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="w-fit">
                          <button
                            onClick={() => confirmRemove(plate.id)}
                            disabled={deletingPlates.has(plate.id)}
                            className="inline-flex items-center text-red-600 hover:text-red-800 font-medium text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed px-0 py-0 touch-manipulation"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Remove Plate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {plates.map((plate: Plate) => (
                      <tr key={plate.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {plate.plateCode} {plate.plateNumber}
                          </div>
                          {plate.country === 'UAE' && plate.emirate && (
                            <div className="text-xs text-gray-500">
                              {plate.emirate}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {plate.country}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {plate.type === 'PERSONAL' ? 'Resident' : 'Guest'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                              ${plate.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                                plate.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                                plate.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'}`}
                            >
                              {plate.status === 'APPROVED' ? 'Approved' : 
                               plate.status === 'REJECTED' ? 'Rejected' : 
                               plate.status === 'EXPIRED' ? 'Expired' :
                               'Pending'}
                            </span>
                            {plate.type === 'GUEST' && plate.status === 'APPROVED' && plate.expiresAt && (
                              <span className="text-xs text-gray-500 mt-1">
                                Expires: {format(new Date(plate.expiresAt), 'MMM dd, yyyy HH:mm')}
                              </span>
                            )}
                            {plate.type === 'GUEST' && plate.status === 'EXPIRED' && plate.expiresAt && (
                              <span className="text-xs text-red-500 mt-1">
                                Expired: {format(new Date(plate.expiresAt), 'MMM dd, yyyy HH:mm')}
                              </span>
                            )}
                            {plate.status === 'APPROVED' && plate.approvedBy && (
                              <span className="text-xs text-gray-500 mt-1">
                                Approved by: {plate.approvedBy.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {plate.documents.length > 0 ? (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await apiClient.rawRequest({
                                    url: plate.documents[0].url,
                                    method: 'GET',
                                    responseType: 'blob',
                                  });
                                  
                                  const blob = new Blob([response.data as BlobPart], { 
                                    type: response.headers['content-type'] || 'application/octet-stream' 
                                  });
                                  const url = window.URL.createObjectURL(blob);
                                  const newWindow = window.open(url, '_blank');
                                  
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
                              className="text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              View Document
                            </button>
                          ) : (
                            <span className="text-gray-400">No Document</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => confirmRemove(plate.id)}
                            disabled={deletingPlates.has(plate.id)}
                            className="inline-flex items-center text-red-600 hover:text-red-800 font-medium"
                          >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Remove Plate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Entry History Section */}
          {activeTab === 'history' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {fullHistoryLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : fullHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No history found</p>
                </div>
              ) : (
                <>
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {fullHistory.map((entry: Entry) => (
                        <li key={entry.id}>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
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
                                    {entry.plate.country}
                                  </div>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 sm:text-right">
                                {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pagination Controls */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={!pagination.hasPrevPage}
                          className="relative inline-flex items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                          className="ml-3 relative inline-flex items-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">
                              {(currentPage - 1) * pagination.limit + 1}
                            </span>{' '}
                            to{' '}
                            <span className="font-medium">
                              {Math.min(currentPage * pagination.limit, pagination.totalCount)}
                            </span>{' '}
                            of <span className="font-medium">{pagination.totalCount}</span> results
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            {/* Previous button */}
                            <button
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={!pagination.hasPrevPage}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Previous</span>
                              ←
                            </button>
                            
                            {/* Page numbers */}
                            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                              const pageNum = i + 1;
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                    pageNum === currentPage
                                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                            
                            {/* Next button */}
                            <button
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={!pagination.hasNextPage}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="sr-only">Next</span>
                              →
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Recent History Section */}
          {activeTab === 'plates' && history.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 space-y-2 sm:space-y-0">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                <button
                  onClick={() => handleTabChange('history')}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  View all →
                </button>
              </div>
              <div className="bg-white shadow rounded-lg">
                <ul className="divide-y divide-gray-200">
                  {history.slice(0, 5).map((entry: Entry) => (
                    <li key={entry.id} className="px-4 sm:px-6 py-4">
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
                              {entry.plate.country}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Desktop */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">Confirm Removal</h3>
                </div>
              </div>
              <button
                onClick={cancelRemove}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {(() => {
                const plateToRemove = plates.find(plate => plate.id === showConfirmation);
                return (
                  <p className="text-sm text-gray-700 mb-6">
                    Are you sure you want to remove <span className="font-semibold">{plateToRemove?.plateCode} {plateToRemove?.plateNumber}</span>? 
                    This action cannot be undone.
                  </p>
                );
              })()}
              <div className="flex space-x-3 justify-end">
                <button
                  onClick={cancelRemove}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemovePlate(showConfirmation)}
                  disabled={deletingPlates.has(showConfirmation)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deletingPlates.has(showConfirmation) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Removing...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Remove Plate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 