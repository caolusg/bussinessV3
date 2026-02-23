import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const RequireAuth: React.FC = () => {
  const location = useLocation();
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
