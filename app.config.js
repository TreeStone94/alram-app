export default {
  expo: {
    name: 'Cloak Alarm',
    slug: 'cloak-alarm',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'cloak-alarm',
    ios: {
      bundleIdentifier: 'com.cloakalarm.app',
      supportsTablet: false,
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#ffffff',
        },
      ],
      'expo-location',
      'expo-background-fetch',
      'expo-task-manager',
    ],
    extra: {
      kmaApiKey: process.env.KMA_API_KEY,
      eas: { projectId: 'TBD' },
    },
  },
};
