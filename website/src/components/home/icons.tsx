import React from 'react';

// Stroke SVG icon set — viewBox 24, strokeWidth 1.75, round caps.
// All inherit currentColor.

type IconProps = { s?: number };

const _svg = (
  s: number,
  children: React.ReactNode,
): React.JSX.Element => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

// mark icon — scan corners + horizontal line
export function IconScan({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <path d="M4 8V5a1 1 0 0 1 1-1h3" />
    <path d="M16 4h3a1 1 0 0 1 1 1v3" />
    <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
    <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
    <path d="M4 12h16" />
  </>);
}

// feature: 成品扫一扫页 (reuse scan icon)
export { IconScan as IconScanFeature };

// feature: 底层 headless 组件 (4-square grid)
export function IconGrid({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <rect x={4} y={4} width={7} height={7} rx={1} />
    <rect x={13} y={4} width={7} height={7} rx={1} />
    <rect x={4} y={13} width={7} height={7} rx={1} />
    <rect x={13} y={13} width={7} height={7} rx={1} />
  </>);
}

// feature: 图片识别 (image frame + mountain)
export function IconImage({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <rect x={3} y={4} width={18} height={16} rx={2} />
    <circle cx={9} cy={10} r={2} />
    <path d="M21 15l-5-5L4 20" />
  </>);
}

// ScannerScreen toolbar: close
export function IconClose({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </>);
}

// ScannerScreen toolbar: search
export function IconSearch({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <circle cx={11} cy={11} r={7} />
    <path d="M16.5 16.5L21 21" />
  </>);
}

// ScannerScreen tools: flash / torch
export function IconFlash({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <path d="M13 2L4 14h7l-1 8 9-12h-7z" />);
}

// ScannerScreen tools: album / image
export function IconAlbum({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <rect x={3} y={4} width={18} height={16} rx={2} />
    <circle cx={9} cy={10} r={2} />
    <path d="M21 15l-5-5L4 20" />
  </>);
}

// confirm card: check mark
export function IconCheck({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <path d="M20 6L9 17l-5-5" />);
}

// confirm card + CTA: arrow right
export function IconArrowRight({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <path d="M5 12h14" />
    <path d="M13 5l7 7-7 7" />
  </>);
}

// install copy button
export function IconCopy({ s = 24 }: IconProps): React.JSX.Element {
  return _svg(s, <>
    <rect x={8} y={8} width={13} height={13} rx={2} />
    <path d="M4 16V5a2 2 0 0 1 2-2h11" />
  </>);
}
