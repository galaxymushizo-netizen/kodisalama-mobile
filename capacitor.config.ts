import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kodisalama.app',
  appName: 'KodiSalama',
  webDir: 'dist',
  plugins: {
    // Status-bar icon for every scheduled reminder. `ic_stat_key` is the white
    // key vector in android/app/src/main/res/drawable; Android tints it white.
    LocalNotifications: {
      smallIcon: 'ic_stat_key',
      iconColor: '#15803d',
    },
  },
};

export default config;
