import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.findtrack.app',
  appName: 'FindTrack',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_key',
      iconColor: '#16a34a',
    },
  },
};

export default config;
