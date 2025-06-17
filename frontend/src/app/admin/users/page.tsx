'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdminNav from '../components/AdminNav';

interface User {
  id: string;
  name: string;
  phoneNumber: string;
  homeNumber: string;
  userType: 'RESIDENT' | 'SECURITY' | 'ADMIN';
  createdAt: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!session?.accessToken) {
          console.error('No access token found in session');
          setError('Authentication required');
          return;
        }

        console.log('Fetching users with token:', session.accessToken);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        );
        console.log('Users response:', response.data);
        setUsers(response.data);
      } catch (err: any) {
        console.error('Error fetching users:', err.response?.data || err.message);
        setError(err.response?.data?.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    if (session?.accessToken) {
      fetchUsers();
    }
  }, [session, status, router]);

  const handleUpdateUserType = async (userId: string, newType: User['userType']) => {
    try {
      if (!session?.accessToken) {
        console.error('No access token found in session');
        return;
      }

      console.log('Updating user type with token:', session.accessToken);
      const response = await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`,
        { userType: newType },
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );
      console.log('Update response:', response.data);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, userType: newType } : user
        )
      );
    } catch (err: any) {
      console.error('Error updating user type:', err.response?.data || err.message);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.includes(searchTerm) ||
      user.homeNumber.includes(searchTerm)
  );

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage user accounts and permissions
            </p>
          </div>

          <div className="mb-6">
            <AdminNav />
          </div>

          <div className="mb-6">
            <div className="max-w-lg">
              <label htmlFor="search" className="sr-only">
                Search users
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
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
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.userType === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : user.userType === 'SECURITY'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {user.userType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <select
                          value={user.userType}
                          onChange={(e) =>
                            handleUpdateUserType(
                              user.id,
                              e.target.value as User['userType']
                            )
                          }
                          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="RESIDENT">Resident</option>
                          <option value="SECURITY">Security</option>
                          <option value="ADMIN">Admin</option>
                        </select>
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