
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isAndroidWebView } from "@/utils/platform";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // On mobile, redirect to appropriate page instead of showing 404
    if (isAndroidWebView()) {
      if (isAuthenticated && user) {
        if (user.type === 'vet' || user.type === 'laboratory') {
          navigate('/vet-dashboard?tab=clients', { replace: true });
        } else {
          navigate('/find-laboratory', { replace: true });
        }
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [location.pathname, isAuthenticated, user, navigate]);

  // On mobile, show loading while redirecting
  if (isAndroidWebView()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Web version with simple layout (no PageLayout to avoid header)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <a href="/#/" className="text-blue-500 hover:text-blue-700 underline">
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
};

export default NotFound;
