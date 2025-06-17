'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminNav from '../components/AdminNav';
import { format } from 'date-fns';
import { UsersIcon, DocumentCheckIcon, ClockIcon, ExclamationTriangleIcon, ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

interface ReportData {
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
  totalEntries: number;
  rejectedPlates: number;
  dailyTotals: {
    entries: number;
    activities: number;
    temporaryAccess: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'ENTRY' | 'EXIT' | 'PLATE_APPROVED' | 'PLATE_REJECTED';
    timestamp: string;
    plateNumber: string;
  }>;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!session?.accessToken) {
          console.error('No access token found in session');
          setError('Authentication required');
          return;
        }

        console.log('Fetching report data with token:', session.accessToken);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/reports`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        );
        console.log('Report data response:', response.data);

        setReportData(response.data);
      } catch (err: any) {
        console.error('Error fetching report data:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to fetch report data');
      } finally {
        setLoading(false);
      }
    };

    if (session?.accessToken) {
      fetchReportData();
    }
  }, [session, status, router]);

  if (status === 'unauthenticated') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
              <p className="mt-1 text-sm text-gray-500">
                View system statistics and activity reports
              </p>
            </div>
            <div className="mb-6">
              <AdminNav />
            </div>
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
              <p className="mt-1 text-sm text-gray-500">
                View system statistics and activity reports
              </p>
            </div>
            <div className="mb-6">
              <AdminNav />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compute totals for daily statistics
  let totalEntries = 0;
  let totalActivities = 0;
  let totalTemporaryAccess = 0;
  if (reportData) {
    if (Array.isArray(reportData.dailyTotals)) {
      totalEntries = reportData.dailyTotals.reduce((sum, day) => sum + (day.entries || 0), 0);
      totalActivities = reportData.dailyTotals.reduce((sum, day) => sum + (day.activities || 0), 0);
      totalTemporaryAccess = reportData.dailyTotals.reduce((sum, day) => sum + (day.temporaryAccess || 0), 0);
    } else {
      totalEntries = reportData.dailyTotals?.entries || 0;
      totalActivities = reportData.dailyTotals?.activities || 0;
      totalTemporaryAccess = reportData.dailyTotals?.temporaryAccess || 0;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              View system statistics and activity reports
            </p>
          </div>

          <div className="mb-6">
            <AdminNav />
          </div>

          {reportData && (
            <>
              {/* Stats Overview */}
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
                            {reportData.userStats?.total || 0}
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
                            Total Plates
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {reportData.plateStats?.total || 0}
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
                            {reportData.totalEntries || 0}
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
                            {reportData.rejectedPlates || 0}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Statistics */}
              <div className="bg-white shadow rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Daily Statistics
                  </h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-blue-800">
                        Daily Entries
                      </div>
                      <div className="mt-1 text-3xl font-semibold text-gray-900">
                        {totalEntries}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-green-800">
                        Daily Activities
                      </div>
                      <div className="mt-1 text-3xl font-semibold text-gray-900">
                        {totalActivities}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-purple-800">
                        Daily Temporary Access
                      </div>
                      <div className="mt-1 text-3xl font-semibold text-gray-900">
                        {totalTemporaryAccess}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Entries Per Day History */}
              {Array.isArray(reportData.dailyTotals) && (
                <div className="bg-white shadow rounded-lg mb-8">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      Total Entries Per Day
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Entries
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.dailyTotals.map((day, idx) => (
                            <tr key={day.date || idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {day.date ? format(new Date(day.date), 'yyyy-MM-dd') : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {day.entries ?? 0}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {reportData.recentActivity?.map((activity, index) => (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {index !== reportData.recentActivity.length - 1 && (
                              <span
                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            )}
                            <div className="relative flex space-x-3">
                              <div>
                                <span
                                  className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                    activity.type === 'ENTRY'
                                      ? 'bg-green-500'
                                      : activity.type === 'EXIT'
                                      ? 'bg-blue-500'
                                      : 'bg-purple-500'
                                  }`}
                                >
                                  {activity.type === 'ENTRY' ? (
                                    <ArrowDownIcon className="h-5 w-5 text-white" />
                                  ) : activity.type === 'EXIT' ? (
                                    <ArrowUpIcon className="h-5 w-5 text-white" />
                                  ) : (
                                    <ClockIcon className="h-5 w-5 text-white" />
                                  )}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                <div>
                                  <p className="text-sm text-gray-500">
                                    {activity.type === 'ENTRY'
                                      ? 'Vehicle entered'
                                      : activity.type === 'EXIT'
                                      ? 'Vehicle exited'
                                      : 'Temporary access granted'}{' '}
                                    <span className="font-medium text-gray-900">
                                      {activity.plateNumber}
                                    </span>
                                  </p>
                                </div>
                                <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                  <time dateTime={activity.timestamp}>
                                    {new Date(activity.timestamp).toLocaleString()}
                                  </time>
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 