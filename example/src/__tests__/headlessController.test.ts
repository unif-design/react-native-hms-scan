import { ScanError } from '@unif/react-native-hms-scan';
import type {
  ScanCameraPermission,
  ScanFailure,
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

function createDeps(overrides: Partial<HeadlessDeps> = {}): HeadlessDeps {
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
      async (): Promise<ScanCameraPermission> => 'granted'
    );
    const request = jest.fn(
      async (): Promise<ScanCameraPermission> => 'blocked'
    );
    const controller = createHeadlessController(
      createDeps({ getStatus, request })
    );

    await controller.check();

    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      permission: 'granted',
      nativePermission: 'granted',
      shouldMountView: true,
      canRequest: false,
    });
  });

  it('初次 query blocked 直接进入设置态且不 request', async () => {
    const getStatus = jest.fn(
      async (): Promise<ScanCameraPermission> => 'blocked'
    );
    const request = jest.fn(
      async (): Promise<ScanCameraPermission> => 'granted'
    );
    const controller = createHeadlessController(
      createDeps({ getStatus, request })
    );

    await controller.check();

    expect(getStatus).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    expect(controller.getSnapshot()).toMatchObject({
      permission: 'blocked',
      nativePermission: 'blocked',
      shouldMountView: false,
      canRequest: false,
    });
  });

  it('query denied 进入可请求态', async () => {
    const controller = createHeadlessController(
      createDeps({ getStatus: async () => 'denied' })
    );

    await controller.check();

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'denied',
      nativePermission: 'denied',
      shouldMountView: false,
      canRequest: true,
    });
  });

  it('只有显式 request 才请求权限并接受 blocked 结果', async () => {
    const pending = deferred<ScanCameraPermission>();
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

  it('权限 helper reject 保存普通 ScanFailure 并保持 fail-closed', async () => {
    const nativeError = new ScanError({
      reason: 'unavailable',
      message: 'no activity',
    });
    const controller = createHeadlessController(
      createDeps({
        getStatus: async () => {
          throw nativeError;
        },
      })
    );

    await controller.check();

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'error',
      error: {
        reason: 'unavailable',
        message: 'no activity',
      },
      shouldMountView: false,
      canRequest: false,
    });
    expect(controller.getSnapshot().error).toBe(nativeError);
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
        reason: 'unavailable',
        message: 'request failed',
      },
      shouldMountView: false,
    });
  });

  it('设置返回 active 后只重新 query，不直接假设 granted', async () => {
    const getStatus = jest.fn(
      async (): Promise<ScanCameraPermission> => 'granted'
    );
    const request = jest.fn(
      async (): Promise<ScanCameraPermission> => 'blocked'
    );
    const openSettings = jest.fn(async () => undefined);
    const controller = createHeadlessController(
      createDeps({ getStatus, request, openSettings })
    );
    await controller.request();

    await controller.openSettings();
    expect(controller.getSnapshot().permission).toBe('blocked');
    expect(getStatus).not.toHaveBeenCalled();

    await controller.onAppActive();

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
      async (): Promise<ScanCameraPermission> => 'granted'
    );
    const controller = createHeadlessController(createDeps({ getStatus }));

    await controller.onAppActive();

    expect(getStatus).not.toHaveBeenCalled();
    expect(controller.getSnapshot().permission).toBe('checking');
  });

  it('打开设置失败进入普通权限错误态', async () => {
    const controller = createHeadlessController(
      createDeps({
        openSettings: async () => {
          throw Object.assign(new Error('settings failed'), {
            reason: 'unavailable',
          });
        },
      })
    );

    await controller.openSettings();

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'error',
      error: {
        reason: 'unavailable',
        message: 'settings failed',
      },
      shouldMountView: false,
    });
  });
});

describe('createHeadlessController operation ordering', () => {
  it('较旧 query 晚完成时不能覆盖较新的 request', async () => {
    const olderQuery = deferred<ScanCameraPermission>();
    const controller = createHeadlessController(
      createDeps({
        getStatus: () => olderQuery.promise,
        request: async () => 'granted',
      })
    );

    const queryOperation = controller.check();
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
    const olderRequest = deferred<ScanCameraPermission>();
    const controller = createHeadlessController(
      createDeps({
        getStatus: async () => 'denied',
        request: () => olderRequest.promise,
      })
    );

    const requestOperation = controller.request();
    await controller.check();
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
    const permissionError: ScanFailure = {
      reason: 'permission_denied',
      message: 'permission lost',
    };

    controller.dispatch({
      type: 'permissionChecked',
      status: 'granted',
    });
    controller.dispatch({ type: 'scanError', error: permissionError });

    expect(controller.getSnapshot()).toMatchObject({
      permission: 'granted',
      needsPermissionRecheck: true,
      shouldMountView: false,
    });
  });

  it('fatal view error 只有 retry 才递增 view generation', () => {
    const controller = createHeadlessController(createDeps());
    controller.dispatch({
      type: 'permissionChecked',
      status: 'granted',
    });

    controller.dispatch({
      type: 'scanError',
      error: { reason: 'unavailable', message: 'camera init failed' },
    });
    expect(controller.getSnapshot().viewGeneration).toBe(0);

    controller.dispatch({ type: 'retry' });
    expect(controller.getSnapshot()).toMatchObject({
      paused: false,
      error: null,
      viewGeneration: 1,
      shouldMountView: true,
    });
  });
});
