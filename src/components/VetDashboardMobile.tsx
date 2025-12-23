import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Users, Search, Bell, Phone, Send, MapPin, Clock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import MobileLayout from './MobileLayout';
import UploadResultModal from './UploadResultModal';
import { toggleNotifications, listenForFCMToken, isAndroidWebView } from '@/utils/pushNotifications';

interface Client {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface PADRequest {
  id: string;
  client_id: string;
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  created_at: string;
}

const VetDashboardMobile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<PADRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [togglingNotif, setTogglingNotif] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location]);

  useEffect(() => {
    if (user) {
      fetchClients();
      fetchRequests();
      loadNotificationPreference();
      // Listen for FCM token from Android
      if (isAndroidWebView()) {
        listenForFCMToken(user.id, 'vet');
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
      await toggleNotifications(user.id, 'vet', enabled);
    } catch (e) {
      console.log('Could not update notification preference');
    } finally {
      setTogglingNotif(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .order('full_name')
        .limit(50);

      if (!error) {
        setClients(data || []);
      }
    } catch (error) {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async () => {
    if (!searchTerm.trim()) {
      fetchClients();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .limit(30);

      if (!error) {
        setClients(data || []);
      }
    } catch (error) {
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('pad_requests')
        .select('*')
        .eq('vet_id', user?.id)
        .order('created_at', { ascending: false });

      if (!error) {
        setRequests(data || []);
      }
    } catch (error) {
      setRequests([]);
    }
  };

  const handleApproveRequest = async (request: PADRequest) => {
    try {
      const { error } = await supabase
        .from('pad_requests')
        .update({ status: 'accepted' })
        .eq('id', request.id);

      if (!error) {
        toast({ title: "Demande acceptée ✓" });
        fetchRequests();
        
        // Send push notification to client
        try {
          const { data: clientProfile } = await supabase
            .from('client_profiles')
            .select('push_token')
            .eq('user_id', request.client_id)
            .single();
          
          if (clientProfile?.push_token) {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                token: clientProfile.push_token,
                title: 'Demande CVD acceptée',
                body: 'Votre demande de consultation à domicile a été acceptée',
              }
            });
          }
        } catch (e) {
          // Silent fail for notification
        }
      }
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('pad_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (!error) {
        toast({ title: "Demande refusée" });
        fetchRequests();
      }
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const openUploadModal = (client: Client) => {
    setSelectedClient(client);
    setShowUploadModal(true);
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <MobileLayout>
      <div className="px-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {activeTab === 'clients' && 'Trouver Client'}
            {activeTab === 'send' && 'Envoyer Résultat'}
            {activeTab === 'requests' && 'Mes Demandes'}
          </h1>
          {activeTab === 'requests' && pendingRequests.length > 0 && (
            <p className="text-sm text-orange-600 font-medium">
              {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente
            </p>
          )}
        </div>

        {/* Clients Tab - Search and list clients */}
        {activeTab === 'clients' && (
          <div className="space-y-2">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchClients()}
                className="flex-1 h-9 text-sm"
              />
              <Button onClick={searchClients} size="icon" className="bg-blue-600 h-9 w-9">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            {/* Clients List - Compact */}
            {loading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : clients.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Aucun client trouvé</p>
                </CardContent>
              </Card>
            ) : (
              clients.map((client) => (
                <Card key={client.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{client.full_name}</h4>
                        <p className="text-xs text-gray-500 truncate">{client.email}</p>
                        {client.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">📞 {client.phone}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openUploadModal(client)}
                        className="bg-blue-600 h-7 px-2 text-xs"
                      >
                        <Send className="w-3 h-3 mr-1" /> Envoyer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Send Tab - Same as clients but focused on sending */}
        {activeTab === 'send' && (
          <div className="space-y-2">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchClients()}
                className="flex-1 h-9 text-sm"
              />
              <Button onClick={searchClients} size="icon" className="bg-blue-600 h-9 w-9">
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-xs text-gray-500">
              Sélectionnez un client pour envoyer un résultat
            </p>

            {/* Clients List - Compact */}
            {loading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : clients.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Aucun client trouvé</p>
                </CardContent>
              </Card>
            ) : (
              clients.map((client) => (
                <Card 
                  key={client.id} 
                  className="cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => openUploadModal(client)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{client.full_name}</h4>
                        <p className="text-xs text-gray-500 truncate">{client.email}</p>
                      </div>
                      <Send className="w-4 h-4 text-blue-600 shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {/* Notification Toggle */}
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
              </CardContent>
            </Card>

            {/* Requests List */}
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucune demande</p>
                  <p className="text-gray-400 text-sm mt-1">Les demandes CVD apparaîtront ici</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card 
                  key={request.id}
                  className={request.status === 'pending' ? 'border-orange-200 bg-orange-50/30' : ''}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{request.client_name || 'Client'}</h4>
                          {request.client_phone && (
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <Phone className="w-3 h-3 mr-1" />
                              {request.client_phone}
                            </p>
                          )}
                          {request.client_address && (
                            <p className="text-sm text-gray-600 flex items-center mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {request.client_address}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 flex items-center mt-2">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(request.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Badge
                          className={
                            request.status === 'pending'
                              ? 'bg-orange-100 text-orange-800'
                              : request.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {request.status === 'pending' ? 'En attente' :
                           request.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                        </Badge>
                      </div>

                      {request.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveRequest(request)}
                          >
                            ✓ Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            ✕ Refuser
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {selectedClient && (
        <UploadResultModal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedClient(null);
          }}
          clientId={selectedClient.user_id}
          clientName={selectedClient.full_name}
        />
      )}
    </MobileLayout>
  );
};

export default VetDashboardMobile;