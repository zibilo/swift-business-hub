import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mucodec.espaceentreprise',
  appName: 'MUCODEC Espace Entreprise',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
