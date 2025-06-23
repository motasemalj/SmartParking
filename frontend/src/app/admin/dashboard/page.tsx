'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminNav from '../components/AdminNav';
import { apiClient } from '@/lib/api-client';
import {
  UsersIcon,
  DocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import useSWR from 'swr';

interface Stats {
  totalUsers: number;
  pendingPlates: number;
  totalEntries: number;
  rejectedPlates: number;
  userStats: {
    total: number;
    residents: number;
    security: number;
    admins: number;
  };
  plateStats: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}

interface User {
  id: string;
  name: string;
  phoneNumber: string;
  homeNumber: string;
  userType: 'RESIDENT' | 'SECURITY' | 'ADMIN';
  createdAt: string;
}

const fetcher = (url: string, token: string) =>
  apiClient.get(url, { headers: { Authorization: `Bearer ${token}` } });

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
    mutate: mutateStats
  } = useSWR(
    status === 'authenticated' && session?.accessToken ? ['/api/admin/stats', session.accessToken] : null,
    ([url, token]) => fetcher(url, token),
    { refreshInterval: 5000 }
  );

  const {
    data: users,
    error: usersError,
    isLoading: usersLoading,
    mutate: mutateUsers
  } = useSWR(
    status === 'authenticated' && session?.accessToken ? ['/api/admin/users', session.accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  const statsTyped = (Array.isArray(stats) ? undefined : stats) as Stats;
  const usersTyped = Array.isArray(users) ? users : (users as User[]);

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  if (statsLoading || usersLoading) {
    return <div>Loading...</div>;
  }

  if (statsError || usersError) {
    return <div>Error: {statsError?.message || usersError?.message || 'Failed to fetch data'}</div>;
  }

  const handleUpdateUserType = async (userId: string, newType: User['userType']) => {
    try {
      await apiClient.patch(`/api/admin/users/${userId}`, { userType: newType });
      mutateUsers();
    } catch (err: any) {
      console.error('Error updating user type:', err.response?.data || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage users and view system statistics
            </p>
          </div>

          <div className="mb-6">
            <AdminNav />
          </div>

          {statsTyped && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UsersIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Users
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {statsTyped.userStats.total}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DocumentCheckIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Pending Plates
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {statsTyped.plateStats.pending}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Entries
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {statsTyped.totalEntries}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Rejected Plates
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {statsTyped.rejectedPlates}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Users
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Manage user accounts and permissions
                  </p>
                </div>
                <div className="border-t border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Set As
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usersTyped.map((user: User) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {user.phoneNumber}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.homeNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {/* Current type icon and label */}
                              {user.userType === 'RESIDENT' && (
                                <span title="Resident" className="flex items-center space-x-1">
                                  <UsersIcon className="h-6 w-6 text-green-600" />
                                  <span className="text-green-700 font-semibold text-xs">Resident</span>
                                </span>
                              )}
                              {user.userType === 'SECURITY' && (
                                <span title="Security" className="flex items-center space-x-1">
                                  <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                                  <span className="text-blue-700 font-semibold text-xs">Security</span>
                                </span>
                              )}
                              {user.userType === 'ADMIN' && (
                                <span title="Admin" className="flex items-center space-x-1">
                                  <StarIcon className="h-6 w-6 text-purple-600" />
                                  <span className="text-purple-700 font-semibold text-xs">Admin</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              {user.userType !== 'ADMIN' && (
                                <button
                                  onClick={() => handleUpdateUserType(user.id, user.userType === 'RESIDENT' ? 'SECURITY' : 'RESIDENT')}
                                  className="flex items-center space-x-1 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  title={`Set as ${user.userType === 'RESIDENT' ? 'Security' : 'Resident'}`}
                                >
                                  {user.userType === 'RESIDENT' ? (
                                    <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                                  ) : (
                                    <UsersIcon className="h-5 w-5 text-green-500" />
                                  )}
                                  <span className={
                                    user.userType === 'RESIDENT'
                                      ? 'text-blue-600 font-semibold text-xs'
                                      : 'text-green-600 font-semibold text-xs'
                                  }>
                                    {user.userType === 'RESIDENT' ? 'Security' : 'Resident'}
                                  </span>
                                </button>
                              )}
                              {user.userType === 'ADMIN' && (
                                <span className="text-xs text-gray-500 italic">Admin (cannot change)</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 