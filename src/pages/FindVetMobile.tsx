import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Phone, Clock, Send, Navigation, Search, RefreshCw, Locate } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import MobileLayout from '@/components/MobileLayout';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;

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

// Custom user location icon (blue dot)
const userLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8" fill="#3B82F6" stroke="white" stroke-width="3"/>
      <circle cx="10" cy="10" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Custom vet icon (pin)
const vetIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C9.03 0 5 4.03 5 9c0 6.5 9 19 9 19s9-12.5 9-19c0-4.97-4.03-9-9-9z" fill="#1E40AF"/>
      <circle cx="14" cy="9" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

// Map center updater component
const MapCenterUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const FindVetMobile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vets, setVets] = useState<Vet[]>([]);
  const [filteredVets, setFilteredVets] = useState<Vet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.5559, 6.1743]);
  const [showLocationError, setShowLocationError] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      fetchVets();
    }
  }, [userLocation]);

  useEffect(() => {
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
    setGettingLocation(true);
    setShowLocationError(false);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(loc);
          setMapCenter([loc.lat, loc.lng]);
          setGettingLocation(false);
          toast({
            title: "Position trouvée ✓",
            description: `Précision: ±${Math.round(position.coords.accuracy)}m`,
          });
        },
        (error) => {
          console.log('Location error:', error);
          setGettingLocation(false);
          setShowLocationError(true);
          // Use default location but still fetch vets
          const defaultLoc = { lat: 35.5559, lng: 6.1743 };
          setUserLocation(defaultLoc);
          setMapCenter([defaultLoc.lat, defaultLoc.lng]);
          fetchVets();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setGettingLocation(false);
      setShowLocationError(true);
      setUserLocation({ lat: 35.5559, lng: 6.1743 });
      fetchVets();
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
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
        .eq('is_verified', true)
        .limit(100);

      if (!error && data) {
        const vetsWithDistance = data.map((vet: any) => {
          if (userLocation && vet.latitude && vet.longitude) {
            const distance = calculateDistance(
              userLocation.lat, userLocation.lng,
              Number(vet.latitude), Number(vet.longitude)
            );
            return { ...vet, distance };
          }
          return vet;
        });

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
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('full_name, phone, address')
        .eq('user_id', user.id)
        .single();

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
        toast({ title: "Erreur", description: "Impossible d'envoyer", variant: "destructive" });
      } else {
        toast({ title: "Demande envoyée! ✓" });

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
                body: `${clientProfile?.full_name || 'Un client'} demande une consultation`,
              }
            });
          }
        } catch (e) { /* silent */ }
      }
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSendingRequest(null);
    }
  };

  const openInMaps = (vet: Vet) => {
    if (vet.latitude && vet.longitude) {
      window.open(`https://www.google.com/maps?q=${vet.latitude},${vet.longitude}`, '_blank');
    }
  };

  const callVet = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const focusOnVet = (vet: Vet) => {
    if (vet.latitude && vet.longitude && mapRef.current) {
      mapRef.current.flyTo([Number(vet.latitude), Number(vet.longitude)], 16);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 14);
    }
  };

  return (
    <MobileLayout>
      <div className="px-3">
        {/* Location Error Popup */}
        {showLocationError && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">Localisation désactivée</p>
                <p className="text-xs text-orange-600 mt-0.5">
                  Veuillez activer la localisation dans les paramètres de votre téléphone pour voir les vétérinaires près de vous.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs border-orange-300 text-orange-700"
                    onClick={getUserLocation}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Réessayer
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 text-xs text-orange-600"
                    onClick={() => setShowLocationError(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-3">
          <h1 className="text-lg font-bold text-gray-900">Trouver un Vétérinaire</h1>
          <p className="text-xs text-gray-500">{filteredVets.length} disponibles</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={getUserLocation} disabled={gettingLocation}>
            <Locate className={`w-4 h-4 ${gettingLocation ? 'animate-pulse' : ''}`} />
          </Button>
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden mb-3 border border-gray-200" style={{ height: '200px' }}>
          <MapContainer
            center={mapCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterUpdater center={mapCenter} />
            
            {/* User location marker */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon}>
                <Popup>📍 Votre position</Popup>
              </Marker>
            )}
            
            {/* Vet markers */}
            {filteredVets.map((vet) => {
              if (!vet.latitude || !vet.longitude) return null;
              return (
                <Marker 
                  key={vet.id} 
                  position={[Number(vet.latitude), Number(vet.longitude)]} 
                  icon={vetIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>{vet.clinic_name || vet.vet_name}</strong>
                      {vet.distance && <p className="text-xs text-gray-500">{vet.distance.toFixed(1)} km</p>}
                      <Button size="sm" className="mt-1 h-6 text-xs" onClick={() => sendCVDRequest(vet)}>
                        Demander CVD
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Map controls */}
        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={centerOnUser}>
            <Locate className="w-3 h-3 mr-1" /> Ma position
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={fetchVets} disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </Button>
        </div>

        {/* Vet List - Compact cards */}
        {loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredVets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucun vétérinaire trouvé</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 pb-4">
            {filteredVets.map((vet) => (
              <Card key={vet.id} className="overflow-hidden" onClick={() => focusOnVet(vet)}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {vet.clinic_name || vet.vet_name || 'Vétérinaire'}
                        </h4>
                        {vet.distance !== undefined && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                            {vet.distance.toFixed(1)} km
                          </Badge>
                        )}
                      </div>
                      
                      {vet.address && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          📍 {vet.address}{vet.city ? `, ${vet.city}` : ''}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-1">
                        {vet.phone && (
                          <button onClick={(e) => { e.stopPropagation(); callVet(vet.phone!); }} className="text-xs text-blue-600">
                            📞 {vet.phone}
                          </button>
                        )}
                        {vet.opening_hours && (
                          <span className="text-xs text-gray-400">🕐 {vet.opening_hours}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1 shrink-0">
                      {vet.latitude && vet.longitude && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openInMaps(vet); }}>
                          <Navigation className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        className="h-7 px-2 text-xs bg-blue-600"
                        onClick={(e) => { e.stopPropagation(); sendCVDRequest(vet); }}
                        disabled={sendingRequest === vet.id}
                      >
                        {sendingRequest === vet.id ? '...' : <><Send className="w-3 h-3 mr-1" />CVD</>}
                      </Button>
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