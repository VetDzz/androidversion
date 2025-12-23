// Re-export from pushNotifications for backward compatibility
export { isNativeApp, isAndroidWebView } from './pushNotifications';
export { initPushNotifications, toggleNotifications, listenForFCMToken } from './pushNotifications';

// Get the correct OAuth redirect URL based on platform
export const getOAuthRedirectUrl = (): string => {
  // Always use Supabase callback - it will handle the redirect
  return 'https://plwfbeqtupboeerqiplw.supabase.co/auth/v1/callback';
};
