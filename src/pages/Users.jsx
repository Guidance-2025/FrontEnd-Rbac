// File: src/pages/Users.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { API_URL } from '../config';
import { useNavigate } from 'react-router-dom';

const Users = () => {
  const { token, isAdmin, hasPermission, user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkPermissionAndFetch = async () => {
      setLoading(true);
      try {
        console.log('Current user:', user);
        console.log('User role:', user?.role);
        console.log('User permissions:', user?.role?.permissions);
        console.log('Is admin:', isAdmin());
        console.log('Has manage_users permission:', hasPermission('manage_users'));
        console.log('Token:', token);
        
        // Temporary: Allow access if user exists and has a role
        if (user && user.role) {
          console.log('User has role, attempting to fetch data...');
          await Promise.all([fetchUsers(), fetchRoles()]);
        } else {
          console.log('No user or role found');
          toast.error('You do not have permission to view users');
        }
      } catch (error) {
        console.error('Error in initialization:', error);
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    checkPermissionAndFetch();
  }, [isAdmin, hasPermission, user, token]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users with token:', token);
      console.log('User role details:', {
        roleName: user?.role?.name,
        roleId: user?.role?._id,
        permissions: user?.role?.permissions
      });
      
      const response = await fetch(`${API_URL}/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Users API Response status:', response.status);
      
      if (response.status === 403) {
        const errorData = await response.json();
        console.error('Permission denied when fetching users. Server response:', errorData);
        console.error('Current user state:', {
          isAdmin: isAdmin(),
          hasManageUsers: hasPermission('manage_users'),
          userRole: user?.role,
          userPermissions: user?.role?.permissions,
          token: token ? 'Present' : 'Missing',
          roleName: user?.role?.name,
          roleId: user?.role?._id
        });
        
        // Try to fetch user profile to verify token and permissions
        try {
          const profileResponse = await fetch(`${API_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('Profile response status:', profileResponse.status);
          const profileData = await profileResponse.json();
          console.log('Profile data:', profileData);
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
        }
        
        toast.error(errorData.message || 'Access denied. Please contact your administrator.');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }

      const data = await response.json();
      console.log('Users data:', data);
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Failed to fetch users');
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/roles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 403) {
        const errorData = await response.json();
        console.error('Permission denied when fetching roles. Server response:', errorData);
        toast.error(errorData.message || 'You do not have permission to view roles');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch roles');
      }

      const data = await response.json();
      console.log('Roles data:', data);
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error(error.message || 'Failed to fetch roles');
    }
  };

  const updateUserRole = async (userId, roleId) => {
    try {
      console.log('Attempting to update role:', { userId, roleId, currentUser: user });
      
      const response = await fetch(`${API_URL}/users/assign-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          roleId
        })
      });

      const data = await response.json();
      console.log('Role update response:', { status: response.status, data });

      if (response.status === 403) {
        throw new Error(data.message || 'You do not have permission to update roles. Please contact your administrator.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update role');
      }
      
      await fetchUsers();
      toast.success('Role updated successfully');

      // If user removed their own admin role, handle the transition
      if (userId === user._id) {
        const selectedRole = roles.find(r => r._id === roleId);
        if (selectedRole?.name?.toLowerCase() !== 'admin') {
          toast.info('Your admin privileges have been removed. You will be redirected to the login page.');
          // Clear any sensitive data from localStorage
          localStorage.removeItem('token');
          // Force logout and redirect immediately
          logout();
          navigate('/login', { replace: true });
        }
      }
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      if (error.message.includes('permission') || error.message.includes('Access denied')) {
        toast.error('You do not have permission to update roles. Please contact your administrator.');
      } else {
        toast.error(error.message || 'Failed to update role');
      }
      throw error;
    }
  };

  const handleRoleChange = async (userId, roleId) => {
    try {
      console.log('Updating role for user:', { userId, roleId, currentUser: user });
      if (!userId) {
        throw new Error('User ID is missing');
      }

      // Check if user is trying to remove their own admin role
      if (userId === user._id) {
        const currentRole = user.role?.name?.toLowerCase();
        const selectedRole = roles.find(r => r._id === roleId)?.name?.toLowerCase();
        
        if (currentRole === 'admin' && selectedRole !== 'admin') {
          setPendingRoleChange({ userId, roleId });
          setShowWarning(true);
          return;
        }
      }

      // Check if user has permission to change roles
      if (!hasPermission('manage_users') && userId !== user._id) {
        toast.error('You do not have permission to change other users\' roles');
        return;
      }

      await updateUserRole(userId, roleId);
    } catch (error) {
      console.error('Error in handleRoleChange:', error);
      // Don't show another toast here since updateUserRole already shows one
    }
  };

  // const handleDeleteUser = async (userId) => {
  //   if (!window.confirm('Are you sure you want to delete this user?')) return;
    
  //   try {
  //     console.log('Attempting to delete user with ID:', userId);
      
  //     // Make sure we're using the correct ID field
  //     const endpoint = `${API_URL}/users/${userId}`;
  //     console.log('Delete endpoint:', endpoint);
      
  //     const response = await fetch(endpoint, {
  //       method: 'DELETE',
  //       headers: {
  //         'Authorization': `Bearer ${token}`,
  //         'Content-Type': 'application/json'
  //       }
  //     });
      
  //     console.log('Delete response status:', response.status);
      
  //     if (response.status === 404) {
  //       toast.error('User not found. They may have already been deleted.');
  //       // Make sure to use the correct ID field here too
  //       setUsers(users.filter(user => user._id !== userId));
  //       return;
  //     }
      
  //     if (!response.ok) {
  //       let errorMessage = 'Failed to delete user';
  //       try {
  //         const errorData = await response.json();
  //         errorMessage = errorData.message || errorMessage;
  //       } catch (parseError) {
  //         const textResponse = await response.text();
  //         console.error('Non-JSON error response:', textResponse);
  //         errorMessage = 'Server returned an invalid response. Please try again later.';
  //       }
  //       throw new Error(errorMessage);
  //     }
      
  //     // Make sure to use the correct ID field here too
  //     setUsers(users.filter(user => user.id !== userId));
  //     toast.success('User deleted successfully');
  //   } catch (error) {
  //     console.error('Error deleting user:', error);
  //     const errorMessage = error.message === 'Failed to fetch'
  //       ? 'Network error. Please check your connection and try again.'
  //       : error.message || 'Failed to delete user';
  //     toast.error(errorMessage);
  //   }
  // };

  if (!isAdmin() && !hasPermission('manage_users')) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Access Denied: You don't have permission to manage users. Please contact your administrator if you believe this is a mistake.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Users List</h2>
            <div className="text-sm text-gray-500">
              Total Users: {users.length}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Role</th>
                {/* <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role?._id || ''}
                      onChange={(e) => handleRoleChange(user._id, e.target.value)}
                      className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md ${
                        (!hasPermission('manage_users') && user._id !== user._id) ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      disabled={!hasPermission('manage_users') && user._id !== user._id}
                    >
                      <option value="">Select Role</option>
                      {roles.map(role => (
                        <option 
                          key={role._id} 
                          value={role._id}
                          // Only show admin role option for admin users
                          style={{ display: role.name.toLowerCase() === 'admin' && !isAdmin() ? 'none' : 'block' }}
                        >
                          {role.name}
                        </option>
                      ))}
                    </select>
                    {user._id === user._id && user.role?.name?.toLowerCase() === 'admin' && (
                      <p className="mt-1 text-xs text-gray-500">
                        You can change your own role, but this will log you out
                      </p>
                    )}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                    >
                      Delete
                    </button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Warning: Remove Admin Role</h3>
            <p className="mb-4">
              You are about to remove your own admin privileges. 
              This action will log you out and you will lose admin access.
              Are you sure you want to continue?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowWarning(false);
                  setPendingRoleChange(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (pendingRoleChange) {
                    await updateUserRole(pendingRoleChange.userId, pendingRoleChange.roleId);
                    setShowWarning(false);
                    setPendingRoleChange(null);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;