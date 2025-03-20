import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { API_URL } from '../config';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          console.log('Verifying token...');
          const profileUrl = `${API_URL}/auth/profile`;
          console.log('Profile URL:', profileUrl);

          const response = await fetch(profileUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Profile response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('Profile response data:', data);

            if (data.user) {
              // If role is a string, fetch the role details
              if (typeof data.user.role === 'string') {
                try {
                  const roleResponse = await fetch(`${API_URL}/roles`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    }
                  });
                  
                  if (roleResponse.ok) {
                    const roles = await roleResponse.json();
                    const userRole = roles.find(r => r.name === data.user.role);
                    if (userRole) {
                      data.user.role = userRole;
                    }
                  }
                } catch (error) {
                  console.error('Error fetching role details:', error);
                }
              }

              console.log('Setting user data:', {
                ...data.user,
                role: data.user.role,
                permissions: data.user.role?.permissions
              });
              setUser(data.user);
            } else {
              console.log('Invalid user data structure:', data);
              setUser(null);
              setToken('');
              localStorage.removeItem('token');
            }
          } else {
            console.log('Token verification failed with status:', response.status);
            setUser(null);
            setToken('');
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          setUser(null);
          setToken('');
          localStorage.removeItem('token');
        }
      } else {
        console.log('No token found in storage');
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email });
      const loginUrl = `${API_URL}/auth/login`;
      console.log('Login URL:', loginUrl);

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);
      const data = await response.json();
      console.log('Login response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.token) {
        throw new Error('No token received from server');
      }

      console.log('Login successful, fetching user profile...');
      
      // Fetch complete user data including roles and permissions
      const userResponse = await fetch(`${API_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const userData = await userResponse.json();
      console.log('User profile data:', userData);
      
      if (!userData.user) {
        throw new Error('Invalid user data received');
      }

      console.log('Setting user data after login:', {
        ...userData.user,
        role: userData.user.role,
        permissions: userData.user.role?.permissions
      });

      setUser(userData.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      toast.success('Login successful!');
      return userData.user;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.errors?.[0]?.msg || data.message || 'Signup failed');
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('token');
  };

  const isAdmin = () => {
    console.log('Checking admin status:', user);
    console.log('User role:', user?.role);
    console.log('User role type:', typeof user?.role);
    
    // Check if user exists and has a role
    if (!user || !user.role) {
      console.log('No user or role found');
      return false;
    }
    
    // Handle both string and object roles
    const roleName = typeof user.role === 'string' ? user.role : user.role.name;
    console.log('Role name:', roleName);
    return roleName?.toLowerCase() === 'admin';
  };

  const hasPermission = (permissionName) => {
    console.log('Checking permission:', permissionName);
    console.log('User role:', user?.role);
    console.log('User permissions:', user?.role?.permissions);
    console.log('User role type:', typeof user?.role);

    // If user is admin, they have all permissions
    if (isAdmin()) {
      console.log('User is admin, granting all permissions');
      return true;
    }

    // Handle string roles (no permissions)
    if (typeof user?.role === 'string') {
      console.log('User has string role, no permissions available');
      return false;
    }

    // Check if user has role and permissions
    if (!user?.role?.permissions) {
      console.log('No permissions found for user role');
      return false;
    }

    // Check if the permission exists in the user's permissions
    // Convert both to lowercase for case-insensitive comparison
    const hasPermission = user.role.permissions.some(permission => {
      const permToCheck = typeof permission === 'string' ? permission : permission.name;
      return permToCheck.toLowerCase() === permissionName.toLowerCase();
    });
    
    console.log('Permission check result:', hasPermission);
    return hasPermission;
  };

  const updateUserProfile = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setUser(data);
      toast.success('Profile updated successfully');
      return data;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    isAdmin,
    hasPermission,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};