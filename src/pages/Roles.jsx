// File: src/pages/Roles.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { API_URL } from '../config';

const Roles = () => {
  const { token, isAdmin } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState({ name: '', permissions: [] });
  const [editingRole, setEditingRole] = useState(null);

  const availablePermissions = [
    'view_dashboard',
    'edit_profile',
    'manage_users',
    'manage_roles',
    'view_reports'
  ];

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setRoles(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newRole),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      
      setRoles([...roles, data.role]);
      setNewRole({ name: '', permissions: [] });
      toast.success('Role created successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    try {
      console.log('Updating role:', editingRole); // Debug log
      if (!editingRole?._id) {
        throw new Error('Role ID is missing');
      }

      const response = await fetch(`${API_URL}/roles/${editingRole._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingRole.name,
          permissions: editingRole.permissions
        }),
      });

      // First check if response is ok before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(errorText || 'Failed to update role');
      }

      const data = await response.json();
      console.log('Role update response:', data); // Debug log
      
      setRoles(roles.map(role => 
        role._id === editingRole._id ? data.role : role
      ));
      setEditingRole(null);
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await fetch(`${API_URL}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message);
      }

      setRoles(roles.filter(role => role._id !== roleId));
      toast.success('Role deleted successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handlePermissionToggle = (permission, isEditing = false) => {
    if (isEditing) {
      const updatedPermissions = editingRole.permissions.includes(permission)
        ? editingRole.permissions.filter(p => p !== permission)
        : [...editingRole.permissions, permission];
      setEditingRole({ ...editingRole, permissions: updatedPermissions });
    } else {
      const updatedPermissions = newRole.permissions.includes(permission)
        ? newRole.permissions.filter(p => p !== permission)
        : [...newRole.permissions, permission];
      setNewRole({ ...newRole, permissions: updatedPermissions });
    }
  };

  if (!isAdmin()) {
    return <div className="p-4">You don't have permission to view this page.</div>;
  }

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Role Management</h1>
      
      {/* Create New Role Form */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New Role</h2>
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Role Name</label>
            <input
              type="text"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              className="mt-1 block w-full border rounded-md shadow-sm p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-2">
              {availablePermissions.map(permission => (
                <label key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRole.permissions.includes(permission)}
                    onChange={() => handlePermissionToggle(permission)}
                    className="mr-2"
                  />
                  <span className="text-sm">{permission.replace('_', ' ').toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Create Role
          </button>
        </form>
      </div>

      {/* Roles List */}
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {roles.map(role => (
              <tr key={role._id}>
                <td className="px-6 py-4">{role.name}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map(permission => (
                      <span
                        key={permission}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setEditingRole(role)}
                    className="text-blue-600 hover:text-blue-900 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Role: {editingRole.name}</h2>
            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role Name</label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="mt-1 block w-full border rounded-md shadow-sm p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="space-y-2">
                  {availablePermissions.map(permission => (
                    <label key={permission} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingRole.permissions.includes(permission)}
                        onChange={() => handlePermissionToggle(permission, true)}
                        className="mr-2"
                      />
                      <span className="text-sm">{permission.replace('_', ' ').toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Update Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roles;