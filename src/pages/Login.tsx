import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination or default based on role
  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      
      if (success) {
        // Redirect to intended page or appropriate default
        if (from) {
          navigate(from, { replace: true });
        } else {
          // Default redirect based on email (role will be determined by login)
          if (email.toLowerCase() === 'jacqueline.c.frist@vanderbilt.edu') {
            navigate('/dashboard', { replace: true });
          } else {
            navigate('/apply', { replace: true });
          }
        }
      } else {
        setError('Invalid email or password');
      }
    } catch (error) {
      setError('Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fillTestCredentials = (type: 'admin' | 'user') => {
    if (type === 'admin') {
      setEmail('jacqueline.c.frist@vanderbilt.edu');
      setPassword('admin');
    } else {
      setEmail('test.user@vanderbilt.edu');
      setPassword('user123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vanderbilt-gold-50 to-vanderbilt-black-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-vanderbilt-gold-500 to-vanderbilt-gold-600 rounded-full flex items-center justify-center shadow-lg">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-vanderbilt-black-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Secondary Appointment Workflow System
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vanderbilt-gold-500 focus:border-vanderbilt-gold-500"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-vanderbilt-gold-500 focus:border-vanderbilt-gold-500"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-vanderbilt-gold-500 to-vanderbilt-gold-600 hover:from-vanderbilt-gold-600 hover:to-vanderbilt-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vanderbilt-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in
                </div>
              )}
            </button>
          </form>

          {/* Test Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">
              For testing purposes:
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => fillTestCredentials('admin')}
                className="flex-1 py-2 px-3 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Admin Login
              </button>
              <button
                type="button"
                onClick={() => fillTestCredentials('user')}
                className="flex-1 py-2 px-3 text-xs bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                User Login
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            College of Connected Computing • Vanderbilt University
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;