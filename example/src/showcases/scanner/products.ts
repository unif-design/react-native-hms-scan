import type {
  ScanProduct,
  ScanResult,
} from '@unif/react-native-hms-scan';

export const DEMO_BARCODE = '6925303773908';

export const DEMO_PRODUCT: ScanProduct = {
  name: '阿萨姆原味奶茶 500ml',
  brand: '统一',
  barcode: DEMO_BARCODE,
  spec: '500ml × 15 瓶/箱',
  stockShort: '充足',
  price: '¥5.50',
};

const demoProducts: Readonly<Record<string, ScanProduct>> = {
  [DEMO_BARCODE]: DEMO_PRODUCT,
};

export function lookupDemoProduct(
  result: ScanResult
): Promise<ScanProduct | null> {
  const product = demoProducts[result.value];

  return Promise.resolve(product ? { ...product } : null);
}
