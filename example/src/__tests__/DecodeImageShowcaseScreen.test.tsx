import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  decodeImage,
  HmsScanError,
  type ScanResult,
} from '@unif/react-native-hms-scan';
import { launchImageLibrary } from 'react-native-image-picker';
import { DecodeImageShowcaseScreen } from '../showcases/decode-image/DecodeImageShowcaseScreen';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const mockDecodeImage = jest.mocked(decodeImage);
const mockLaunchImageLibrary = jest.mocked(launchImageLibrary);

const results: readonly ScanResult[] = [
  {
    value: 'https://unif.example/scan',
    format: 'QR_CODE',
    contentType: 'URL',
  },
  {
    value: '6925303773908',
    format: 'EAN_13',
    contentType: 'OTHER',
  },
];

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function renderScreen() {
  render(<DecodeImageShowcaseScreen onBack={jest.fn()} />);
}

beforeEach(() => {
  mockDecodeImage.mockReset().mockResolvedValue([]);
  mockLaunchImageLibrary.mockReset().mockResolvedValue({
    assets: [{ uri: 'file:///qr.png' }],
  });
});

it('picking 与 decoding 期间禁用开始按钮和 format preset', async () => {
  const pendingPick = deferred<Awaited<ReturnType<typeof launchImageLibrary>>>();
  const pendingDecode = deferred<ScanResult[]>();
  mockLaunchImageLibrary.mockReturnValueOnce(pendingPick.promise);
  mockDecodeImage.mockReturnValueOnce(pendingDecode.promise);
  renderScreen();

  fireEvent.press(screen.getByRole('button', { name: '选择图片并识别' }));
  expect(screen.getByRole('button', { name: '选择图片并识别' })).toBeDisabled();
  expect(screen.getByRole('tab', { name: '全部' })).toBeDisabled();
  expect(screen.getByText('正在选择图片…')).toBeOnTheScreen();

  await act(async () => {
    pendingPick.resolve({ assets: [{ uri: 'file:///pending.png' }] });
    await Promise.resolve();
  });
  expect(screen.getByRole('button', { name: '选择图片并识别' })).toBeDisabled();
  expect(screen.getByRole('tab', { name: '全部' })).toBeDisabled();
  expect(screen.getByText('正在识别图片…')).toBeOnTheScreen();

  await act(async () => {
    pendingDecode.resolve([]);
    await pendingDecode.promise;
  });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: '选择图片并识别' })).toBeEnabled()
  );
});

it('official mock 的空数组显示正常 Empty，不显示错误', async () => {
  renderScreen();
  fireEvent.press(screen.getByRole('button', { name: '选择图片并识别' }));

  await screen.findByText('图片中未识别到条码');
  expect(screen.queryByText('图片识别失败')).toBeNull();
});

it('success 完整列出每条 value、format 与 contentType', async () => {
  mockDecodeImage.mockResolvedValueOnce([...results]);
  renderScreen();
  fireEvent.press(screen.getByRole('button', { name: '选择图片并识别' }));

  for (const result of results) {
    expect(await screen.findByText(result.value)).toBeOnTheScreen();
    expect(screen.getByText(`码制：${result.format}`)).toBeOnTheScreen();
    expect(screen.getByText(`内容类型：${result.contentType}`)).toBeOnTheScreen();
  }
});

it('HmsScanError 显示真实 code/message，普通 Error 只显示通用错误', async () => {
  mockDecodeImage.mockRejectedValueOnce(
    new HmsScanError('E_IMAGE_LOAD_FAILED', 'load failed')
  );
  renderScreen();
  fireEvent.press(screen.getByRole('button', { name: '选择图片并识别' }));
  expect(await screen.findByText('E_IMAGE_LOAD_FAILED')).toBeOnTheScreen();
  expect(screen.getByText('load failed')).toBeOnTheScreen();

  mockLaunchImageLibrary.mockRejectedValueOnce(new Error('picker internals'));
  fireEvent.press(screen.getByRole('button', { name: '选择图片并识别' }));
  expect(await screen.findByText('图片识别失败')).toBeOnTheScreen();
  expect(screen.getByText('选择或识别图片失败，请重试。')).toBeOnTheScreen();
  expect(screen.queryByText('picker internals')).toBeNull();
});
