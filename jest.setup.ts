// design 的 peer 接线(RNGH 官方 jestSetup、worklets / safe-area 官方 mock、真实
// reanimated + setUpTests)由 `@unif/react-native-design/jest-preset` 带进
// setupFilesAfterEnv,本仓不再自己拼,也不再把 design 整包 mock 成桩 —— 测试渲染的是
// 真实 design 组件。
// 本文件留给本仓特有的替身;当前一个都不需要 —— 原生边界、权限与 decodeImage 都在
// 各自用例里就近 mock。

export {};
