import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Phone, Clock, Send, Navigation, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import MobileLayout from '@/components/MobileLayout';

interface Vet {
  id: string;
  user_id: string;
  vet_name?: string;
  clinic_name?: string;
  address?: string;
  phone?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: string;
  distance?: number;
}

const FindVetMobile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vets, setVets] = useState<Vet[]>([]);
  const [filteredVets, setFilteredVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    getUserLocation();
    fetchVets();
  }, []);

  useEffect(() => {
    // Filter vets based on search term
    if (searchTerm.trim()) {
      const filtered = vets.filter(vet => 
        (vet.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vet.vet_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vet.city?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vet.address?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredVets(filtered);
    } else {
      setFilteredVets(vets);
    }
  }, [searchTerm, vets]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Could not get location:', error);
        }
      );
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchVets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vet_profiles')
        .select('*')
        .limit(100);

      if (!error && data) {
        // Calculate distances if user location is available
        const vetsWithDistance = data.map((vet: Vet) => {
          if (userLocation && vet.latitude && vet.longitude) {
            const distance = calculateDistance(
              userLocation.lat, userLocation.lng,
              Number(vet.latitude), Number(vet.longitude)
            );
            return { ...vet, distance };
          }
          return vet;
        });

        // Sort by distance
        vetsWithDistance.sort((a: Vet, b: Vet) => (a.distance || 999) - (b.distance || 999));
        setVets(vetsWithDistance);
        setFilteredVets(vetsWithDistance);
      }
    } catch (error) {
      console.error('Error fetching vets:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendCVDRequest = async (vet: Vet) => {
    if (!user) return;

    setSendingRequest(vet.id);
    try {
      // Get client profile
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('full_name, phone, address')
        .eq('user_id', user.id)
        .single();

      // Create PAD request
      const { error } = await supabase
        .from('pad_requests')
        .insert({
          client_id: user.id,
          vet_id: vet.user_id,
          client_name: clientProfile?.full_name || 'Client',
          client_phone: clientProfile?.phone || '',
          client_address: clientProfile?.address || '',
          client_location_lat: userLocation?.lat,
          client_location_lng: userLocation?.lng,
          status: 'pending'
        });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'envoyer la demande",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Demande envoyée! ✓",
          description: `Votre demande a été envoyée à ${vet.clinic_name || vet.vet_name}`,
        });

        // Send push notification to vet
        try {
          const { data: vetProfile } = await supabase
            .from('vet_profiles')
            .select('push_token')
            .eq('user_id', vet.user_id)
            .single();
          
          if (vetProfile?.push_token) {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                token: vetProfile.push_token,
                title: 'Nouvelle demande CVD',
                body: `${clientProfile?.full_name || 'Un client'} a demandé une consultation à domicile`,
              }
            });
          }
        } catch (e) {
          // Silent fail for notification
        }
      }
    } catch (error) {
      toast({
        title: "Erreur",
        variant: "destructive"
      });
    } finally {
      setSendingRequest(null);
    }
  };

  const openInMaps = (vet: Vet) => {
    if (vet.latitude && vet.longitude) {
      const url = `https://www.google.com/maps?q=${vet.latitude},${vet.longitude}`;
      window.open(url, '_blank');
    }
  };

  const callVet = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <MobileLayout>
      <div className="px-4">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900">Trouver un Vétérinaire</h1>
          <p className="text-sm text-gray-500">
            {filteredVets.length} vétérinaire{filteredVets.length !== 1 ? 's' : ''} disponible{filteredVets.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={fetchVets}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3 text-sm">Recherche en cours...</p>
          </div>
        ) : filteredVets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun vétérinaire trouvé</p>
              <p className="text-gray-400 text-sm mt-1">Essayez une autre recherche</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredVets.map((vet) => (
              <Card key={vet.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {vet.clinic_name || vet.vet_name || 'Vétérinaire'}
                        </h4>
                        {vet.distance !== undefined && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            📍 {vet.distance.toFixed(1)} km
                          </Badge>
                        )}
                      </div>
                    </div>

                    {vet.address && (
                      <p className="text-sm text-gray-600 flex items-start">
                        <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                        <span className="line-clamp-2">{vet.address}{vet.city ? `, ${vet.city}` : ''}</span>
                      </p>
                    )}

                    {vet.phone && (
                      <button 
                        onClick={() => callVet(vet.phone!)}
                        className="text-sm text-blue-600 flex items-center hover:underline"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        {vet.phone}
                      </button>
                    )}

                    {vet.opening_hours && (
                      <p className="text-sm text-gray-600 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        {vet.opening_hours}
                      </p>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => sendCVDRequest(vet)}
                        disabled={sendingRequest === vet.id}
                      >
                        {sendingRequest === vet.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Demander CVD
                          </>
                        )}
                      </Button>
                      
                      {vet.latitude && vet.longitude && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openInMaps(vet)}
                          title="Ouvrir dans Maps"
                        >
                          <Navigation className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default FindVetMobile;
