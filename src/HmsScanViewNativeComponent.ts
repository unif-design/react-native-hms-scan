import type { ViewProps } from 'react-native';
import type {
  DirectEventHandler,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// RN codegen Fabric 组件规范（注册名 "HmsScanView"）。
// 事件 payload 都用基础类型 / 单字符串，绕开 codegen 对复杂事件结构的限制：
// 扫码结果以 JSON 字符串回传（由 src/HmsScanView.tsx 解析成 ScanResult[]）。

type ScanResultEvent = Readonly<{
  /** JSON 编码的 ScanResult[]。 */
  resultsJson: string;
}>;

type ScanErrorEvent = Readonly<{
  code: string;
  message: string;
}>;

type TorchStatusEvent = Readonly<{
  /** 环境是否暗到建议显示手电按钮（Android OnLightVisibleCallBack）。 */
  available: boolean;
  /** 手电当前是否点亮。 */
  on: boolean;
}>;

export interface NativeProps extends ViewProps {
  /** 限定码制（逗号分隔的 BarcodeFormat），空串 = 全部。 */
  formatsCsv?: WithDefault<string, ''>;
  /** 连续扫码（命中后继续，不自动停）。 */
  continuous?: WithDefault<boolean, true>;
  /** 暂停/恢复扫码（命中后想停在结果卡时用）。 */
  paused?: WithDefault<boolean, false>;
  /** 手电筒（Android 直接控制；iOS 走 AVCaptureDevice 尽力补）。 */
  torch?: WithDefault<boolean, false>;

  onScanResult?: DirectEventHandler<ScanResultEvent>;
  onScanError?: DirectEventHandler<ScanErrorEvent>;
  onTorchStatus?: DirectEventHandler<TorchStatusEvent>;
}

export default codegenNativeComponent<NativeProps>('HmsScanView');
