// File: src/pages/Users.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { API_URL } from '../config';

const Users = () => {
  const { token, isAdmin, hasPermission, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissionAndFetch = async () => {
      setLoading(true);
      try {
        console.log('Current user:', user);
        console.log('Has manage_users permission:', hasPermission('manage_users'));
        
        // Check if user has manage_users permission
        if (isAdmin() || hasPermission('manage_users')) {
          await Promise.all([fetchUsers(), fetchRoles()]);
        } else {
          console.log('User lacks required permissions:', user?.role?.permissions);
        }
      } catch (error) {
        console.error('Error in initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPermissionAndFetch();
  }, [isAdmin, hasPermission, user]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users with token:', token);
      
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

  const handleRoleChange = async (userId, roleId) => {
    try {
      console.log('Updating role for user:', { userId, roleId });
      if (!userId) {
        throw new Error('User ID is missing');
      }

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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update role');
      }

      const data = await response.json();
      console.log('Role update response:', data);
      
      await fetchUsers();
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      console.log('Attempting to delete user with ID:', userId);
      
      // Make sure we're using the correct ID field
      const endpoint = `${API_URL}/users/${userId}`;
      console.log('Delete endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Delete response status:', response.status);
      
      if (response.status === 404) {
        toast.error('User not found. They may have already been deleted.');
        // Make sure to use the correct ID field here too
        setUsers(users.filter(user => user._id !== userId));
        return;
      }
      
      if (!response.ok) {
        let errorMessage = 'Failed to delete user';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          const textResponse = await response.text();
          console.error('Non-JSON error response:', textResponse);
          errorMessage = 'Server returned an invalid response. Please try again later.';
        }
        throw new Error(errorMessage);
      }
      
      // Make sure to use the correct ID field here too
      setUsers(users.filter(user => user.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error.message === 'Failed to fetch'
        ? 'Network error. Please check your connection and try again.'
        : error.message || 'Failed to delete user';
      toast.error(errorMessage);
    }
  };

  if (!isAdmin() && !hasPermission('manage_users')) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
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
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-3 border-b">Name</th>
              <th className="px-6 py-3 border-b">Email</th>
              <th className="px-6 py-3 border-b">Current Role</th>
              <th className="px-6 py-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 border-b">{user.name}</td>
                <td className="px-6 py-4 border-b">{user.email}</td>
                <td className="px-6 py-4 border-b">
                  <select
                    value={user.role?._id || ''}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="">Select Role</option>
                    {roles.map(role => (
                      <option key={role._id} value={role._id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 border-b">
                  <button
                    onClick={() => handleDeleteUser(user._id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;