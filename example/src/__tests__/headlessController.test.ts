import type {
  CameraPermissionStatus,
  ScanError,
} from '@unif/react-native-hms-scan';
import {
  createHeadlessController,
  type HeadlessDeps,
} from '../showcases/headless/headlessController';

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
  overrides: Partial<HeadlessDeps> = {}
): HeadlessDeps {
  return {
    getStatus: async () => 'granted',
    request: async () => 'granted',
    openSettings: async () => undefined,
    ...overrides,
  };
}

describe('createHeadlessController permission flow', () => {
  it('初次 check 只 query，不自动 request', async () => {
    const getStatus = jest.fn(
      async (): Promise<CameraPermissionStatus> => 'granted'
    );
    const request = jest.fn(
      async (): Promise<CameraPermissionStatus> => 'blocked'
    );
    const controller = createHeadlessController(
      createDeps({ getStatus, request })
    );

    await controller.check('ios');

    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      permission: 'granted',
      nativePermission: 'granted',
      shouldMountView: true,
      canRequest: false,
    });
  });

  it('只有显式 request 才请求权限并接受 blocked 结果', async () => {
    const pending = deferred<CameraPermissionStatus>();
    const request = jest.fn(() => pending.promise);
    const controller = createHeadlessController(createDeps({ request }));

    const operation = controller.request();
    expect(controller.getSnapshot()).toMatchObject({
      permission: 'requesting',
      shouldMountView: false,
      canRequest: false,
    });

    pending.resolve('blocked');
    await operation;

    expect(request).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      permission: 'blocked',
      nativePermission: 'blocked',
      shouldMountView: false,
      canRequest: false,
    });
  });

  it('权限 helper reject 保存普通 ScanError 并保持 fail-closed', async () => {
    const nativeError = Object.assign(new Error('no activity'), {
      code: 'E_NO_ACTIVITY',
    });
    const controller = createHeadlessController(
      createDeps({
        getStatus: async () => {
          throw nativeError;
        },
      })
    );

    await controller.check('android');

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'error',
      error: {
        code: 'E_NO_ACTIVITY',
        message: 'no activity',
      },
      shouldMountView: false,
      canRequest: false,
    });
    expect(controller.getSnapshot().error).not.toBe(nativeError);
  });

  it('request reject 进入可重试的普通权限错误态', async () => {
    const controller = createHeadlessController(
      createDeps({
        request: async () => {
          throw new Error('request failed');
        },
      })
    );

    await controller.request();

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'error',
      error: {
        code: 'E_UNKNOWN',
        message: 'request failed',
      },
      shouldMountView: false,
    });
  });

  it('设置返回 active 后只重新 query，不直接假设 granted', async () => {
    const getStatus = jest.fn(
      async (): Promise<CameraPermissionStatus> => 'granted'
    );
    const request = jest.fn(
      async (): Promise<CameraPermissionStatus> => 'blocked'
    );
    const openSettings = jest.fn(async () => undefined);
    const controller = createHeadlessController(
      createDeps({ getStatus, request, openSettings })
    );
    await controller.request();

    await controller.openSettings();
    expect(controller.getSnapshot().permission).toBe('blocked');
    expect(getStatus).not.toHaveBeenCalled();

    await controller.onAppActive('ios');

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      permission: 'granted',
      nativePermission: 'granted',
      shouldMountView: true,
    });
  });

  it('普通 active 不重新查询权限', async () => {
    const getStatus = jest.fn(
      async (): Promise<CameraPermissionStatus> => 'granted'
    );
    const controller = createHeadlessController(
      createDeps({ getStatus })
    );

    await controller.onAppActive('android');

    expect(getStatus).not.toHaveBeenCalled();
    expect(controller.getSnapshot().permission).toBe('checking');
  });

  it('打开设置失败进入普通权限错误态', async () => {
    const controller = createHeadlessController(
      createDeps({
        openSettings: async () => {
          throw Object.assign(new Error('settings failed'), {
            code: 'E_SETTINGS',
          });
        },
      })
    );

    await controller.openSettings();

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'error',
      error: {
        code: 'E_SETTINGS',
        message: 'settings failed',
      },
      shouldMountView: false,
    });
  });
});

describe('createHeadlessController operation ordering', () => {
  it('较旧 query 晚完成时不能覆盖较新的 request', async () => {
    const olderQuery = deferred<CameraPermissionStatus>();
    const controller = createHeadlessController(
      createDeps({
        getStatus: () => olderQuery.promise,
        request: async () => 'granted',
      })
    );

    const queryOperation = controller.check('android');
    await controller.request();
    olderQuery.resolve('denied');
    await queryOperation;

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'granted',
      nativePermission: 'granted',
      shouldMountView: true,
    });
  });

  it('较旧 request 晚完成时不能覆盖较新的 query', async () => {
    const olderRequest = deferred<CameraPermissionStatus>();
    const controller = createHeadlessController(
      createDeps({
        getStatus: async () => 'denied',
        request: () => olderRequest.promise,
      })
    );

    const requestOperation = controller.request();
    await controller.check('android');
    olderRequest.resolve('granted');
    await requestOperation;

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'denied',
      nativePermission: 'denied',
      shouldMountView: false,
      canRequest: true,
    });
  });
});

describe('createHeadlessController external store', () => {
  it('dispatch 更新快照并只通知仍订阅的 listener', () => {
    const controller = createHeadlessController(createDeps());
    const listener = jest.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.dispatch({
      type: 'setContinuous',
      continuous: true,
    });
    expect(controller.getSnapshot().continuous).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    controller.dispatch({ type: 'setPaused', paused: true });
    expect(controller.getSnapshot().paused).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('权限失效错误立即让 snapshot 停止挂载 view', () => {
    const controller = createHeadlessController(createDeps());
    const permissionError: ScanError = {
      code: 'E_NO_CAMERA_PERMISSION',
      message: 'permission lost',
    };

    controller.dispatch({
      type: 'permissionChecked',
      status: 'granted',
      os: 'android',
    });
    controller.dispatch({ type: 'scanError', error: permissionError });

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'granted',
      needsPermissionRecheck: true,
      shouldMountView: false,
    });
  });
});
