// babel.config.js — THIS is what it must look like
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // REQUIRED for Reanimated v4 — replaces 'react-native-reanimated/plugin'
    'react-native-worklets/plugin',
  ],
};
