import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

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
            }
          }
        }
        
        // Wait a bit for session to be set
        await new Promise(r => setTimeout(r, 500));
        
        // Check if we have a session
        const { data } = await supabase.auth.getSession();
        
        if (data.session) {
          console.log('✅ Session OK, going to home');
          setStatus('success');
          // Go to home - SmartHome will handle routing
          setTimeout(() => {
            window.location.href = '/#/';
          }, 300);
        } else {
          console.log('❌ No session');
          setStatus('error');
          setTimeout(() => {
            window.location.href = '/#/auth';
          }, 1000);
        }
      } catch (e) {
        console.error('❌ Error:', e);
        setStatus('error');
        setTimeout(() => {
          window.location.href = '/#/auth';
        }, 1000);
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
            <p className="text-gray-600">Connexion...</p>
          </>
        )}
        {status === 'success' && <p className="text-green-600">✓ Connecté!</p>}
        {status === 'error' && <p className="text-red-600">Erreur</p>}
      </div>
    </div>
  );
};

export default AuthCallback;
