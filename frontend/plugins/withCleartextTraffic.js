/**
 * @file withCleartextTraffic.js
 * @description Expo config plugin used when building the APK.
 *
 * The backend runs on plain http (http://192.168.x.x:3000 on the shop Wi-Fi).
 * Expo Go allows that, but an installed Android app (APK) blocks plain http by
 * default, so every request would fail with "Network Error". This turns it on
 * for the built app. Remove it once the backend has an https address.
 */
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:usesCleartextTraffic'] = 'true';
    }
    return cfg;
  });
};

// TEST: npx expo prebuild -p android --no-install -> android/app/src/main/AndroidManifest.xml has android:usesCleartextTraffic="true"
