const path = require('path');
const { getConfig } = require('react-native-builder-bob/babel-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');

module.exports = getConfig(
  {
    presets: ['module:@react-native/babel-preset'],
    // reanimated 4 依赖 worklets 插件（必须放在 plugins 末尾）
    plugins: ['react-native-worklets/plugin'],
  },
  { root, pkg }
);
