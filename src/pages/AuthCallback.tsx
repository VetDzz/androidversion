import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connexion en cours...');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const fullUrl = window.location.href;
        console.log('🔐 AuthCallback URL:', fullUrl);
        
        // Extract tokens from URL
        if (fullUrl.includes('access_token=')) {
          let tokenPart = '';
          const idx = fullUrl.indexOf('access_token=');
          if (idx !== -1) {
            tokenPart = fullUrl.substring(idx);
            if (tokenPart.includes('#/')) tokenPart = tokenPart.split('#/')[0];
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
        
        // Wait for session
        await new Promise(r => setTimeout(r, 500));
        
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          console.log('❌ No session');
          setStatus('error');
          setMessage('Session non trouvée');
          setTimeout(() => window.location.href = '/#/auth', 1500);
          return;
        }
        
        const userId = data.session.user.id;
        console.log('✅ Session OK, user:', userId);
        setMessage('Vérification du compte...');
        
        // Check if user has profile - NO TIMEOUT, wait for result
        console.log('📡 Checking profile...');
        const { data: profileInfo, error: profileError } = await supabase
          .rpc('get_user_profile_info', { check_user_id: userId });
        
        console.log('📊 Profile result:', profileInfo, profileError);
        
        // Check result
        if (!profileError && profileInfo && profileInfo.length > 0 && profileInfo[0].has_profile) {
          // User HAS profile - go to dashboard
          const userType = profileInfo[0].user_type;
          console.log('✅ User has profile:', userType);
          
          // Cache it
          localStorage.setItem(`userType_${userId}`, userType);
          localStorage.setItem(`userTypeTime_${userId}`, Date.now().toString());
          
          setStatus('success');
          setMessage('Connecté!');
          
          setTimeout(() => {
            if (userType === 'vet') {
              window.location.href = '/#/vet-dashboard';
            } else {
              window.location.href = '/#/client-dashboard';
            }
          }, 500);
        } else {
          // User has NO profile - go to role selection
          console.log('❌ No profile, going to role selection');
          setStatus('success');
          setMessage('Création du compte...');
          setTimeout(() => {
            window.location.href = '/#/oauth-complete';
          }, 500);
        }
        
      } catch (e) {
        console.error('❌ Error:', e);
        setStatus('error');
        setMessage('Erreur de connexion');
        setTimeout(() => window.location.href = '/#/auth', 2000);
      }
    };
    
    handleAuth();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <p className="text-green-600">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✗</span>
            </div>
            <p className="text-red-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
