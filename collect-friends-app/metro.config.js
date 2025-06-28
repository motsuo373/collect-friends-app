const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Firebase の .cjs ファイルサポートを追加
defaultConfig.resolver.sourceExts.push('cjs');
defaultConfig.resolver.unstable_enablePackageExports = false;

// プラットフォーム固有の設定
defaultConfig.resolver.platforms = ['web', 'ios', 'android', 'native'];

// パスエイリアスの設定
defaultConfig.resolver.alias = {
  ...(defaultConfig.resolver.alias || {}),
  '@': __dirname,
};

// Web環境でreact-native-mapsを完全に無効化
if (process.env.EXPO_PLATFORM === 'web' || process.env.PLATFORM === 'web') {
  // Aliasを使ってreact-native-mapsを空のモジュールに置き換え
  defaultConfig.resolver.alias['react-native-maps'] = path.resolve(__dirname, 'web-mock-modules/react-native-maps.js');
  
  // Web環境では特定のモジュールを無視
  defaultConfig.resolver.blockList = [
    /node_modules\/react-native-maps\//,
  ];
}

module.exports = defaultConfig; 