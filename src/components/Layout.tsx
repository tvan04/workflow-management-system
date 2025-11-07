import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  // Define navigation items based on user role
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { path: '/admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin', label: 'Admin', icon: Settings },
      ];
    } else {
      return [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/apply', label: 'Apply', icon: FileText },
      ];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header with Vanderbilt Branding */}
      <header className="bg-white shadow-soft border-b border-surface-200 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img
                  src="/images/VU_CCC_Black.png"
                  alt="Vanderbilt CCC Logo"
                  className="h-12 w-auto"
                />
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-px bg-surface-300"></div>
                <h1 className="text-l font-display font-semibold text-vanderbilt-black-900">
                  Secondary Appointment Management
                </h1>
              </div>
            </div>
            
            {/* Right side: Navigation + User Menu */}
            <div className="flex items-center space-x-4">
              {/* Modern Navigation */}
              <nav className="hidden md:flex items-center space-x-2 bg-surface-100 p-2 rounded-2xl">
                {navItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = location.pathname === item.path || 
                    (item.path === '/dashboard' && location.pathname === '/') ||
                    (item.path === '/apply' && location.pathname === '/');
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-link ${
                        isActive
                          ? 'nav-link-active'
                          : 'nav-link-inactive'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{user?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="p-2 rounded-xl text-surface-600 hover:text-vanderbilt-black-900 hover:bg-surface-100 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-surface-200 bg-white">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path === '/dashboard' && location.pathname === '/');
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link w-full justify-start ${
                    isActive
                      ? 'nav-link-active'
                      : 'nav-link-inactive'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content with Modern Spacing */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <div className="animate-slide-up">
          {children}
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-surface-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <img
                  src="/images/VU_CCC_Black.png"
                  alt="Vanderbilt CCC Logo"
                  className="h-8 w-auto"
                />
            </div>
            <div className="flex items-center space-x-6 text-sm text-surface-500">
              <span>Vanderbilt University</span>
              <span className="hidden md:block">•</span>
              <span>© 2025 All rights reserved</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;