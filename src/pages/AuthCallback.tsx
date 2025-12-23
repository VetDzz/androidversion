import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-account'>('loading');

  useEffect(() => {
    let isMounted = true;
    
    const handleAuthCallback = async () => {
      try {
        const fullUrl = window.location.href;
        console.log('🔐 AuthCallback started:', fullUrl);
        
        // Check if there are tokens in the URL (email confirmation or OAuth)
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
              console.log('🔑 Setting session from URL token...');
              const { error: setError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });
              
              if (setError) {
                throw new Error(setError.message);
              }
              
              window.history.replaceState(null, '', window.location.origin + '/#/auth/callback');
            }
          }
        }
        
        // Small delay to ensure session is set
        await new Promise(resolve => setTimeout(resolve, 200));

        // Get session
        const { data, error } = await supabase.auth.getSession();
        console.log('📋 Session check:', data?.session ? 'Found' : 'Not found');

        if (error || !data.session) {
          if (isMounted) {
            setStatus('error');
            toast({
              title: "Erreur de connexion",
              description: error?.message || "Session non trouvée",
              variant: "destructive"
            });
            setTimeout(() => navigate('/auth'), 2000);
          }
          return;
        }

        if (!isMounted) return;

        const supabaseUser = data.session.user;
        const provider = supabaseUser.app_metadata?.provider;
        const isOAuthLogin = provider === 'google' || provider === 'facebook';
        
        console.log('👤 User:', supabaseUser.id, 'Provider:', provider);
        
        // Check cache first for instant redirect
        const cachedType = localStorage.getItem(`userType_${supabaseUser.id}`);
        const cacheTime = localStorage.getItem(`userTypeTime_${supabaseUser.id}`);
        const oneHour = 60 * 60 * 1000;
        
        if (cachedType && cacheTime && (Date.now() - parseInt(cacheTime)) < oneHour) {
          console.log('⚡ Using cached user type:', cachedType);
          setStatus('success');
          toast({
            title: "Connexion réussie",
            description: "Bienvenue sur VetDZ !",
          });
          setTimeout(() => {
            window.location.href = cachedType === 'vet' ? '/#/vet-dashboard' : '/#/client-dashboard';
          }, 300);
          return;
        }
        
        // Fast parallel profile check with 5 second timeout
        let hasClientProfile = false;
        let hasVetProfile = false;
        
        const profileCheckPromise = Promise.all([
          supabase.from('client_profiles').select('user_id').eq('user_id', supabaseUser.id).maybeSingle(),
          supabase.from('vet_profiles').select('user_id').eq('user_id', supabaseUser.id).maybeSingle()
        ]);
        
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
        
        const result = await Promise.race([profileCheckPromise, timeoutPromise]);
        
        if (result && Array.isArray(result)) {
          const [clientResult, vetResult] = result;
          hasClientProfile = !!clientResult.data;
          hasVetProfile = !!vetResult.data;
          console.log('📊 Profile check:', { hasClientProfile, hasVetProfile });
          
          // Update cache
          if (hasVetProfile) {
            localStorage.setItem(`userType_${supabaseUser.id}`, 'vet');
            localStorage.setItem(`userTypeTime_${supabaseUser.id}`, Date.now().toString());
          } else if (hasClientProfile) {
            localStorage.setItem(`userType_${supabaseUser.id}`, 'client');
            localStorage.setItem(`userTypeTime_${supabaseUser.id}`, Date.now().toString());
          }
        } else {
          console.log('⏱️ Profile check timed out, redirecting to role selection');
        }
        
        // If no profile found, redirect to complete signup
        if (!hasClientProfile && !hasVetProfile) {
          setStatus('success');
          console.log('➡️ No profile, redirecting to oauth-complete');
          setTimeout(() => {
            window.location.href = '/#/oauth-complete';
          }, 200);
          return;
        }

        // User has profile - redirect to dashboard
        setStatus('success');
        toast({
          title: isOAuthLogin ? "Connexion réussie" : "Email confirmé",
          description: "Bienvenue sur VetDZ !",
        });
        
        console.log('➡️ Redirecting to dashboard');
        setTimeout(() => {
          if (hasVetProfile) {
            window.location.href = '/#/vet-dashboard';
          } else {
            window.location.href = '/#/client-dashboard';
          }
        }, 300);
        
      } catch (error: any) {
        console.error('❌ AuthCallback error:', error);
        if (isMounted) {
          setStatus('error');
          toast({
            title: "Erreur",
            description: error?.message || "Une erreur est survenue.",
            variant: "destructive"
          });
          setTimeout(() => navigate('/auth'), 2000);
        }
      }
    };

    handleAuthCallback();
    
    // 10 second timeout
    const timeout = setTimeout(() => {
      if (isMounted && status === 'loading') {
        console.log('⏱️ Global timeout reached');
        setStatus('error');
        toast({
          title: "Délai dépassé",
          description: "La connexion prend trop de temps.",
          variant: "destructive"
        });
        setTimeout(() => navigate('/auth'), 2000);
      }
    }, 10000);
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [navigate, toast, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connexion en cours...</h2>
            <p className="text-gray-600">Veuillez patienter</p>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de connexion</h2>
            <p className="text-gray-600">Redirection...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
