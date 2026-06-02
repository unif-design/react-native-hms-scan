import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Unif HMS Scan"
      description="@unif/react-native-hms-scan — 华为统一扫码(定制视图 + 图片识别)"
    >
      <header className="unif-hero">
        <div className="unif-hero__inner">
          <span className="unif-hero__pill">@UNIF/REACT-NATIVE-HMS-SCAN</span>
          <h1 className="unif-hero__title">华为统一扫码 · 定制视图 + 图片识别</h1>
          <p className="unif-hero__lede">
            华为 HMS 统一扫码服务 React Native 封装（新架构）：成品扫一扫页 + 底层 headless 相机组件 + 图片识别，基于 Scan SDK-Plus / ScanKitFrameWork。
          </p>
          <div className="unif-hero__ctas">
            <Link to="/docs/intro" className="unif-hero__cta unif-hero__cta--primary">
              开始使用 →
            </Link>
          </div>
        </div>
      </header>

      <main className="unif-features">
        <div className="unif-features__grid">
          <div className="unif-features__card">
            <h3>成品扫一扫页</h3>
            <p>
              开箱即用的 <code>&lt;Scanner&gt;</code> 组件——取景、识别、浮层确认卡、未识别重试、无权限引导一体化。
            </p>
            <Link to="/docs/guides/scanner">查看指南 →</Link>
          </div>
          <div className="unif-features__card">
            <h3>底层 headless 组件</h3>
            <p>
              <code>&lt;HmsScanView&gt;</code> 只输出相机预览与扫码事件，取景框 / 按钮等 UI 完全自定义。
            </p>
            <Link to="/docs/guides/headless">查看指南 →</Link>
          </div>
          <div className="unif-features__card">
            <h3>图片识别</h3>
            <p>
              <code>decodeImage(uri)</code> 从本地图片解码条码 / 二维码，支持限定码制，适合相册扫码场景。
            </p>
            <Link to="/docs/guides/decode-image">查看指南 →</Link>
          </div>
        </div>
      </main>
    </Layout>
  );
}
