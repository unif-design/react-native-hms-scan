import { render, renderHook } from '@testing-library/react-native';
import { ThemeProvider, useColors } from '@unif/react-native-design';
import { ResultFocus } from '../Scanner/ResultFocus';
import type { ScanProduct } from '../types';

// 结果卡内「要被读到」的文字（条码号、价格副标题）必须用可读级 foregroundMuted，
// 不能用 hairline 级 foregroundSubtle —— 后者在暗色卡片(surface #1C1C1E)上对比仅
// 2.48:1（AA 正文需 4.5:1）→ 看不清。
// 断言比的是真实 design token：组件与 useColors 挂在同一个 ThemeProvider 下，选错
// token 名就会红；真实暗色对比度由 design token 自身保证（muted 60% 白 = 5.94:1 过
// AA、subtle 30% 白 = 2.48:1 不过）。
const product: ScanProduct = {
  name: '阿萨姆原味奶茶 500ml',
  barcode: '6925303773908',
  price: '¥5.50',
};

const renderFocus = () =>
  render(
    <ResultFocus
      product={product}
      detectMs={0}
      bottomInset={0}
      onRescan={() => {}}
      onConfirm={() => {}}
    />,
    { wrapper: ThemeProvider }
  );

test('结果卡条码号用可读级 foregroundMuted（非 hairline foregroundSubtle）', () => {
  const { result } = renderHook(() => useColors(), { wrapper: ThemeProvider });
  const { getByText } = renderFocus();
  expect(getByText('6925303773908')).toHaveStyle({ color: result.current.foregroundMuted });
});

test('结果卡价格副标题「建议零售」用可读级 foregroundMuted', () => {
  const { result } = renderHook(() => useColors(), { wrapper: ThemeProvider });
  const { getByText } = renderFocus();
  expect(getByText('建议零售')).toHaveStyle({ color: result.current.foregroundMuted });
});
