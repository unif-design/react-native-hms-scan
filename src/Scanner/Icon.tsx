import Svg, { Circle, Path, Rect } from 'react-native-svg';

// 24×24 线性图标，stroke 1.75 round（沿用 DS 绘制规则）。
// 翻译自设计稿 scan-ui.jsx 的 Icon 集，仅保留聚焦款 + 浅色流程需要的图标。

export type IconName =
  | 'close'
  | 'flash'
  | 'image'
  | 'check'
  | 'warning'
  | 'retry'
  | 'scan'
  | 'camera'
  | 'settings';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** stroke 粗细，默认 1.75。 */
  stroke?: number;
  /** 是否用填充代替描边（flash 点亮时用）。 */
  fill?: boolean;
}

export function Icon({
  name,
  size = 24,
  color = '#FFFFFF',
  stroke = 1.75,
  fill = false,
}: IconProps) {
  const strokeProps = {
    stroke: fill ? 'none' : color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: fill ? color : 'none',
  };
  const lineProps = {
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'close' && <Path {...lineProps} d="M6 6l12 12M18 6L6 18" />}

      {name === 'flash' && (
        <Path {...strokeProps} d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
      )}

      {name === 'image' && (
        <>
          <Rect {...lineProps} x={3} y={3} width={18} height={18} rx={2.5} />
          <Circle {...lineProps} cx={8.5} cy={8.5} r={1.6} />
          <Path {...lineProps} d="M21 15.5l-5-5L5 21" />
        </>
      )}

      {name === 'check' && <Path {...lineProps} d="M5 12.5l4.2 4.2L19 7" />}

      {name === 'warning' && (
        <>
          <Path {...lineProps} d="M12 3.5l9 16H3l9-16z" />
          <Path {...lineProps} d="M12 10v4.5M12 17.5h.01" />
        </>
      )}

      {name === 'retry' && (
        <>
          <Path {...lineProps} d="M20 8a8 8 0 1 0 1.5 6" />
          <Path {...lineProps} d="M20 3.5V8h-4.5" />
        </>
      )}

      {name === 'scan' && (
        <Path
          {...lineProps}
          d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"
        />
      )}

      {name === 'camera' && (
        <>
          <Path
            {...lineProps}
            d="M3 8.5A2 2 0 0 1 5 6.5h2l1.2-2h7.6L17 6.5h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9z"
          />
          <Circle {...lineProps} cx={12} cy={12.5} r={3.4} />
        </>
      )}

      {name === 'settings' && (
        <>
          <Circle {...lineProps} cx={12} cy={12} r={3} />
          <Path
            {...lineProps}
            d="M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V19a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 17.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"
          />
        </>
      )}
    </Svg>
  );
}
