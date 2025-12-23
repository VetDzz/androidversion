import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, FileText, Bell, LogOut, Users, Send, Inbox } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MobileLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
}

const MobileLayout = ({ children, hideNav = false }: MobileLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const isVet = user?.type === 'vet' || user?.type === 'laboratory';

  // Client navigation items - Trouver Vet, Résultats, Notifications, Déconnexion
  const clientNavItems = [
    { icon: Search, label: 'Trouver Vet', path: '/find-laboratory', key: 'find' },
    { icon: FileText, label: 'Résultats', path: '/client-dashboard?tab=results', key: 'results' },
    { icon: Bell, label: 'Notifications', path: '/client-dashboard?tab=notifications', key: 'notifications' },
  ];

  // Vet navigation items - Trouver Client, Mes Résultats, Mes Demandes, Déconnexion
  const vetNavItems = [
    { icon: Users, label: 'Trouver Client', path: '/vet-dashboard?tab=clients', key: 'clients' },
    { icon: FileText, label: 'Mes Résultats', path: '/vet-dashboard?tab=results', key: 'results' },
    { icon: Inbox, label: 'Mes Demandes', path: '/vet-dashboard?tab=requests', key: 'requests' },
  ];

  const navItems = isVet ? vetNavItems : clientNavItems;

  const isActive = (path: string, key: string) => {
    const urlParams = new URLSearchParams(location.search);
    const currentTab = urlParams.get('tab');
    
    // Check if tab matches
    if (currentTab && path.includes(`tab=${currentTab}`)) {
      return true;
    }
    
    // Check base path for find-laboratory
    if (key === 'find' && location.pathname === '/find-laboratory') {
      return true;
    }
    
    // Default tab handling
    if (!currentTab) {
      if (isVet && key === 'clients' && location.pathname.includes('vet-dashboard')) {
        return true;
      }
      if (!isVet && key === 'results' && location.pathname.includes('client-dashboard')) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main content - no top nav, no header */}
      <main className="pt-2">
        {children}
      </main>

      {/* Bottom Navigation - Fixed at bottom */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
          <div className="flex justify-around items-center h-16 px-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.key);
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
                    active ? 'text-blue-600' : 'text-gray-500'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`text-[10px] mt-1 leading-tight ${active ? 'font-semibold' : 'font-normal'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center flex-1 py-2 text-gray-500"
            >
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="text-[10px] mt-1 text-red-500 font-normal leading-tight">Déconnexion</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default MobileLayout;
