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
  // Deep linking configuration for OAuth
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
