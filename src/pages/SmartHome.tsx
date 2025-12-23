import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthPage from './AuthPage';

const SmartHome = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect authenticated users to their dashboard
      if (user.type === 'vet' || user.type === 'laboratory') {
        navigate('/vet-dashboard', { replace: true });
      } else {
        navigate('/client-dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Show auth page for non-authenticated users
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
};

export default SmartHome;
