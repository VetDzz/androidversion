import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    let isMounted = true;
    
    const handleAuthCallback = async () => {
      try {
        const fullUrl = window.location.href;
        console.log('🔐 OAuth callback started');
        
        // Extract and set session from URL tokens
        if (fullUrl.includes('access_token=')) {
          let tokenPart = '';
          const accessTokenIndex = fullUrl.indexOf('access_token=');
          if (accessTokenIndex !== -1) {
            tokenPart = fullUrl.substring(accessTokenIndex);
            if (tokenPart.includes('#/')) {
              tokenPart = tokenPart.split('#/')[0];
            }
          }
          
          if (tokenPart) {
            const params = new URLSearchParams(tokenPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken) {
              console.log('🔑 Setting session...');
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });
              window.history.replaceState(null, '', window.location.origin + '/#/auth/callback');
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));

        // Get session
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          if (isMounted) {
            setStatus('error');
            toast({
              title: "Erreur de connexion",
              description: "Session non trouvée",
              variant: "destructive"
            });
            setTimeout(() => navigate('/auth'), 2000);
          }
          return;
        }

        if (!isMounted) return;

        const userId = data.session.user.id;
        console.log('👤 User ID:', userId);
        
        // Use the SECURITY DEFINER function that ALWAYS works
        console.log('📡 Calling get_user_profile_info...');
        const { data: profileInfo, error: profileError } = await supabase
          .rpc('get_user_profile_info', { check_user_id: userId });
        
        console.log('📊 Profile info:', profileInfo, 'Error:', profileError);
        
        if (profileError) {
          console.error('❌ RPC error:', profileError);
          // If RPC fails, redirect to role selection
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/#/oauth-complete';
          }, 200);
          return;
        }
        
        // Check if user has profile
        const profile = profileInfo?.[0];
        
        if (!profile || !profile.has_profile) {
          // No profile - redirect to role selection
          console.log('➡️ No profile, going to role selection');
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/#/oauth-complete';
          }, 200);
          return;
        }
        
        // User has profile - cache it and redirect
        const userType = profile.user_type;
        console.log('✅ User type:', userType);
        
        localStorage.setItem(`userType_${userId}`, userType);
        localStorage.setItem(`userTypeTime_${userId}`, Date.now().toString());
        
        setStatus('success');
        toast({
          title: "Connexion réussie",
          description: "Bienvenue sur VetDZ !",
        });
        
        setTimeout(() => {
          if (userType === 'vet') {
            window.location.href = '/#/vet-dashboard';
          } else {
            window.location.href = '/#/client-dashboard';
          }
        }, 300);
        
      } catch (error: any) {
        console.error('❌ Error:', error);
        if (isMounted) {
          setStatus('error');
          toast({
            title: "Erreur",
            description: error?.message || "Une erreur est survenue",
            variant: "destructive"
          });
          setTimeout(() => navigate('/auth'), 2000);
        }
      }
    };

    handleAuthCallback();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion en cours...</h2>
            <p className="text-gray-600">Un instant...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion réussie !</h2>
            <p className="text-gray-600">Redirection...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
            <p className="text-gray-600">Redirection...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
