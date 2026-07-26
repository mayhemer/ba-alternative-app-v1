module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated 4 moved its Babel plugin here; 'react-native-reanimated/plugin'
      // is now just a deprecated re-export of this one. Must be last.
      'react-native-worklets/plugin',
    ],
  };
};
