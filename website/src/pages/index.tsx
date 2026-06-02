import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

import '@unif/react-native-design/docs-home.css';

import {
  IconScan,
  IconGrid,
  IconImage,
  IconClose,
  IconSearch,
  IconFlash,
  IconAlbum,
  IconCheck,
  IconArrowRight,
  IconCopy,
} from '../components/home/icons';

/* ─── Code Window ─── */
type CodeLine = React.ReactNode;

interface CodeWindowProps {
  file: string;
  tag: string;
  hl: number;
  lines: CodeLine[];
}

function CodeWindow({ file, tag, hl, lines }: CodeWindowProps): React.JSX.Element {
  return (
    <div className="hp-code compact">
      <div className="hp-code-bar">
        <span className="hp-code-dots"><i /><i /><i /></span>
        <span className="hp-code-file">{file}</span>
        <span className="hp-code-tag">{tag}</span>
      </div>
      <div className="hp-code-body">
        <pre>
          {lines.map((node, i) => (
            <div key={i} className={'hp-cl' + (hl === i + 1 ? ' hl' : '')}>
              <span className="ln">{i + 1}</span>{node}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/* ─── Phone Mockup ─── */
function Phone({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="hp-phone">
      <div className="hp-screen">
        <div className="hp-notch" />
        {children}
      </div>
    </div>
  );
}

/* ─── Scanner Scene — dark warm "实景" shelf backdrop ─── */
function ScannerScene(): React.JSX.Element {
  const bar = (
    left: string,
    w: number,
    h: number,
    top: string,
    tone: string,
    blur: number,
  ) => (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: w,
        height: h,
        borderRadius: w / 2.4,
        background: `linear-gradient(180deg, ${tone}, rgba(0,0,0,0))`,
        filter: `blur(${blur}px)`,
        opacity: 0.9,
      }}
    />
  );

  return (
    <div className="hp-scene">
      <div className="hp-scene-base" />
      <div className="hp-scene-shelf" />
      {bar('12%', 38, 168, '25%', 'rgba(120,96,70,0.55)', 6)}
      {bar('29%', 46, 188, '21%', 'rgba(150,116,80,0.6)', 4)}
      {bar('45%', 54, 206, '18%', 'rgba(176,132,86,0.72)', 2)}
      {bar('61%', 46, 184, '22%', 'rgba(140,108,76,0.55)', 4)}
      {bar('77%', 38, 164, '26%', 'rgba(110,88,64,0.5)', 7)}
      <div className="hp-scene-vignette" />
    </div>
  );
}

/* ─── Scanner Screen — 扫一扫 UI overlay on ScannerScene ─── */
function ScannerScreen(): React.JSX.Element {
  return (
    <div className="hp-scan">
      <ScannerScene />
      <div className="hp-scan-content">
        <div className="hp-scan-top">
          <span className="hp-scan-disc"><IconClose s={18} /></span>
          <span className="hp-scan-title">扫一扫</span>
          <span className="hp-scan-disc"><IconSearch s={18} /></span>
        </div>
        <div className="hp-scan-stage">
          <div className="hp-scan-frame">
            <span className="hp-corner tl" /><span className="hp-corner tr" />
            <span className="hp-corner bl" /><span className="hp-corner br" />
            <div className="hp-scan-laser" />
          </div>
          <div className="hp-scan-hint">将条码 / 二维码放入框内，自动扫描</div>
        </div>
        <div className="hp-scan-tools">
          <span className="hp-scan-act">
            <span className="hp-scan-disc lg"><IconFlash s={22} /></span>手电筒
          </span>
          <span className="hp-scan-act">
            <span className="hp-scan-disc lg"><IconAlbum s={22} /></span>相册
          </span>
        </div>
      </div>
      <div className="hp-scan-confirm">
        <span className="hp-scan-ok"><IconCheck s={14} /></span>
        <div className="hp-scan-result">
          <div className="r1">识别成功 · 桂花乌龙 500ml</div>
          <div className="r2">6921168·EAN-13</div>
        </div>
        <span className="hp-scan-go"><IconArrowRight s={16} /></span>
      </div>
    </div>
  );
}

/* ─── Install command ─── */
const PKG = '@unif/react-native-hms-scan';

function InstallBlock(): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(`npm install ${PKG} react-native-svg`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="hp-install">
      <span className="dollar">$</span>
      <span>
        npm install <span className="pkg">{PKG}</span>{' '}
        <span className="pkg">react-native-svg</span>
      </span>
      <button
        className={'hp-install-copy' + (copied ? ' copied' : '')}
        title="复制"
        onClick={handleCopy}
      >
        {copied ? <IconCheck s={15} /> : <IconCopy s={15} />}
      </button>
    </div>
  );
}

/* ─── Syntax token helpers ─── */
const K = (kw: string) => <span className="tok-kw">{kw}</span>;
const ST = (s: string) => <span className="tok-str">{s}</span>;
const FN = (s: string) => <span className="tok-fn">{s}</span>;
const DIM = (s: string) => <span className="tok-dim">{s}</span>;

// ScanScreen.tsx — Scanner, highlights the formats line (line 6)
const CODE_LINES: CodeLine[] = [
  <>{K('import')} <span className="tok-id">{'{ Scanner }'}</span> {K('from')} {ST("'@unif/react-native-hms-scan'")}</>,
  <>{' '}</>,
  <>{K('export function')} {FN('ScanScreen')}() {'{'}</>,
  <>{'  '}{K('return')} (</>,
  <>{'    '}{DIM('<')}{FN('Scanner')}</>,
  <>{'      '}formats={'{'}[{ST("'QR_CODE'")}, {ST("'EAN_13'")}]{'}'}</>,
  <>{'      '}onScan={'{'}(r) {DIM('=>')} {FN('save')}(r.value){'}'}</>,
  <>{'    '}{DIM('/>')}</>,
  <>{'  '})</>,
  <>{'}'}</>,
];

/* ─── Feature card data ─── */
interface Feature {
  Icon: React.ComponentType<{ s?: number }>;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  {
    Icon: IconScan,
    title: '成品扫一扫页',
    desc: '开箱即用的 Scanner 组件：取景、识别、浮层确认卡、未识别重试、无权限引导一体化。',
  },
  {
    Icon: IconGrid,
    title: '底层 headless 组件',
    desc: 'HmsScanView 只输出相机预览与扫码事件，取景框 / 按钮等 UI 完全自定义。',
  },
  {
    Icon: IconImage,
    title: '图片识别',
    desc: 'decodeImage(uri) 从本地图片解码条码 / 二维码，支持限定码制，适合相册扫码场景。',
  },
];

/* ─── Page ─── */
export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="Unif HMS Scan — 华为统一扫码"
      description="@unif/react-native-hms-scan — 华为 HMS 统一扫码服务 React Native 封装（新架构）：成品扫一扫页 + 底层 headless 相机组件 + 图片识别。"
    >
      <main className="unif-home">
        {/* ── Hero ── */}
        <section className="hp-hero">
          <div className="hp-hero-split hp-hero-final">
            {/* Copy side */}
            <div className="hp-hero-copy">
              <span className="hp-eyebrow">{PKG}</span>
              <h1 className="hp-title">
                华为统一扫码，<br />
                <span className="accent">定制视图 + 图片识别</span>
              </h1>
              <p className="hp-tagline">
                华为 HMS 统一扫码服务的 React Native 封装（新架构）：成品扫一扫页 + 底层 headless 相机组件 + 图片识别。
              </p>
              <div className="hp-cta-row">
                <Link to="/docs/intro" className="hp-btn hp-btn-primary">
                  开始使用 <span className="hp-arrow"><IconArrowRight s={18} /></span>
                </Link>
                <Link to="/docs/getting-started/quick-start" className="hp-btn hp-btn-outline">
                  快速开始
                </Link>
              </div>
              <InstallBlock />
              <div className="hp-meta-row">
                <span className="hp-chip"><span className="dot" />Scan SDK-Plus</span>
                <span className="hp-chip">ScanKitFrameWork</span>
                <span className="hp-chip">新架构 Fabric</span>
              </div>
            </div>

            {/* Combo side: code window + phone mockup */}
            <div className="hp-combo">
              <div className="hp-combo-code">
                <CodeWindow
                  file="ScanScreen.tsx"
                  tag="Scanner"
                  hl={6}
                  lines={CODE_LINES}
                />
              </div>
              <div className="hp-combo-phone">
                <Phone><ScannerScreen /></Phone>
              </div>
              <span className="hp-combo-badge">
                <span className="dot" />浮层确认卡
              </span>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="hp-features">
          <div className="hp-sec-label">核心能力</div>
          <div className="hp-feature-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {FEATURES.map((f, i) => (
              <div className="hp-feature" key={i}>
                <div className="hp-feat-icon"><f.Icon s={24} /></div>
                <h3 className="hp-feat-title">{f.title}</h3>
                <p className="hp-feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
