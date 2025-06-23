'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminNav from '../components/AdminNav';
import CreateUserModal from './components/CreateUserModal';
import ConfirmDialog from './components/ConfirmDialog';
import EditUserModal from './components/EditUserModal';
import { apiClient } from '@/lib/api-client';
import {
  UsersIcon,
  ShieldCheckIcon,
  StarIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingUserChange, setPendingUserChange] = useState<{
    userId: string;
    newType: User['userType'];
    userName: string;
  } | null>(null);
  const [pendingUserDelete, setPendingUserDelete] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<{
    userIds: string[];
    userNames: string[];
  } | null>(null);
  const [deletingUsers, setDeletingUsers] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [changingUserTypes, setChangingUserTypes] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching users...');
      const response = await apiClient.get<User[]>('/api/admin/users');
      console.log('Users response:', response);
      setUsers(response);
    } catch (err: any) {
      console.error('Error fetching users:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [session, status, router]);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber.includes(searchTerm) ||
      user.homeNumber.includes(searchTerm)
  );

  // Update select all when filtered users change
  useEffect(() => {
    const filteredUserIds = new Set(filteredUsers.map(user => user.id));
    const allSelected = filteredUsers.length > 0 && filteredUsers.every(user => selectedUsers.has(user.id));
    setSelectAll(allSelected);
  }, [filteredUsers, selectedUsers]);

  const handleUserTypeChange = (userId: string, newType: User['userType'], userName: string) => {
    setPendingUserChange({ userId, newType, userName });
    setShowConfirmDialog(true);
  };

  const confirmUserTypeChange = async () => {
    if (!pendingUserChange) return;

    try {
      const { userId, newType } = pendingUserChange;
      
      if (!session?.accessToken) {
        console.error('No access token found in session');
        return;
      }

      console.log('Updating user type with token:', session.accessToken);
      const response = await apiClient.patch(`/api/admin/users/${userId}`, { userType: newType });
      console.log('Update response:', response);

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, userType: newType } : user
        )
      );

      setShowConfirmDialog(false);
      setPendingUserChange(null);
    } catch (err: any) {
      console.error('Error updating user type:', err.response?.data || err.message);
      setShowConfirmDialog(false);
      setPendingUserChange(null);
    }
  };

  const handleUserDelete = (userId: string, userName: string) => {
    setPendingUserDelete({ userId, userName });
    setShowConfirmDialog(true);
  };

  const confirmUserDelete = async () => {
    if (!pendingUserDelete) return;

    try {
      const { userId } = pendingUserDelete;
      
      setDeletingUsers(prev => new Set(prev).add(userId));

      console.log('Deleting user...');
      await apiClient.delete(`/api/admin/users/${userId}`);
      console.log('User deleted successfully');

      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.id !== userId)
      );

      setShowConfirmDialog(false);
      setPendingUserDelete(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete user';
      alert(errorMessage);
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(pendingUserDelete?.userId || '');
        return newSet;
      });
      setShowConfirmDialog(false);
      setPendingUserDelete(null);
    }
  };

  const handleBulkDelete = () => {
    const selectedUserIds = Array.from(selectedUsers);
    const selectedUserNames = users
      .filter(user => selectedUserIds.includes(user.id))
      .map(user => user.name);
    
    setPendingBulkDelete({ userIds: selectedUserIds, userNames: selectedUserNames });
    setShowConfirmDialog(true);
  };

  const confirmBulkDelete = async () => {
    if (!pendingBulkDelete) return;

    try {
      const { userIds } = pendingBulkDelete;
      
      setDeletingUsers(prev => new Set([...prev, ...userIds]));

      console.log('Deleting users...', userIds);
      
      // Delete users one by one
      for (const userId of userIds) {
        try {
          await apiClient.delete(`/api/admin/users/${userId}`);
          console.log(`User ${userId} deleted successfully`);
        } catch (err: any) {
          console.error(`Error deleting user ${userId}:`, err);
          const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete user';
          alert(`Error deleting user: ${errorMessage}`);
        }
      }

      // Remove deleted users from state
      setUsers((prevUsers) =>
        prevUsers.filter((user) => !userIds.includes(user.id))
      );

      // Clear selected users
      setSelectedUsers(new Set());

      setShowConfirmDialog(false);
      setPendingBulkDelete(null);
    } catch (err: any) {
      console.error('Error in bulk delete:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete users';
      alert(errorMessage);
    } finally {
      setDeletingUsers(prev => {
        const newSet = new Set(prev);
        pendingBulkDelete?.userIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      setShowConfirmDialog(false);
      setPendingBulkDelete(null);
    }
  };

  const handleUserCreated = () => {
    fetchUsers(); // Refresh the users list
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
    } else {
      const filteredUserIds = new Set(filteredUsers.map(user => user.id));
      setSelectedUsers(filteredUserIds);
    }
  };

  const userTypeCounts = users.reduce((acc, user) => {
    acc[user.userType] = (acc[user.userType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage user accounts and permissions
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedUsers.size === 0 || deletingUsers.size > 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedUsers.size})
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create User
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <AdminNav />
          </div>

          {/* Stats Cards */}
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
                        {users.length}
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
                    <UsersIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Residents
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(user => user.userType === 'RESIDENT').length}
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
                    <ShieldCheckIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Security
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(user => user.userType === 'SECURITY').length}
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
                    <StarIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Admins
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(user => user.userType === 'ADMIN').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
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
                  placeholder="Search users by name, phone, or home number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Users Table */}
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
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new user.'}
              </p>
              {!searchTerm && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create User
                  </button>
                </div>
              )}
            </div>
          ) : (
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectAll}
                              onChange={handleSelectAll}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-white border-2"
                            />
                          </div>
                        </th>
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
                          Edit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Set As
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-white border-2"
                            />
                          </td>
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
                          {/* Edit Button Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.userType !== 'ADMIN' && (
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setShowEditModal(true);
                                }}
                                className="flex items-center space-x-1 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                title="Edit User"
                              >
                                <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13h3l8-8a2.828 2.828 0 10-4-4l-8 8v3z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7l-1.5-1.5" />
                                </svg>
                                <span className="text-yellow-600 font-semibold text-xs">Edit</span>
                              </button>
                            )}
                          </td>
                          {/* Set As Column */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              {user.userType !== 'ADMIN' && (
                                <button
                                  onClick={() => handleUserTypeChange(user.id, user.userType === 'RESIDENT' ? 'SECURITY' : 'RESIDENT', user.name)}
                                  disabled={changingUserTypes.has(user.id)}
                                  className="flex items-center space-x-1 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={`Set as ${user.userType === 'RESIDENT' ? 'Security' : 'Resident'}`}
                                >
                                  {changingUserTypes.has(user.id) ? (
                                    <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                  ) : (
                                    <>
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
                                    </>
                                  )}
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
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={handleUserCreated}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={
          pendingBulkDelete 
            ? "Delete Multiple Users" 
            : pendingUserDelete 
            ? "Delete User" 
            : "Change User Type"
        }
        message={
          pendingBulkDelete 
            ? `Are you sure you want to delete ${pendingBulkDelete.userNames.length} users? This action cannot be undone and will remove all associated data including plates and documents for: ${pendingBulkDelete.userNames.join(', ')}`
            : pendingUserDelete 
            ? `Are you sure you want to delete ${pendingUserDelete.userName}? This action cannot be undone and will remove all associated data including plates and documents.`
            : `Are you sure you want to change ${pendingUserChange?.userName}'s user type to ${pendingUserChange?.newType}? This will affect their system permissions.`
        }
        confirmText={
          pendingBulkDelete 
            ? "Delete Users" 
            : pendingUserDelete 
            ? "Delete User" 
            : "Change Type"
        }
        cancelText="Cancel"
        onConfirm={
          pendingBulkDelete 
            ? confirmBulkDelete 
            : pendingUserDelete 
            ? confirmUserDelete 
            : confirmUserTypeChange
        }
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingUserChange(null);
          setPendingUserDelete(null);
          setPendingBulkDelete(null);
        }}
        variant={
          pendingBulkDelete || pendingUserDelete 
            ? "danger" 
            : "warning"
        }
        loading={
          pendingBulkDelete
            ? deletingUsers.size > 0
            : pendingUserDelete
            ? !!pendingUserDelete.userId && deletingUsers.has(pendingUserDelete.userId)
            : false
        }
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        onUserUpdated={fetchUsers}
        user={editingUser}
      />
    </div>
  );
} 