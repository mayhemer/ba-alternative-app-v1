const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withE2eTestSeeds } = require('./metro/e2eTestSeeds');

const config = withE2eTestSeeds(getDefaultConfig(__dirname), __dirname, process.env);

module.exports = withNativeWind(config, { input: './global.css' });
