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

// Initialize push notifications for native app - DISABLED FOR NOW
export const initPushNotifications = async (userId: string, userType: 'client' | 'vet') => {
  // Disabled to prevent crashes - push notifications need proper native setup
  console.log('Push notifications disabled for now');
  return;
};
