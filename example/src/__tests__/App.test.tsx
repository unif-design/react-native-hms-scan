import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  BackHandler,
  type NativeEventSubscription,
  Text,
} from 'react-native';
import { ConfirmHost, ToastHost, toast } from '@unif/react-native-design';
import {
  decodeImage,
  getCameraPermissionStatus,
  requestCameraPermission,
} from '@unif/react-native-hms-scan';
import { launchImageLibrary } from 'react-native-image-picker';
import App from '../App';
import { AppProviders } from '../app/AppProviders';

jest.mock('@unif/react-native-hms-scan', () =>
  require('@unif/react-native-hms-scan/mock')
);

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const mockedDecodeImage = jest.mocked(decodeImage);
const mockedGetCameraPermissionStatus = jest.mocked(
  getCameraPermissionStatus
);
const mockedRequestCameraPermission = jest.mocked(requestCameraPermission);
const mockedLaunchImageLibrary = jest.mocked(launchImageLibrary);

describe('App showcase shell', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('首页只展示三条能力入口和环境标签，不提前触发设备能力', () => {
    render(<App />);

    expect(screen.getByText('同一个 SDK 的三种使用层级')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /Scanner 成品页/ })
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /HmsScanView 自定义页/ })
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: /decodeImage 图片识别/ })
    ).toBeOnTheScreen();
    expect(screen.getByText('新架构')).toBeOnTheScreen();
    expect(screen.getByText('Android ≥ 24')).toBeOnTheScreen();
    expect(screen.getByText('iOS 真机')).toBeOnTheScreen();
    expect(mockedGetCameraPermissionStatus).not.toHaveBeenCalled();
    expect(mockedRequestCameraPermission).not.toHaveBeenCalled();
    expect(mockedLaunchImageLibrary).not.toHaveBeenCalled();
    expect(mockedDecodeImage).not.toHaveBeenCalled();
  });

  it.each([
    [/Scanner 成品页/, 'Scanner 配置', '进入全屏 Scanner'],
    [/HmsScanView 自定义页/, 'HmsScanView 自定义页', '权限与预览控制'],
    [/decodeImage 图片识别/, 'decodeImage 图片识别', '选择图片并识别'],
  ] as const)('进入入口 %s 后渲染真实页面并可返回首页', (entry, title, marker) => {
    render(<App />);

    fireEvent.press(screen.getByRole('button', { name: entry }));
    expect(screen.getByText(title)).toBeOnTheScreen();
    expect(screen.getByText(marker)).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByText('同一个 SDK 的三种使用层级')).toBeOnTheScreen();
  });

  it('Android hardware back 先关闭 active Scanner，再从配置页返回首页', () => {
    let hardwareBackHandler:
      | Parameters<typeof BackHandler.addEventListener>[1]
      | undefined;
    const hardwareBackEvent = {
      type: 'hardwareBackPress',
      timeStamp: 0,
    };
    const remove = jest.fn();
    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        hardwareBackHandler = handler;
        return { remove } as NativeEventSubscription;
      });

    const { unmount } = render(<App />);

    expect(hardwareBackHandler?.(hardwareBackEvent)).toBe(false);
    fireEvent.press(screen.getByRole('button', { name: /Scanner 成品页/ }));
    fireEvent.press(screen.getByRole('button', { name: '进入全屏 Scanner' }));
    expect(screen.queryByText('Scanner 配置')).toBeNull();

    act(() => {
      expect(hardwareBackHandler?.(hardwareBackEvent)).toBe(true);
    });
    expect(screen.getByText('Scanner 配置')).toBeOnTheScreen();

    act(() => {
      expect(hardwareBackHandler?.(hardwareBackEvent)).toBe(true);
    });
    expect(screen.getByText('同一个 SDK 的三种使用层级')).toBeOnTheScreen();
    expect(hardwareBackHandler?.(hardwareBackEvent)).toBe(false);

    unmount();
    expect(remove).toHaveBeenCalled();
  });
});

describe('AppProviders', () => {
  it('只挂一个 ToastHost，不挂 ConfirmHost', () => {
    const Child = ({ children }: { children?: ReactNode }) => (
      <>
        <Text>provider child</Text>
        {children}
      </>
    );

    render(
      <AppProviders>
        <Child />
      </AppProviders>
    );

    expect(screen.getByText('provider child')).toBeOnTheScreen();
    // 真 ToastHost 空闲时渲染 null（而且重复挂载的那份会被 store 判成非 owner，同样
    // 渲染 null），所以「有且只有一个」只能按组件类型数装配，查不出来。
    expect(screen.UNSAFE_queryAllByType(ToastHost)).toHaveLength(1);
    expect(screen.UNSAFE_queryAllByType(ConfirmHost)).toHaveLength(0);

    // 再用一次真实投递证明这一个 Host 确实活着（装配对但没接上 store 也会静默失效）。
    act(() => {
      toast('已保存');
    });
    expect(screen.getAllByText('已保存')).toHaveLength(1);
  });
});
