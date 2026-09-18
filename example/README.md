# HMS Scan 示例

展示成品扫码页面、自定义扫码界面和本地图片识别三种用法。

## 运行

以下命令在仓库根目录执行：

```sh
yarn install --immutable --mode=skip-build
yarn example start
```

iOS 首次运行先准备 Pods：

```sh
(cd example && bundle install)
(cd example && bundle exec pod install --project-directory=ios)
```

构建与完整测试由 CI 执行。开展真机测试时使用 `yarn example android` 或 `yarn example ios`；iOS 仅选择物理 iPhone。原生配置见[安装指南](../website/docs/getting-started/installation.md)。

## 示例内容

| 入口        | 可以验证什么                             |
| ----------- | ---------------------------------------- |
| Scanner     | 码制、自动确认、相册选择和结果确认       |
| HmsScanView | 宿主权限、暂停、连续扫描、手电与错误反馈 |
| decodeImage | 本地选图、识别结果、空结果与解码错误     |

图片选择器和商品表属于示例。商品演示中，EAN-13 `6925303773908` 对应“统一 阿萨姆原味奶茶 500ml”；其他条码返回未匹配。真实业务自行提供数据与导航。

## 接入与验证

- [Scanner API](../website/docs/api/scanner.md)：成品页面参数和回调。
- [HmsScanView API](../website/docs/api/hms-scan-view.md)：自定义界面的预览与事件。
- [函数 API](../website/docs/api/functions.md)：图片 URI、权限、空结果和错误语义。
- [开发资料](../docs/DEVELOPMENT.md)：新版本契约、测试和源码入口。

图片选择取消不属于识别失败；解码错误不转换成空数组。JS 测试不能代替实际摄像头、离线解码及原生回调验证。
