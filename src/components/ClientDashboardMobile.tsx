import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { FileText, Bell, Clock, Download, Eye } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MobileLayout from './MobileLayout';
import { toggleNotifications, listenForFCMToken, isAndroidWebView } from '@/utils/pushNotifications';

const ClientDashboardMobile = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('results');
  const [results, setResults] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [togglingNotif, setTogglingNotif] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  useEffect(() => {
    if (user) {
      fetchData();
      loadNotificationPreference();
      // Listen for FCM token from Android
      if (isAndroidWebView()) {
        listenForFCMToken(user.id, 'client');
      }
    }
  }, [user]);

  const loadNotificationPreference = () => {
    const saved = localStorage.getItem('notifications_enabled');
    setNotificationsEnabled(saved !== 'false');
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (!user) return;
    
    setTogglingNotif(true);
    setNotificationsEnabled(enabled);
    
    try {
      await toggleNotifications(user.id, 'client', enabled);
      
      // Also update in database
      await supabase
        .from('client_profiles')
        .update({ notifications_enabled: enabled })
        .eq('user_id', user.id);
    } catch (e) {
      console.log('Could not update notification preference');
    } finally {
      setTogglingNotif(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchResults(), fetchNotifications()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_results')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setResults(data || []);
      }
    } catch (error) {
      setResults([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
    } catch (error) {
      setNotifications([]);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (e) {
      console.log('Could not mark as read');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'available':
        return <Badge className="bg-green-100 text-green-800 text-xs">Disponible</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">En attente</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const viewResult = (result: any) => {
    if (result.file_url) {
      window.open(result.file_url, '_blank');
    }
  };

  return (
    <MobileLayout>
      <div className="px-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {activeTab === 'results' ? 'Mes Résultats' : 'Notifications'}
          </h1>
          <p className="text-sm text-gray-500">
            {activeTab === 'results' 
              ? `${results.length} résultat${results.length !== 1 ? 's' : ''}`
              : `${notifications.filter(n => !n.is_read).length} non lu${notifications.filter(n => !n.is_read).length !== 1 ? 's' : ''}`
            }
          </p>
        </div>

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucun résultat</p>
                  <p className="text-gray-400 text-sm mt-1">Vos résultats d'analyses apparaîtront ici</p>
                </CardContent>
              </Card>
            ) : (
              results.map((result) => (
                <Card key={result.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{result.title || 'Analyse'}</h4>
                        <p className="text-xs text-gray-500 flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {new Date(result.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      {getStatusBadge(result.status || 'available')}
                    </div>
                    
                    {result.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{result.description}</p>
                    )}
                    
                    {result.file_url && (
                      <Button 
                        size="sm" 
                        className="w-full mt-3 bg-blue-600"
                        onClick={() => viewResult(result)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir le résultat
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {/* Notification Toggle Card */}
            <Card className="border-blue-100 bg-blue-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Notifications Push</h4>
                      <p className="text-xs text-gray-500">
                        {notificationsEnabled ? 'Activées' : 'Désactivées'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={handleToggleNotifications}
                    disabled={togglingNotif}
                  />
                </div>
                {!isAndroidWebView() && (
                  <p className="text-xs text-gray-400 mt-2">
                    Les notifications push sont disponibles uniquement sur l'application Android
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notifications List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucune notification</p>
                  <p className="text-gray-400 text-sm mt-1">Vous serez notifié des nouveaux résultats</p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`overflow-hidden transition-colors ${
                    notification.is_read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-blue-200 shadow-sm'
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        notification.is_read ? 'bg-gray-300' : 'bg-blue-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${notification.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                          {notification.title}
                        </h4>
                        <p className={`text-sm mt-1 ${notification.is_read ? 'text-gray-400' : 'text-gray-600'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ClientDashboardMobile;