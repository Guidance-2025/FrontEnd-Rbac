// File: src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const { user, token, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRoles: 0
  });

  useEffect(() => {
    if (isAdmin()) {
      fetchStats();
    }
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users and roles separately
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch(`${API_URL}/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${API_URL}/roles`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!usersResponse.ok || !rolesResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const users = await usersResponse.json();
      const roles = await rolesResponse.json();

      setStats({
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalRoles: Array.isArray(roles) ? roles.length : 0
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Failed to fetch statistics');
    }
  };

  if (isAdmin()) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">System Statistics</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-600 mb-2">Total Users</p>
                <p className="text-3xl font-bold text-blue-800">{stats.totalUsers}</p>
              </div>
              <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                <p className="text-sm font-medium text-green-600 mb-2">Total Roles</p>
                <p className="text-3xl font-bold text-green-800">{stats.totalRoles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Quick Actions</h2>
            <div className="space-y-4">
              <Link
                to="/users"
                className="block w-full bg-blue-500 text-white text-center py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium"
              >
                Manage Users
              </Link>
              <Link
                to="/roles"
                className="block w-full bg-green-500 text-white text-center py-3 px-6 rounded-lg hover:bg-green-600 transition-colors duration-200 font-medium"
              >
                Manage Roles
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Your Admin Profile</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-700 min-w-[100px]">Name:</span>
                <span className="text-gray-900">{user.name}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-700 min-w-[100px]">Email:</span>
                <span className="text-gray-900">{user.email}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-medium text-gray-700 min-w-[100px]">Role:</span>
                <span className="text-gray-900">{user.role?.name || 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">User Dashboard</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Name:</span> {user.name}</p>
            <p><span className="font-medium">Email:</span> {user.email}</p>
            {/* <p>
              <span className="font-medium">Role:</span>{' '}
              {typeof user.role === 'string' ? user.role : user.role?.name || 'No role assigned'}
            </p> */}
          </div>
        </div>

        {/* <div>
          <h2 className="text-xl font-semibold mb-4">Your Permissions</h2>
          {typeof user.role === 'string' ? (
            <p className="text-gray-500">Permissions information not available</p>
          ) : user.role?.permissions ? (
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(user.role.permissions) ? user.role.permissions : []).map((permission, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                >
                  {(typeof permission === 'string' ? permission : permission.name)
                    .replace('_', ' ')
                    .toUpperCase()}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No permissions assigned</p>
          )}
        </div> */}
      </div>
    </div>
  );
};

export default Dashboard;