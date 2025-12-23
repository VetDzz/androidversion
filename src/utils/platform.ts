import { supabase } from '@/lib/supabase';

// Detect if running in Capacitor native app
export const isNativeApp = (): boolean => {
  try {
    const Capacitor = (window as any).Capacitor;
    return Capacitor?.isNativePlatform?.() || false;
  } catch {
    return false;
  }
};

// Get the correct OAuth redirect URL based on platform
export const getOAuthRedirectUrl = (): string => {
  // Always use Supabase callback - it will handle the redirect
  return 'https://plwfbeqtupboeerqiplw.supabase.co/auth/v1/callback';
};

// Initialize push notifications for native app
export const initPushNotifications = async (userId: string, userType: 'client' | 'vet') => {
  if (!isNativeApp()) {
    console.log('Push notifications only available in native app');
    return;
  }

  try {
    // Dynamically import Capacitor push notifications
    const { PushNotifications } = await import('@capacitor/push-notifications');
    
    // Request permission
    const permStatus = await PushNotifications.requestPermissions();
    
    if (permStatus.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();
    } else {
      console.log('Push notification permission denied');
      return;
    }

    // Listen for registration success
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      
      // Save token to user profile
      const table = userType === 'client' ? 'client_profiles' : 'vet_profiles';
      
      const { error } = await supabase
        .from(table)
        .update({ push_token: token.value })
        .eq('user_id', userId);

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Listen for push notifications received
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
    });

    // Listen for push notification action (when user taps notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed:', notification);
      const data = notification.notification.data;
      if (data?.type === 'cvd_accepted' || data?.type === 'cvd_rejected') {
        window.location.href = '/#/client-dashboard?tab=notifications';
      } else if (data?.type === 'new_request') {
        window.location.href = '/#/vet-dashboard?tab=requests';
      } else if (data?.type === 'result_ready') {
        window.location.href = '/#/client-dashboard?tab=results';
      }
    });

  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};
