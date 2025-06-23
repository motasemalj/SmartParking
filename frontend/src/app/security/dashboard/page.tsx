'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import SecurityNav from '../components/SecurityNav';
import { format } from 'date-fns';
import { CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
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
  createdAt: string;
  updatedAt: string;
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

interface TemporaryAccess {
  id: string;
  plateCode: string;
  plateNumber: string;
  country: string;
  emirate?: string;
  purpose: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED';
  createdBy: {
    name: string;
  };
}

const fetcher = (url: string, token: string) =>
  apiClient.get(url, { headers: { Authorization: `Bearer ${token}` } });

export default function SecurityDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'plates' | 'temporary'>('plates');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'>('PENDING');
  const [plates, setPlates] = useState<Plate[]>([]);
  const [temporaryAccess, setTemporaryAccess] = useState<TemporaryAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [securityUsers, setSecurityUsers] = useState<SecurityUser[]>([]);
  const [selectedSecurity, setSelectedSecurity] = useState<string>('');
  
  // Temporary access form state
  const [tempPlateCode, setTempPlateCode] = useState('');
  const [tempPlateNumber, setTempPlateNumber] = useState('');
  const [tempCountry, setTempCountry] = useState('UAE');
  const [tempEmirate, setTempEmirate] = useState('');
  const [tempExpiresAt, setTempExpiresAt] = useState('');
  const [tempPurpose, setTempPurpose] = useState('');
  const [tempLoading, setTempLoading] = useState(false);
  
  // New state for duration selection
  const [durationType, setDurationType] = useState<'preset' | 'custom'>('preset');
  const [presetDuration, setPresetDuration] = useState('2'); // hours
  const [customDateTime, setCustomDateTime] = useState('');
  
  // New state for custom date/time selection
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  
  // State for tracking force expire loading
  const [forceExpiringIds, setForceExpiringIds] = useState<Set<string>>(new Set());
  
  // State for tracking approve/reject loading
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());

  const {
    data: platesData,
    error: platesError,
    isLoading: platesLoading,
    mutate: mutatePlates
  } = useSWR(
    status === 'authenticated' && session?.accessToken ? ['/api/security/plates', session.accessToken] : null,
    ([url, token]) => fetcher(url, token),
    { refreshInterval: 5000 }
  );

  const {
    data: tempAccessData,
    error: tempAccessError,
    isLoading: tempAccessLoading,
    mutate: mutateTempAccess
  } = useSWR(
    status === 'authenticated' && session?.accessToken ? ['/api/security/temporary-access', session.accessToken] : null,
    ([url, token]) => fetcher(url, token),
    { refreshInterval: 5000 }
  );

  const {
    data: securityUsersData,
    error: securityUsersError,
    isLoading: securityUsersLoading,
    mutate: mutateSecurityUsers
  } = useSWR(
    status === 'authenticated' && session?.accessToken ? ['/api/security/users', session.accessToken] : null,
    ([url, token]) => fetcher(url, token)
  );

  const platesTyped = Array.isArray(platesData) ? platesData : (platesData as Plate[]);
  const tempAccessTyped = Array.isArray(tempAccessData) ? tempAccessData : (tempAccessData as TemporaryAccess[]);
  const securityUsersTyped = Array.isArray(securityUsersData) ? securityUsersData : (securityUsersData as SecurityUser[]);

  // Auto-fade success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 5000); // Auto-fade after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-fade error messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 8000); // Auto-fade after 8 seconds

      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchPlates();
      fetchTemporaryAccess();
      fetchSecurityUsers();
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      const fetchDataPolling = async () => {
        try {
          const [platesResponse, tempAccessResponse] = await Promise.all([
            apiClient.get<Plate[]>('/api/security/plates'),
            apiClient.get<TemporaryAccess[]>('/api/security/temporary-access')
          ]);
          setPlates(platesResponse);
          setTemporaryAccess(tempAccessResponse);
        } catch (error: any) {
          setError(error.response?.data?.message || 'Failed to fetch data');
        } finally {
          setLoading(false);
        }
      };
      fetchDataPolling();
      const interval = setInterval(fetchDataPolling, 5000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const fetchSecurityUsers = async () => {
    try {
      const response = await apiClient.get<SecurityUser[]>('/api/security/users');
      setSecurityUsers(response);
      if (response.length > 0) {
        setSelectedSecurity(response[0].id);
      }
    } catch (error) {
      console.error('Error fetching security users:', error);
    }
  };

  const fetchPlates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<Plate[]>('/api/security/plates');
      setPlates(response);
    } catch (error: any) {
      console.error('Error fetching plates:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch plates');
    } finally {
      setLoading(false);
    }
  };

  // Background refresh function that doesn't set loading state
  const refreshPlates = async () => {
    try {
      const response = await apiClient.get<Plate[]>('/api/security/plates');
      setPlates(response);
    } catch (error: any) {
      console.error('Error refreshing plates:', error.response?.data || error.message);
    }
  };

  const fetchTemporaryAccess = async () => {
    try {
      const response = await apiClient.get<TemporaryAccess[]>('/api/security/temporary-access');
      setTemporaryAccess(response);
    } catch (error: any) {
      console.error('Error fetching temporary access:', error.response?.data || error.message);
    }
  };

  const handleCreateTemporaryAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setTempLoading(true);
    setError(null);
    setSuccess(null);

    // Validate duration selection
    if (durationType === 'custom' && !customDateTime) {
      setError('Please select a date and time');
      setTempLoading(false);
      return;
    }

    if (durationType === 'custom') {
      const selectedDateTime = new Date(customDateTime);
      const now = new Date();
      
      if (selectedDateTime <= now) {
        setError('Selected date and time must be in the future');
        setTempLoading(false);
        return;
      }
    }

    try {
      await apiClient.post('/api/security/temporary-access', {
        plateCode: tempPlateCode,
        plateNumber: tempPlateNumber,
        country: tempCountry,
        emirate: tempCountry === 'UAE' ? tempEmirate : undefined,
        purpose: tempPurpose,
        expiresAt: new Date(calculateExpirationTime()).toISOString(),
      });

      setSuccess('Temporary plate access created successfully');
      setTempPlateCode('');
      setTempPlateNumber('');
      setTempCountry('UAE');
      setTempEmirate('');
      setTempPurpose('');
      setDurationType('preset');
      setPresetDuration('2');
      setCustomDateTime('');
      fetchTemporaryAccess();
    } catch (err: any) {
      console.error('Error creating temporary access:', err);
      setError(err.response?.data?.message || 'Failed to create temporary access');
    } finally {
      setTempLoading(false);
    }
  };

  const handleForceExpire = async (accessId: string) => {
    try {
      // Add to loading set
      setForceExpiringIds(prev => new Set(prev).add(accessId));

      await apiClient.put(`/api/security/temporary-access/${accessId}/force-expire`);

      setSuccess('Temporary access expired successfully');
      fetchTemporaryAccess();
    } catch (err: any) {
      console.error('Error force expiring temporary access:', err);
      setError(err.response?.data?.message || 'Failed to expire temporary access');
    } finally {
      // Remove from loading set
      setForceExpiringIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(accessId);
        return newSet;
      });
    }
  };

  const handleApprove = async (plateId: string) => {
    try {
      if (!selectedSecurity) {
        setError('Please select a security officer');
        return;
      }

      // Add to loading set
      setApprovingIds(prev => new Set(prev).add(plateId));

      await apiClient.post(`/api/security/plates/${plateId}/approve`, { 
        securityId: selectedSecurity 
      });
      
      setSuccess('Plate approved successfully');
      refreshPlates();
    } catch (err: any) {
      console.error('Error approving plate:', err);
      setError(err.response?.data?.message || 'Failed to approve plate');
    } finally {
      // Remove from loading set
      setApprovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(plateId);
        return newSet;
      });
    }
  };

  const handleReject = async (plateId: string) => {
    try {
      if (!selectedSecurity) {
        setError('Please select a security officer');
        return;
      }

      // Add to loading set
      setRejectingIds(prev => new Set(prev).add(plateId));

      await apiClient.post(`/api/security/plates/${plateId}/reject`, { 
        securityId: selectedSecurity 
      });
      
      setSuccess('Plate rejected successfully');
      refreshPlates();
    } catch (err: any) {
      console.error('Error rejecting plate:', err);
      setError(err.response?.data?.message || 'Failed to reject plate');
    } finally {
      // Remove from loading set
      setRejectingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(plateId);
        return newSet;
      });
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await apiClient.rawRequest({
        url: '/api/security/report',
        method: 'GET',
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data as BlobPart], { type: response.headers['content-type'] || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const filteredPlates = plates.filter(plate => {
    if (filter === 'ALL') return true;
    return plate.status === filter;
  });

  // Countdown timer component
  const CountdownTimer = ({ expiresAt, status }: { expiresAt: string; status: string }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      // If status is EXPIRED, stop the timer immediately
      if (status === 'EXPIRED') {
        setTimeLeft('Expired');
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      const calculateTimeLeft = () => {
        const now = new Date().getTime();
        const expiry = new Date(expiresAt).getTime();
        const difference = expiry - now;

        if (difference <= 0) {
          setTimeLeft('Expired');
          // Clear the interval when expired
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      };

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Initial calculation
      calculateTimeLeft();

      // Only start the timer if not already expired
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      if (expiry > now) {
        timerRef.current = setInterval(calculateTimeLeft, 1000);
      }

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [expiresAt, status]);

    return (
      <span className={`text-xs font-medium ${
        timeLeft === 'Expired' ? 'text-red-600' : 'text-gray-600'
      }`}>
        {timeLeft}
      </span>
    );
  };

  // Function to calculate expiration time based on duration
  const calculateExpirationTime = () => {
    if (durationType === 'preset') {
      const hours = parseInt(presetDuration);
      return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    } else {
      // customDateTime is in 'YYYY-MM-DDTHH:mm' format (local time)
      // Convert to ISO string in local time
      if (!customDateTime) return '';
      const localDate = new Date(customDateTime);
      return localDate.toISOString();
    }
  };

  // Function to get minimum datetime (current time + 1 hour)
  const getMinDateTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1); // Minimum 1 hour from now
    return now.toISOString().slice(0, 16);
  };

  // Function to format the selected datetime for display
  const formatSelectedDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    try {
      return new Date(dateTimeString).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return '';
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (platesLoading || tempAccessLoading || securityUsersLoading) {
    return <div>Loading...</div>;
  }

  if (platesError || tempAccessError || securityUsersError) {
    return <div>Error: {platesError?.message || tempAccessError?.message || securityUsersError?.message || 'Failed to fetch data'}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <SecurityNav />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Security Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage plate requests and temporary access
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedSecurity}
                onChange={(e) => setSelectedSecurity(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 bg-white"
              >
                {securityUsers.map((user) => (
                  <option key={user.id} value={user.id} className="text-gray-900 bg-white">
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

          {/* Tab Navigation */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('plates')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'plates'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Plate Requests ({plates.length})
              </button>
              <button
                onClick={() => setActiveTab('temporary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'temporary'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Temporary Access ({temporaryAccess.length})
              </button>
            </nav>
          </div>

          {activeTab === 'plates' && (
            <>
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
                  <button
                    onClick={() => setFilter('EXPIRED')}
                    className={`px-4 py-2 rounded-md ${
                      filter === 'EXPIRED'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Expired
                  </button>
                </div>
              </div>

              {/* Success/Error Messages - Always show above table */}
              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded transition-opacity duration-500 ease-in-out">
                  {success}
                </div>
              )}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded transition-opacity duration-500 ease-in-out">
                  {error}
                </div>
              )}

              {/* Table - Always show */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                {!loading && (
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
                          Document
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
                              {plate.country === 'UAE' && plate.emirate && (
                                <span> • {plate.emirate}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{plate.user.name}</div>
                            <div className="text-sm text-gray-500">{plate.user.homeNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  plate.status === 'APPROVED'
                                    ? 'bg-green-100 text-green-800'
                                    : plate.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-800'
                                    : plate.status === 'EXPIRED'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {plate.status}
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
                                    
                                    // Create a blob URL and open it in a new tab
                                    const blob = new Blob([response.data as BlobPart], { 
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
                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                              >
                                View Document
                              </button>
                            ) : (
                              <span className="text-gray-400">No Document</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(plate.createdAt), 'PPp')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {plate.status !== 'EXPIRED' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleApprove(plate.id)}
                                  disabled={approvingIds.has(plate.id) || rejectingIds.has(plate.id)}
                                  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors duration-200 bg-green-100 text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                                  title={'Approve plate request'}
                                >
                                  {approvingIds.has(plate.id) ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Approving...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReject(plate.id)}
                                  disabled={approvingIds.has(plate.id) || rejectingIds.has(plate.id)}
                                  className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors duration-200 bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                                  title={'Reject plate request'}
                                >
                                  {rejectingIds.has(plate.id) ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Rejecting...
                                    </>
                                  ) : (
                                    <>
                                      <XCircleIcon className="h-3 w-3 mr-1" />
                                      Reject
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {activeTab === 'temporary' && (
            <div className="space-y-6">
              {/* Success/Error Messages */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded transition-opacity duration-500 ease-in-out">
                  {success}
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded transition-opacity duration-500 ease-in-out">
                  {error}
                </div>
              )}

              {/* Create Temporary Access Form */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Create Temporary Plate Access
                  </h3>
                  <form onSubmit={handleCreateTemporaryAccess} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="tempPlateCode" className="block text-sm font-medium text-gray-700">
                          Plate Code
                        </label>
                        <input
                          type="text"
                          id="tempPlateCode"
                          value={tempPlateCode}
                          onChange={(e) => setTempPlateCode(e.target.value.toUpperCase())}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                          required
                          maxLength={3}
                        />
                      </div>
                      <div>
                        <label htmlFor="tempPlateNumber" className="block text-sm font-medium text-gray-700">
                          Plate Number
                        </label>
                        <input
                          type="text"
                          id="tempPlateNumber"
                          value={tempPlateNumber}
                          onChange={(e) => setTempPlateNumber(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                          required
                          maxLength={5}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="tempCountry" className="block text-sm font-medium text-gray-700">
                          Country
                        </label>
                        <select
                          id="tempCountry"
                          value={tempCountry}
                          onChange={(e) => setTempCountry(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white"
                        >
                          <option value="UAE" className="text-gray-900 bg-white">UAE</option>
                          <option value="KSA" className="text-gray-900 bg-white">Saudi Arabia</option>
                          <option value="OTHER" className="text-gray-900 bg-white">Other</option>
                        </select>
                      </div>
                      {tempCountry === 'UAE' && (
                        <div>
                          <label htmlFor="tempEmirate" className="block text-sm font-medium text-gray-700">
                            Emirate
                          </label>
                          <select
                            id="tempEmirate"
                            value={tempEmirate}
                            onChange={(e) => setTempEmirate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white"
                            required
                          >
                            <option value="" className="text-gray-900 bg-white">Select Emirate</option>
                            <option value="ABU DHABI" className="text-gray-900 bg-white">Abu Dhabi</option>
                            <option value="DUBAI" className="text-gray-900 bg-white">Dubai</option>
                            <option value="SHARJAH" className="text-gray-900 bg-white">Sharjah</option>
                            <option value="AJMAN" className="text-gray-900 bg-white">Ajman</option>
                            <option value="UMM AL QUWAIN" className="text-gray-900 bg-white">Umm Al Quwain</option>
                            <option value="RAS AL KHAIMAH" className="text-gray-900 bg-white">Ras Al Khaimah</option>
                            <option value="FUJAIRAH" className="text-gray-900 bg-white">Fujairah</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div>
                      <label htmlFor="tempPurpose" className="block text-sm font-medium text-gray-700">
                        Purpose
                      </label>
                      <textarea
                        id="tempPurpose"
                        value={tempPurpose}
                        onChange={(e) => setTempPurpose(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Access Duration
                      </label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="durationType"
                              value="preset"
                              checked={durationType === 'preset'}
                              onChange={(e) => setDurationType(e.target.value as 'preset' | 'custom')}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Quick Duration</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="durationType"
                              value="custom"
                              checked={durationType === 'custom'}
                              onChange={(e) => setDurationType(e.target.value as 'preset' | 'custom')}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Custom Date & Time</span>
                          </label>
                        </div>
                        
                        {durationType === 'preset' && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Expires in:</span>
                            <select
                              value={presetDuration}
                              onChange={(e) => setPresetDuration(e.target.value)}
                              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 bg-white"
                            >
                              <option value="1" className="text-gray-900 bg-white">1 hour</option>
                              <option value="2" className="text-gray-900 bg-white">2 hours</option>
                              <option value="4" className="text-gray-900 bg-white">4 hours</option>
                              <option value="8" className="text-gray-900 bg-white">8 hours</option>
                              <option value="12" className="text-gray-900 bg-white">12 hours</option>
                              <option value="24" className="text-gray-900 bg-white">24 hours</option>
                              <option value="48" className="text-gray-900 bg-white">48 hours</option>
                              <option value="72" className="text-gray-900 bg-white">3 days</option>
                            </select>
                            <span className="text-sm text-gray-500">
                              (Expires: {presetDuration && new Date(Date.now() + parseInt(presetDuration) * 60 * 60 * 1000).toLocaleString()})
                            </span>
                          </div>
                        )}
                        
                        {durationType === 'custom' && (
                          <div className="space-y-3">
                            <div className="relative">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Date & Time
                              </label>
                              <div className="relative">
                                <input
                                  type="datetime-local"
                                  value={customDateTime}
                                  onChange={(e) => setCustomDateTime(e.target.value)}
                                  min={getMinDateTime()}
                                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm text-gray-900 bg-white px-4 py-3 pr-10 transition-all duration-200 hover:border-gray-400 focus:shadow-lg"
                                  required={durationType === 'custom'}
                                  placeholder="Select date and time"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              </div>
                              {customDateTime && (
                                <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                  <div className="flex items-center space-x-2">
                                    <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm font-medium text-indigo-900">
                                      Access will expire: {formatSelectedDateTime(customDateTime)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={tempLoading}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {tempLoading ? 'Creating...' : 'Create Temporary Access'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Temporary Access List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Temporary Plate Access Records ({temporaryAccess.length})
                  </h3>
                  <div className="flow-root">
                    <ul className="-my-5 divide-y divide-gray-200">
                      {temporaryAccess.map((access) => (
                        <li key={access.id} className="py-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {access.plateCode} {access.plateNumber}
                              </p>
                              <p className="text-sm text-gray-500">
                                {access.country}
                                {access.emirate && ` • ${access.emirate}`}
                              </p>
                              <p className="text-sm text-gray-500">{access.purpose}</p>
                              <p className="text-sm text-gray-500">
                                Expires: {format(new Date(access.expiresAt), 'PPp')}
                              </p>
                              <p className="text-xs text-gray-400">
                                Created by: {access.createdBy.name}
                              </p>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  access.status === 'ACTIVE'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {access.status}
                              </span>
                              <CountdownTimer expiresAt={access.expiresAt} status={access.status} />
                              {access.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleForceExpire(access.id)}
                                  disabled={forceExpiringIds.has(access.id)}
                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {forceExpiringIds.has(access.id) ? (
                                    <>
                                      <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Expiring...
                                    </>
                                  ) : (
                                    'Force Expire'
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                      {temporaryAccess.length === 0 && (
                        <li className="py-4 text-center text-gray-500">
                          No temporary plate access records found
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 