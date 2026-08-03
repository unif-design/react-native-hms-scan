import {
  decodeImage,
  HmsScanError,
  type BarcodeFormat,
  type ScanResult,
} from '@unif/react-native-hms-scan';
import {
  createDecodeController,
  type DecodeDeps,
} from '../showcases/decode-image/decodeController';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

const mockDecodeImage = decodeImage as jest.MockedFunction<
  typeof decodeImage
>;

const qrResult: ScanResult = {
  value: 'https://unif.example/scan',
  format: 'QR_CODE',
  contentType: 'URL',
  cornerPoints: [
    { x: 12, y: 24 },
    { x: 212, y: 24 },
    { x: 212, y: 88 },
    { x: 12, y: 88 },
  ],
};

const eanResult: ScanResult = {
  value: '6925303773908',
  format: 'EAN_13',
  contentType: 'OTHER',
  cornerPoints: [
    { x: 20, y: 30 },
    { x: 180, y: 30 },
    { x: 180, y: 90 },
    { x: 20, y: 90 },
  ],
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createDeps(
  overrides: Partial<DecodeDeps> = {}
): DecodeDeps {
  return {
    pickImage: async () => 'file:///qr.png',
    ...overrides,
  };
}

beforeEach(() => {
  mockDecodeImage.mockReset().mockResolvedValue([]);
});

describe('createDecodeController lifecycle', () => {
  it('picking 与 decoding 期间禁止再次开始，完成后恢复', async () => {
    const pendingPick = deferred<string | null>();
    const pendingDecode = deferred<ScanResult[]>();
    const controller = createDecodeController(
      createDeps({ pickImage: () => pendingPick.promise })
    );
    mockDecodeImage.mockReturnValueOnce(pendingDecode.promise);

    const operation = controller.pickAndDecode(['QR_CODE']);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'picking',
      canStart: false,
    });

    pendingPick.resolve('file:///qr.png');
    await Promise.resolve();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'decoding',
      selectedUri: 'file:///qr.png',
      canStart: false,
    });

    pendingDecode.resolve([]);
    await operation;
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'empty',
      canStart: true,
    });
  });

  it('用户取消选择回到 idle，且不调用 decodeImage', async () => {
    const controller = createDecodeController(
      createDeps({ pickImage: async () => null })
    );

    await controller.pickAndDecode(['QR_CODE']);

    expect(mockDecodeImage).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'idle',
      selectedUri: null,
      results: [],
      error: null,
      canStart: true,
    });
  });

  it('传入 formats 时只把本地 URI 和 formats options 交给 decodeImage', async () => {
    const formats: readonly BarcodeFormat[] = ['QR_CODE'];
    mockDecodeImage.mockResolvedValueOnce([qrResult, eanResult]);
    const controller = createDecodeController(createDeps());

    await controller.pickAndDecode(formats);

    expect(mockDecodeImage).toHaveBeenCalledTimes(1);
    expect(mockDecodeImage).toHaveBeenCalledWith('file:///qr.png', {
      formats,
    });
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'success',
      selectedUri: 'file:///qr.png',
      results: [qrResult, eanResult],
      error: null,
      canStart: true,
    });
  });

  it('全部码制时省略 options，并将 [] 保存为正常 empty 状态', async () => {
    mockDecodeImage.mockResolvedValueOnce([]);
    const controller = createDecodeController(createDeps());

    await controller.pickAndDecode();

    expect(mockDecodeImage).toHaveBeenCalledTimes(1);
    expect(mockDecodeImage).toHaveBeenCalledWith('file:///qr.png');
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'empty',
      results: [],
      error: null,
      canStart: true,
    });
  });

  it('保存 HmsScanError 的公开 code 与 message', async () => {
    mockDecodeImage.mockRejectedValueOnce(
      new HmsScanError('E_IMAGE_LOAD_FAILED', 'load failed')
    );
    const controller = createDecodeController(createDeps());

    await controller.pickAndDecode();

    expect(controller.getSnapshot()).toMatchObject({
      phase: 'error',
      error: {
        kind: 'hms',
        code: 'E_IMAGE_LOAD_FAILED',
        message: 'load failed',
      },
      canStart: true,
    });
  });

  it('普通 picker Error 保存为 unexpected，且不伪造 HMS code', async () => {
    const controller = createDecodeController(
      createDeps({
        pickImage: async () => {
          throw new Error('picker failed');
        },
      })
    );

    await controller.pickAndDecode();

    expect(mockDecodeImage).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'error',
      error: {
        kind: 'unexpected',
        message: 'picker failed',
      },
      canStart: true,
    });
    expect(controller.getSnapshot().error).not.toHaveProperty('code');
  });
});

describe('createDecodeController operation ordering', () => {
  it('较旧解码晚完成时不能覆盖较新选择的结果', async () => {
    const olderDecode = deferred<ScanResult[]>();
    const pickImage = jest
      .fn<Promise<string | null>, []>()
      .mockResolvedValueOnce('file:///old.png')
      .mockResolvedValueOnce('file:///new.png');
    mockDecodeImage
      .mockReturnValueOnce(olderDecode.promise)
      .mockResolvedValueOnce([eanResult]);
    const controller = createDecodeController(createDeps({ pickImage }));

    const olderOperation = controller.pickAndDecode();
    await Promise.resolve();
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'decoding',
      selectedUri: 'file:///old.png',
      activeToken: 1,
    });

    await controller.pickAndDecode(['EAN_13']);
    expect(controller.getSnapshot()).toMatchObject({
      phase: 'success',
      selectedUri: 'file:///new.png',
      results: [eanResult],
      activeToken: 2,
    });

    olderDecode.resolve([qrResult]);
    await olderOperation;

    expect(controller.getSnapshot()).toMatchObject({
      phase: 'success',
      selectedUri: 'file:///new.png',
      results: [eanResult],
      activeToken: 2,
    });
  });
});

describe('createDecodeController external store', () => {
  it('状态变化只通知仍订阅的 listener', async () => {
    const controller = createDecodeController(createDeps());
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    await controller.pickAndDecode();
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    await controller.pickAndDecode();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
