import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../authContext';

const ProtectedRoute = ({ element }) => {
  const { userLoggedIn } = useAuth();

  if (!userLoggedIn) {
    return <Navigate to="/signin" replace />;
  }

  return element;
};

export default ProtectedRoute;
