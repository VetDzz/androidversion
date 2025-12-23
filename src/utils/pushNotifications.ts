// Push notification utilities for Android app
import { supabase } from '@/lib/supabase';

// Check if running in native Android app
export const isNativeApp = (): boolean => {
  try {
    const Capacitor = (window as any).Capacitor;
    return Capacitor?.isNativePlatform?.() || false;
  } catch {
    return false;
  }
};

// Check if running in Android WebView
export const isAndroidWebView = (): boolean => {
  try {
    // Check for Capacitor
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    // Check user agent for Android WebView
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('android') && (ua.includes('wv') || ua.includes('webview'));
  } catch {
    return false;
  }
};

// Get FCM token from localStorage (set by Android app)
export const getFCMToken = (): string | null => {
  try {
    const token = localStorage.getItem('fcm_token');
    if (token && token.length > 20) {
      console.log('FCM token found:', token.substring(0, 20) + '...');
      return token;
    }
    return null;
  } catch {
    return null;
  }
};

// Save FCM token to database
export const saveFCMToken = async (
  userId: string, 
  userType: 'client' | 'vet',
  token: string
): Promise<boolean> => {
  try {
    if (!token || token.length < 20) {
      console.log('Invalid FCM token');
      return false;
    }

    const table = userType === 'client' ? 'client_profiles' : 'vet_profiles';
    
    console.log(`Saving FCM token to ${table} for user ${userId}`);
    
    const { error } = await supabase
      .from(table)
      .update({ push_token: token })
      .eq('user_id', userId);

    if (error) {
      console.error('Error saving FCM token:', error);
      return false;
    }
    
    console.log('FCM token saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return false;
  }
};

// Remove FCM token from database (when notifications disabled)
export const removeFCMToken = async (
  userId: string,
  userType: 'client' | 'vet'
): Promise<boolean> => {
  try {
    const table = userType === 'client' ? 'client_profiles' : 'vet_profiles';
    
    const { error } = await supabase
      .from(table)
      .update({ push_token: null })
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
};

// Initialize push notifications
export const initPushNotifications = async (
  userId: string,
  userType: 'client' | 'vet'
): Promise<boolean> => {
  try {
    // Check if notifications are enabled in settings
    const enabled = localStorage.getItem('notifications_enabled') !== 'false';
    if (!enabled) {
      console.log('Notifications disabled by user');
      return false;
    }

    // Get FCM token
    const token = getFCMToken();
    if (!token) {
      console.log('No FCM token available');
      return false;
    }

    // Save token to database
    return await saveFCMToken(userId, userType, token);
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return false;
  }
};

// Toggle notifications on/off
export const toggleNotifications = async (
  userId: string,
  userType: 'client' | 'vet',
  enabled: boolean
): Promise<boolean> => {
  try {
    localStorage.setItem('notifications_enabled', String(enabled));

    if (enabled) {
      const token = getFCMToken();
      if (token) {
        return await saveFCMToken(userId, userType, token);
      }
    } else {
      return await removeFCMToken(userId, userType);
    }
    
    return true;
  } catch {
    return false;
  }
};

// Listen for FCM token from Android app
export const listenForFCMToken = (
  userId: string,
  userType: 'client' | 'vet'
) => {
  console.log('Setting up FCM token listener for', userType, userId);
  
  // Listen for token from Android WebView
  const handleToken = async (event: any) => {
    const token = event.detail?.token;
    console.log('FCM token event received:', token?.substring(0, 20) + '...');
    if (token) {
      localStorage.setItem('fcm_token', token);
      const enabled = localStorage.getItem('notifications_enabled') !== 'false';
      if (enabled) {
        await saveFCMToken(userId, userType, token);
      }
    }
  };

  window.addEventListener('fcmTokenReceived', handleToken);

  // Also check if token is already available (with retry)
  const checkExistingToken = async () => {
    const existingToken = getFCMToken();
    if (existingToken) {
      console.log('Existing FCM token found');
      const enabled = localStorage.getItem('notifications_enabled') !== 'false';
      if (enabled) {
        await saveFCMToken(userId, userType, existingToken);
      }
    } else {
      // Retry after 3 seconds
      setTimeout(async () => {
        const retryToken = getFCMToken();
        if (retryToken) {
          console.log('FCM token found on retry');
          const enabled = localStorage.getItem('notifications_enabled') !== 'false';
          if (enabled) {
            await saveFCMToken(userId, userType, retryToken);
          }
        }
      }, 3000);
    }
  };

  checkExistingToken();

  // Return cleanup function
  return () => {
    window.removeEventListener('fcmTokenReceived', handleToken);
  };
};

// Request notification permission (for web)
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  } catch {
    return false;
  }
};
