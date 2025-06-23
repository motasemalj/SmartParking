'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import AdminNav from '../components/AdminNav';
import { apiClient } from '@/lib/api-client';
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
  dailyTotals: Array<{
    date: string;
    entries: number;
    activities: number;
    temporaryAccess: number;
  }>;
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('5days'); // '5days', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Compute totals for daily statistics (today only) using useMemo for reactivity
  const todayStats = useMemo(() => {
    let totalEntries = 0;
    let totalActivities = 0;
    let totalTemporaryAccess = 0;
    
    if (reportData && Array.isArray(reportData.dailyTotals)) {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Find today's data
      const todayData = reportData.dailyTotals.find(day => day.date === today);
      
      console.log('Today\'s date:', today);
      console.log('Today\'s data:', todayData);
      console.log('All daily totals:', reportData.dailyTotals);
      
      if (todayData) {
        totalEntries = todayData.entries || 0;
        totalActivities = todayData.activities || 0;
        totalTemporaryAccess = todayData.temporaryAccess || 0;
      }
    }
    
    return { totalEntries, totalActivities, totalTemporaryAccess };
  }, [reportData]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchReportData = async (isInitialFetch = false) => {
      try {
        if (isInitialFetch) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }
        setError(null);

        console.log('Fetching report data...');
        const response = await apiClient.get<ReportData>('/api/admin/reports');
        console.log('Report data response:', response);
        console.log('Daily totals:', response.dailyTotals);
        console.log('Recent activity:', response.recentActivity);
        console.log('Daily totals length:', response.dailyTotals?.length);
        console.log('Recent activity length:', response.recentActivity?.length);

        setReportData(response);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        console.error('Error fetching report data:', error.response?.data || error.message);
        setError(error.response?.data?.message || 'Failed to fetch report data');
      } finally {
        if (isInitialFetch) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    };

    if (status === 'authenticated') {
      // Initial fetch
      fetchReportData(true);

      // Set up polling every 5 seconds for background updates
      const interval = setInterval(() => fetchReportData(false), 5000);
      
      // Cleanup interval on unmount
      return () => clearInterval(interval);
    }
  }, [session, status, router]);

  // Set default dates for custom date range
  useEffect(() => {
    if (dateRange === 'custom' && !startDate && !endDate) {
      const today = new Date();
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      setEndDate(today.toISOString().split('T')[0]);
      setStartDate(fiveDaysAgo.toISOString().split('T')[0]);
    }
  }, [dateRange, startDate, endDate]);

  if (status === 'unauthenticated') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    View system statistics and activity reports
                  </p>
                </div>
                {isRefreshing && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span>Updating...</span>
                  </div>
                )}
              </div>
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    View system statistics and activity reports
                  </p>
                </div>
                {isRefreshing && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span>Updating...</span>
                  </div>
                )}
              </div>
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

  // Filter daily totals based on date range
  const getFilteredDailyTotals = () => {
    if (!reportData || !Array.isArray(reportData.dailyTotals)) {
      return [];
    }

    let filteredData = [...reportData.dailyTotals];

    if (dateRange === '5days') {
      // Get last 5 days
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];
      
      filteredData = filteredData.filter(day => day.date >= fiveDaysAgoStr);
    } else if (dateRange === 'custom' && startDate && endDate) {
      // Custom date range
      filteredData = filteredData.filter(day => 
        day.date >= startDate && day.date <= endDate
      );
    }

    // Sort by date (newest first)
    return filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredDailyTotals = getFilteredDailyTotals();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
                <p className="mt-1 text-sm text-gray-500">
                  View system statistics and activity reports
                </p>
              </div>
              {isRefreshing && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span>Updating...</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <AdminNav />
          </div>

          {reportData && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-200 ${isRefreshing ? 'ring-1 ring-blue-200' : ''}`}>
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

                <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-200 ${isRefreshing ? 'ring-1 ring-blue-200' : ''}`}>
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

                <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-200 ${isRefreshing ? 'ring-1 ring-blue-200' : ''}`}>
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

                <div className={`bg-white overflow-hidden shadow rounded-lg transition-all duration-200 ${isRefreshing ? 'ring-1 ring-blue-200' : ''}`}>
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
                    Today&apos;s Statistics
                  </h3>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-blue-800">
                        Today&apos;s Entries
                      </div>
                      <div className="mt-1 text-3xl font-semibold text-gray-900">
                        {todayStats.totalEntries}
                      </div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-green-800">
                        Today&apos;s Activities
                      </div>
                      <div className="mt-1 text-3xl font-semibold text-gray-900">
                        {todayStats.totalActivities}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="text-sm font-medium text-purple-800">
                        Today&apos;s Temporary Access
                      </div>
                      <div className="mt-1 text-3xl font-semibold text-gray-900">
                        {todayStats.totalTemporaryAccess}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Entries Per Day History */}
              {Array.isArray(reportData.dailyTotals) && (
                <div className="bg-white shadow rounded-lg mb-8">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Total Entries Per Day
                      </h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm font-medium text-gray-700">Date Range:</label>
                          <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                          >
                            <option value="5days" className="text-gray-900 bg-white">Last 5 Days</option>
                            <option value="custom" className="text-gray-900 bg-white">Custom Range</option>
                          </select>
                        </div>
                        
                        {dateRange === 'custom' && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                            />
                            <span className="text-sm text-gray-500">to</span>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Entries
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Activities
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Temporary Access
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredDailyTotals.map((day, idx) => (
                            <tr key={day.date || idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {day.date ? format(new Date(day.date), 'MMM dd, yyyy') : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {day.entries ?? 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {day.activities ?? 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {day.temporaryAccess ?? 0}
                              </td>
                            </tr>
                          ))}
                          {filteredDailyTotals.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                No data available for the selected date range
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className={`bg-white shadow rounded-lg transition-all duration-200 ${isRefreshing ? 'ring-1 ring-blue-200' : ''}`}>
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