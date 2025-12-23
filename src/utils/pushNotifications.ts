import { supabase } from '@/lib/supabase';

// Check if running in Android WebView
export const isAndroidApp = (): boolean => {
  const userAgent = navigator.userAgent || '';
  return userAgent.includes('VetDZ-Android');
};

// Get FCM token from localStorage (injected by Android app)
export const getFCMToken = (): string | null => {
  return localStorage.getItem('fcm_token');
};

// Save FCM token to user profile in database
export const saveFCMTokenToProfile = async (userId: string, userType: 'client' | 'vet'): Promise<boolean> => {
  const token = getFCMToken();
  if (!token) {
    console.log('No FCM token available');
    return false;
  }

  try {
    const table = userType === 'client' ? 'client_profiles' : 'vet_profiles';
    
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

// Listen for FCM token from Android app
export const setupFCMTokenListener = (userId: string, userType: 'client' | 'vet'): void => {
  // Check if token already exists
  const existingToken = getFCMToken();
  if (existingToken) {
    saveFCMTokenToProfile(userId, userType);
  }

  // Listen for new token from Android app
  window.addEventListener('fcmTokenReceived', ((event: CustomEvent) => {
    const token = event.detail;
    if (token) {
      console.log('FCM token received from Android:', token);
      saveFCMTokenToProfile(userId, userType);
    }
  }) as EventListener);
};

// Request notification permission (for web - not needed for Android WebView)
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (isAndroidApp()) {
    // Android handles permissions natively
    return true;
  }

  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};
