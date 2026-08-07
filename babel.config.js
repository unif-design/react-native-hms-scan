module.exports = {
  overrides: [
    {
      exclude: /\/node_modules\//,
      presets: ['module:react-native-builder-bob/babel-preset'],
    },
    {
      include: /\/node_modules\//,
      presets: ['module:@react-native/babel-preset'],
      // 宿主 app 的 babel 会用 worklets 插件处理 node_modules（Metro 就是这么干的），
      // 库仓 jest 渲染真实 design 组件后也得补上：design 发布的 lib/module 里
      // `useAnimatedStyle` 没有依赖数组（等宿主插件注入），缺插件时 reanimated 4
      // 直接在 render 抛 "used without a dependency array or Babel plugin"。
      // 只挂在 node_modules 这条 override 上：bob 只编译 src/，插件不能改到发布产物。
      plugins: ['react-native-worklets/plugin'],
    },
  ],
};
