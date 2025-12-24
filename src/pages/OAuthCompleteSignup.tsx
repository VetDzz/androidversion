import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Building2, MapPin, Clock, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import TermsModal from '@/components/TermsModal';
import GeolocationModal from '@/components/GeolocationModal';

type Step = 'loading' | 'choose-type' | 'terms' | 'vet-location';

const OAuthCompleteSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('loading');
  const [userType, setUserType] = useState<'client' | 'vet' | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated and has profile already
    const checkUser = async () => {
      // Wait a bit for session to be established
      await new Promise(r => setTimeout(r, 1000));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Try one more time after delay
        await new Promise(r => setTimeout(r, 1000));
        const { data: { user: retryUser } } = await supabase.auth.getUser();
        if (!retryUser) {
          console.log('❌ No user found after retry');
          navigate('/auth');
          return;
        }
        // Use retry user
        await checkProfile(retryUser);
        return;
      }
      
      await checkProfile(user);
    };
    
    const checkProfile = async (user: any) => {
      // Check if user already has a profile - TRY MULTIPLE METHODS
      console.log('🔍 Checking if user has profile...');
      
      let hasProfile = false;
      let profileType = '';
      
      // Method 1: RPC function
      try {
        const { data: profileInfo, error: profileError } = await supabase
          .rpc('get_user_profile_info', { check_user_id: user.id });
        
        console.log('📊 RPC result:', profileInfo, profileError);
        
        if (!profileError && profileInfo && profileInfo.length > 0 && profileInfo[0].has_profile) {
          hasProfile = true;
          profileType = profileInfo[0].user_type;
        }
      } catch (e) {
        console.log('RPC failed:', e);
      }
      
      // Method 2: Direct queries if RPC failed
      if (!hasProfile) {
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (clientProfile) {
          hasProfile = true;
          profileType = 'client';
        } else {
          const { data: vetProfile } = await supabase
            .from('vet_profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (vetProfile) {
            hasProfile = true;
            profileType = 'vet';
          }
        }
      }
      
      if (hasProfile && profileType) {
        // User already has profile - redirect to dashboard
        console.log('✅ User already has profile:', profileType);
        
        // Update cache
        localStorage.setItem(`userType_${user.id}`, profileType);
        localStorage.setItem(`userTypeTime_${user.id}`, Date.now().toString());
        
        // Redirect to dashboard - NO TOAST, just redirect
        console.log('➡️ Redirecting to dashboard...');
        if (profileType === 'vet') {
          window.location.href = '/#/vet-dashboard';
        } else {
          window.location.href = '/#/client-dashboard';
        }
        return;
      }
      
      // No profile - show role selection
      console.log('❌ No profile found, showing role selection');
      setUserData(user);
      setStep('choose-type');
    };
    
    checkUser();
  }, [navigate]);

  const handleTypeSelect = (type: 'client' | 'vet') => {
    setUserType(type);
    setStep('terms');
  };

  const handleTermsAccept = async () => {
    if (!termsAccepted) {
      toast({
        title: "Conditions requises",
        description: "Veuillez accepter les conditions d'utilisation.",
        variant: "destructive"
      });
      return;
    }

    if (userType === 'client') {
      // Create client profile and go to home
      await createClientProfile();
    } else {
      // Go to vet location step
      setStep('vet-location');
    }
  };

  const createClientProfile = async () => {
    setIsLoading(true);
    try {
      // First verify the user exists in auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ User error:', userError);
        toast({
          title: "❌ Erreur de session",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }

      console.log('✅ User authenticated:', user.id);

      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      console.log('Profile check:', { existingProfile, checkError });
        
      if (checkError) {
        console.error('❌ RLS Error checking profile:', checkError);
        toast({
          title: "❌ Erreur de permissions",
          description: `RLS Error: ${checkError.message}. Veuillez exécuter le script SQL QUICK-FIX-RLS.sql`,
          variant: "destructive"
        });
        return;
      }

      if (existingProfile) {
        console.log('✅ Profile already exists, redirecting...');
        
        // Mark user setup as complete (first_time = false)
        try {
          await supabase.rpc('mark_user_setup_complete', { target_user_id: user.id });
        } catch (e) {
          console.log('Could not mark setup complete:', e);
        }
        
        // Clear OAuth signup flag
        localStorage.removeItem('oauthNewUser');
        
        // Update cache
        localStorage.setItem(`userType_${user.id}`, 'client');
        localStorage.setItem(`userTypeTime_${user.id}`, Date.now().toString());

        toast({
          title: "Compte existant",
          description: "Bienvenue de retour sur VetDZ !",
        });

        // Client goes to client dashboard (mobile auto-detected)
        window.location.href = '/#/client-dashboard';
        return;
      }

      const fullName = user?.user_metadata?.full_name || 
                      user?.user_metadata?.name || 
                      user?.email?.split('@')[0] || 
                      'User';
                      
      console.log('Creating profile for:', { user_id: user.id, full_name: fullName, email: user.email });
                      
      const { data, error } = await supabase
        .from('client_profiles')
        .insert({
          user_id: user.id,
          full_name: fullName,
          email: user.email,
          phone: user.user_metadata?.phone || '',
          is_verified: true
        })
        .select()
        .single();
        
      console.log('Insert result:', { data, error });
        
      if (error) {
        console.error('❌ Insert error:', error);
        // Provide specific error messages
        if (error.code === '23505') {
          toast({
            title: "Profil existant",
            description: "Votre profil existe déjà. Redirection...",
          });
          
          // Update cache
          localStorage.setItem(`userType_${user.id}`, 'client');
          localStorage.setItem(`userTypeTime_${user.id}`, Date.now().toString());
          
          // Client goes to client dashboard (mobile auto-detected)
          window.location.href = '/#/client-dashboard';
          return;
        } else if (error.code === '42501') {
          toast({
            title: "❌ Erreur RLS",
            description: "Les politiques RLS bloquent la création. Exécutez QUICK-FIX-RLS.sql dans Supabase!",
            variant: "destructive"
          });
        } else {
          toast({
            title: "❌ Erreur de création",
            description: `${error.code}: ${error.message}`,
            variant: "destructive"
          });
        }
        return;
      }
      
      console.log('✅ Profile created successfully!');
      
      // Mark user setup as complete (first_time = false)
      try {
        await supabase.rpc('mark_user_setup_complete', { target_user_id: user.id });
      } catch (e) {
        console.log('Could not mark setup complete:', e);
      }
      
      // Clear OAuth signup flag
      localStorage.removeItem('oauthNewUser');
      
      // Update user type cache so AuthContext knows profile exists
      localStorage.setItem(`userType_${user.id}`, 'client');
      localStorage.setItem(`userTypeTime_${user.id}`, Date.now().toString());

      toast({
        title: "Compte créé",
        description: "Bienvenue sur VetDZ !",
      });

      // Client goes to client dashboard (mobile auto-detected)
      window.location.href = '/#/client-dashboard';
    } catch (error: any) {
      console.error('❌ Catch error:', error);
      toast({
        title: "❌ Erreur inattendue",
        description: error?.message || "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVetLocationComplete = async (locationData: any) => {
    setIsLoading(true);
    try {
      const fullName = userData?.user_metadata?.full_name || 
                      userData?.user_metadata?.name || 
                      userData?.email?.split('@')[0] || 
                      'Clinique';

      const { error } = await supabase
        .from('vet_profiles')
        .upsert({
          user_id: userData.id,
          vet_name: fullName,
          clinic_name: fullName,
          email: userData.email,
          phone: locationData.phone || '',
          address: locationData.address || '',
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          opening_hours: locationData.openingHours || '8h00 - 18h00',
          opening_days: locationData.openingDays || [],
          description: locationData.description || '',
          is_verified: true
        }, { onConflict: 'user_id' });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de créer le profil.",
          variant: "destructive"
        });
        return;
      }

      // Mark user setup as complete (first_time = false)
      try {
        await supabase.rpc('mark_user_setup_complete', { target_user_id: userData.id });
      } catch (e) {
        console.log('Could not mark setup complete:', e);
      }

      // Clear OAuth signup flag
      localStorage.removeItem('oauthNewUser');
      
      // Update user type cache so AuthContext knows profile exists
      localStorage.setItem(`userType_${userData.id}`, 'vet');
      localStorage.setItem(`userTypeTime_${userData.id}`, Date.now().toString());

      toast({
        title: "Compte créé",
        description: "Bienvenue sur VetDZ !",
      });

      // Vet goes to vet dashboard (mobile auto-detected)
      window.location.href = '/#/vet-dashboard';
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {step === 'loading' && (
          <Card className="shadow-xl">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                <p className="text-gray-700 text-lg font-medium">Vérification du compte...</p>
                <p className="text-gray-400 text-sm mt-2">Veuillez patienter</p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'choose-type' && (
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Bienvenue sur VetDZ !
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Choisissez votre type de compte
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => handleTypeSelect('client')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <User className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">Client</h3>
                    <p className="text-sm text-gray-500">
                      Je cherche un vétérinaire pour mon animal
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleTypeSelect('vet')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Building2 className="w-7 h-7 text-green-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-gray-900">Vétérinaire</h3>
                    <p className="text-sm text-gray-500">
                      Je suis un professionnel vétérinaire
                    </p>
                  </div>
                </div>
              </button>
            </CardContent>
          </Card>
        )}

        {step === 'terms' && (
          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Conditions d'utilisation
              </CardTitle>
              <p className="text-gray-600 mt-2">
                {userType === 'client' ? 'Compte Client' : 'Compte Vétérinaire'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <TermsModal type={userType || 'client'} onAccept={() => setTermsAccepted(true)}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    readOnly
                    className="mt-1 w-5 h-5 rounded border-gray-300 cursor-pointer"
                  />
                </TermsModal>
                <div>
                  <TermsModal type={userType || 'client'} onAccept={() => setTermsAccepted(true)}>
                    <span className="text-gray-700 cursor-pointer hover:text-blue-600">
                      J'accepte les <span className="text-blue-600 underline">conditions d'utilisation</span> et la politique de confidentialité
                    </span>
                  </TermsModal>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('choose-type')}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleTermsAccept}
                  disabled={!termsAccepted || isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {isLoading ? 'Création...' : 'Continuer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'vet-location' && (
          <GeolocationModal
            isOpen={true}
            userData={userData}
            userType="vet"
            onComplete={handleVetLocationComplete}
            onBack={() => setStep('terms')}
          />
        )}
      </motion.div>
    </div>
  );
};

export default OAuthCompleteSignup;
