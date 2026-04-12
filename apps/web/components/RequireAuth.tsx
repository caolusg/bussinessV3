import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { apiRequest } from '../utils/apiFetch';

type AuthMe = {
  roles: Array<'student' | 'teacher'>;
  profileCompleted: boolean;
};

const RequireAuth: React.FC = () => {
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>(
    token ? 'checking' : 'invalid'
  );
  const [roles, setRoles] = useState<Array<'student' | 'teacher'>>([]);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;
    setStatus('checking');
    apiRequest<AuthMe>('/api/auth/me', {}, { redirectOnUnauthorized: false })
      .then((me) => {
        if (!cancelled) {
          setRoles(me.roles);
          setStatus('valid');
        }
      })
      .catch(() => {
        localStorage.removeItem('access_token');
        if (!cancelled) setStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        正在验证登录状态...
      </div>
    );
  }

  if (status === 'invalid') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (location.pathname.startsWith('/teacher') && !roles.includes('teacher')) {
    return <Navigate to="/login/teacher" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
