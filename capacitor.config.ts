import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.calblay.calblapp',
  appName: 'CalBlapp',
  webDir: 'public',
  server: {
    url: 'https://calblapp.vercel.app?native=1',
    cleartext: false
  }
};

export default config;
