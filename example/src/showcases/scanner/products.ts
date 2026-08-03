import type {
  ScanProduct,
  ScanResult,
} from '@unif/react-native-hms-scan';

const demoProducts: Readonly<Record<string, ScanProduct>> = {
  '6925303773908': {
    name: '阿萨姆原味奶茶 500ml',
    brand: '统一',
    barcode: '6925303773908',
    spec: '500ml × 15 瓶/箱',
    stockShort: '充足',
    price: '¥5.50',
  },
};

export function lookupDemoProduct(
  result: ScanResult
): Promise<ScanProduct | null> {
  const product = demoProducts[result.value];

  return Promise.resolve(product ? { ...product } : null);
}
