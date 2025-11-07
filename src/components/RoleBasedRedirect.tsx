import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRedirect: React.FC = () => {
  const { isAdmin } = useAuth();
  
  // Redirect based on user role
  if (isAdmin) {
    return <Navigate to="/admin-dashboard" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

export default RoleBasedRedirect;