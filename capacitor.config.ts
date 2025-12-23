import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dz.vet.vetdz',
  appName: 'VetDz',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  // Server configuration
  server: {
    androidScheme: 'https',
    // Allow navigation to OAuth providers
    allowNavigation: [
      'https://plwfbeqtupboeerqiplw.supabase.co/*',
      'https://accounts.google.com/*',
      'https://www.facebook.com/*',
      'https://m.facebook.com/*',
      'https://vetdz.netlify.app/*',
    ],
  },
  android: {
    allowMixedContent: true,
    // Handle OAuth redirects
    appendUserAgent: 'VetDzApp',
  },
};

export default config;
