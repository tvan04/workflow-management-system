import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplicationForm from './pages/ApplicationForm';
import ApplicationStatus from './pages/ApplicationStatus';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';
import SignaturePage from './pages/SignaturePage';
import RoleBasedRedirect from './components/RoleBasedRedirect';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signature/:applicationId" element={<SignaturePage />} />
          
          {/* Protected routes with Layout */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  {/* Root redirect based on user role */}
                  <Route path="/" element={<RoleBasedRedirect />} />
                  
                  {/* Admin-only routes */}
                  <Route path="/admin-dashboard" element={
                    <ProtectedRoute requireAdmin>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute requireAdmin>
                      <AdminPanel />
                    </ProtectedRoute>
                  } />
                  
                  {/* Applicant-only routes */}
                  <Route path="/apply" element={
                    <ProtectedRoute requireApplicant>
                      <ApplicationForm />
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute requireApplicant>
                      <UserDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/status/:applicationId" element={
                    <ProtectedRoute requireApplicant>
                      <ApplicationStatus />
                    </ProtectedRoute>
                  } />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
