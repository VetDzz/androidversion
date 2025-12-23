// Import from pushNotifications
import { isNativeApp, isAndroidWebView, initPushNotifications, toggleNotifications, listenForFCMToken } from './pushNotifications';

// Re-export for backward compatibility
export { isNativeApp, isAndroidWebView, initPushNotifications, toggleNotifications, listenForFCMToken };

// Get the correct OAuth redirect URL based on platform
export const getOAuthRedirectUrl = (): string => {
  // For Android app, use custom scheme that will open the app
  if (isAndroidWebView()) {
    // Use the app's custom scheme - Supabase will redirect here after auth
    return 'dz.vet.vetdz://auth/callback';
  }
  
  // For web, use the website URL
  const currentUrl = window.location.origin;
  return `${currentUrl}/#/auth/callback`;
};
