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
    // DEVELOPMENT MODE: Uncomment these lines and add your PC's IP
    // url: 'http://192.168.1.100:5173', // Replace with YOUR PC's IP
    // cleartext: true,
    
    androidScheme: 'https',
    // Allow navigation to OAuth providers
    allowNavigation: [
      'https://plwfbeqtupboeerqiplw.supabase.co/*',
      'https://accounts.google.com/*',
      'https://www.facebook.com/*',
      'https://m.facebook.com/*',
      'https://vetdz.netlify.app/*',
      'http://192.168.1.100:5173/*', // Add your PC's IP here too
    ],
  },
  android: {
    allowMixedContent: true,
    // Handle OAuth redirects
    appendUserAgent: 'VetDzApp',
  },
};

export default config;
