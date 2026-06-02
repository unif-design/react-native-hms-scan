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
          <span className="unif-hero__pill">@UNIF/REACT-NATIVE-HMS-SCAN · v0.1</span>
          <h1 className="unif-hero__title">Unif HMS Scan</h1>
          <p className="unif-hero__lede">
            华为 HMS 统一扫码服务 React Native 桥：定制视图扫码 + 图片识别,基于 Scan SDK-Plus / ScanKitFrameWork。
          </p>
          <div className="unif-hero__ctas">
            <Link to="/docs/intro" className="unif-hero__cta unif-hero__cta--primary">
              开始使用 →
            </Link>
          </div>
        </div>
      </header>
    </Layout>
  );
}
