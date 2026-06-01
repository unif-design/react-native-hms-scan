import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Scanner,
  type ScanProduct,
  type ScanResult,
} from '@unif/react-native-hms-scan';

// 演示用的假商品库（真实场景应查接口 / 本地数据库）
const FAKE_DB: Record<string, ScanProduct> = {
  '6925303773908': {
    name: '阿萨姆原味奶茶 500ml',
    brand: '统一',
    price: '¥5.50',
    spec: '500ml × 15 瓶/箱',
    stockShort: '充足',
  },
};

export default function App() {
  const [scanning, setScanning] = useState(false);
  const [last, setLast] = useState<string>('（尚未扫描）');

  if (scanning) {
    return (
      <Scanner
        title="扫一扫"
        onClose={() => setScanning(false)}
        resolveProduct={(r: ScanResult) =>
          FAKE_DB[r.value] ?? { name: `未知商品`, barcode: r.value }
        }
        onConfirm={(product, result) => {
          setLast(`${product.name} (${result.value})`);
          setScanning(false);
          Alert.alert('已确认', `${product.name}\n${result.value}`);
        }}
      />
    );
  }

  return (
    <View style={styles.home}>
      <Text style={styles.title}>HMS 扫码示例</Text>
      <Text style={styles.last}>上次结果：{last}</Text>
      <Pressable style={styles.btn} onPress={() => setScanning(true)}>
        <Text style={styles.btnText}>打开扫一扫</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  home: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
    rowGap: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#333' },
  last: { fontSize: 14, color: '#666' },
  btn: {
    height: 48,
    paddingHorizontal: 28,
    borderRadius: 12,
    backgroundColor: '#EB6E00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
