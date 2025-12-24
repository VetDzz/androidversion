import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthCallback = () => {
  const [message, setMessage] = useState('Connexion en cours...');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const fullUrl = window.location.href;
        console.log('🔐 AuthCallback URL:', fullUrl);
        
        // Extract tokens from URL (works for both Google and Facebook)
        if (fullUrl.includes('access_token=')) {
          let tokenPart = '';
          const idx = fullUrl.indexOf('access_token=');
          if (idx !== -1) {
            tokenPart = fullUrl.substring(idx);
            // Clean up any trailing routes
            if (tokenPart.includes('#/')) tokenPart = tokenPart.split('#/')[0];
          }
          
          if (tokenPart) {
            const params = new URLSearchParams(tokenPart);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken) {
              console.log('🔑 Setting session...');
              setMessage('Authentification...');
              
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || ''
              });
              
              if (sessionError) {
                console.error('Session error:', sessionError);
                setMessage('Erreur de session');
                setTimeout(() => window.location.href = '/#/auth', 2000);
                return;
              }
              
              window.history.replaceState(null, '', window.location.origin + '/#/auth/callback');
            }
          }
        }
        
        // Wait for session to be fully established
        setMessage('Vérification de la session...');
        await new Promise(r => setTimeout(r, 1000));
        
        // Get session
        const { data, error: getSessionError } = await supabase.auth.getSession();
        
        if (getSessionError || !data.session) {
          console.log('❌ No session found');
          setMessage('Session non trouvée');
          setTimeout(() => window.location.href = '/#/auth', 2000);
          return;
        }
        
        const userId = data.session.user.id;
        const provider = data.session.user.app_metadata?.provider;
        console.log('✅ Session OK, user:', userId, 'provider:', provider);
        
        // Check if user has profile - WAIT for result, no timeout
        setMessage('Vérification du compte...');
        console.log('📡 Checking profile for user:', userId);
        
        let hasProfile = false;
        let userType = '';
        
        // Try RPC function first
        try {
          const { data: profileInfo, error: rpcError } = await supabase
            .rpc('get_user_profile_info', { check_user_id: userId });
          
          console.log('📊 RPC result:', profileInfo, rpcError);
          
          if (!rpcError && profileInfo && profileInfo.length > 0 && profileInfo[0].has_profile) {
            hasProfile = true;
            userType = profileInfo[0].user_type;
          }
        } catch (rpcErr) {
          console.log('RPC failed, trying direct query:', rpcErr);
        }
        
        // Fallback: direct table queries if RPC failed
        if (!hasProfile) {
          console.log('📡 Trying direct queries...');
          
          const { data: clientProfile } = await supabase
            .from('client_profiles')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (clientProfile) {
            hasProfile = true;
            userType = 'client';
          } else {
            const { data: vetProfile } = await supabase
              .from('vet_profiles')
              .select('user_id')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (vetProfile) {
              hasProfile = true;
              userType = 'vet';
            }
          }
        }
        
        console.log('📊 Final result - hasProfile:', hasProfile, 'userType:', userType);
        
        if (hasProfile && userType) {
          // User HAS profile - cache and redirect to dashboard
          console.log('✅ User has profile:', userType);
          
          localStorage.setItem(`userType_${userId}`, userType);
          localStorage.setItem(`userTypeTime_${userId}`, Date.now().toString());
          
          setMessage('Connecté! Redirection...');
          
          await new Promise(r => setTimeout(r, 500));
          
          if (userType === 'vet') {
            window.location.href = '/#/vet-dashboard';
          } else {
            window.location.href = '/#/client-dashboard';
          }
        } else {
          // User has NO profile - redirect to role selection
          console.log('❌ No profile found, going to role selection');
          setMessage('Première connexion...');
          
          await new Promise(r => setTimeout(r, 500));
          window.location.href = '/#/oauth-complete';
        }
        
      } catch (e: any) {
        console.error('❌ AuthCallback error:', e);
        setMessage('Erreur: ' + (e.message || 'Connexion échouée'));
        setTimeout(() => window.location.href = '/#/auth', 3000);
      }
    };
    
    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full mx-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
        <p className="text-gray-700 text-lg font-medium">{message}</p>
        <p className="text-gray-400 text-sm mt-2">Veuillez patienter...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
