import { render, renderHook } from '@testing-library/react-native';
import { useColors } from '@unif/react-native-design';
import { ResultFocus } from '../Scanner/ResultFocus';
import type { ScanProduct } from '../types';

// 结果卡内「要被读到」的文字（条码号、价格副标题）必须用可读级 foregroundMuted，
// 不能用 hairline 级 foregroundSubtle —— 后者在暗色卡片(surface #1C1C1E)上对比仅
// 2.48:1（AA 正文需 4.5:1）→ 看不清。
// 注：design 在 jest 里被 setup mock 成固定 token（ThemeProvider no-op、useColors 返回
// 固定 colors），故此处验证的是「组件选了哪个 token 名」；真实暗色对比度由 design token
// 自身保证（muted 60% 白 = 5.94:1 过 AA、subtle 30% 白 = 2.48:1 不过）。
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
    />
  );

test('结果卡条码号用可读级 foregroundMuted（非 hairline foregroundSubtle）', () => {
  const { result } = renderHook(() => useColors());
  const { getByText } = renderFocus();
  expect(getByText('6925303773908')).toHaveStyle({ color: result.current.foregroundMuted });
});

test('结果卡价格副标题「建议零售」用可读级 foregroundMuted', () => {
  const { result } = renderHook(() => useColors());
  const { getByText } = renderFocus();
  expect(getByText('建议零售')).toHaveStyle({ color: result.current.foregroundMuted });
});
