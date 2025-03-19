import React, { useContext, useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Layout = () => {
  const { user, logout, hasPermission, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-800">RBAC System</h1>
            </div>
            
            {/* Mobile Menu Button */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden text-gray-600 focus:outline-none">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Navigation Links */}
            <div className={`sm:flex sm:items-center sm:space-x-8 lg:space-x-12 xl:space-x-16 ${menuOpen ? 'block absolute top-16 left-0 right-0 bg-white shadow-md sm:shadow-none sm:relative sm:top-0' : 'hidden'} sm:block`}>  
              <Link to="/dashboard" className="block sm:inline-block px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 sm:hover:bg-transparent">Dashboard</Link>
              {(isAdmin() || hasPermission('manage_users')) && (
                <Link to="/users" className="block sm:inline-block px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 sm:hover:bg-transparent">Users</Link>
              )}
              {(isAdmin() || hasPermission('manage_roles')) && (
                <Link to="/roles" className="block sm:inline-block px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 sm:hover:bg-transparent">Roles</Link>
              )}
              <Link to="/profile" className="block sm:inline-block px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 sm:hover:bg-transparent">Profile</Link>
            </div>

            {/* User Info & Logout */}
            <div className={`sm:flex items-center space-x-4 ${menuOpen ? 'block mt-4 sm:mt-0' : 'hidden'} sm:block`}>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              <button onClick={handleLogout} className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors duration-150">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-8">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;