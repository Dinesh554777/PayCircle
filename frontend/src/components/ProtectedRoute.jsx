import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  // TODO: Add actual authentication logic here
  const isAuthenticated = true;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
