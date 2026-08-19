import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRole?: 'customer' | 'owner';
}

export const ProtectedRoute = ({ allowedRole }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-rust h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    // If they have the wrong role, redirect them to their respective dashboard
    if (role === 'owner') return <Navigate to="/owner/dashboard" replace />;
    if (role === 'customer') return <Navigate to="/customer/menu" replace />;
    
    // If role is still loading or null despite having a user, might need a generic fallback
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  return <Outlet />;
};
