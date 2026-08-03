import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  BackHandler,
  type NativeEventSubscription,
  Text,
} from 'react-native';
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
    [/Scanner 成品页/, 'Scanner 配置'],
    [/HmsScanView 自定义页/, 'HmsScanView 自定义页'],
    [/decodeImage 图片识别/, 'decodeImage 图片识别'],
  ] as const)('进入入口 %s 后可通过可访问返回按钮回首页', (entry, title) => {
    render(<App />);

    fireEvent.press(screen.getByRole('button', { name: entry }));
    expect(screen.getByText(title)).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByText('同一个 SDK 的三种使用层级')).toBeOnTheScreen();
  });

  it('Android hardware back 只在二级 route 消费事件', () => {
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
    expect(screen.getAllByTestId('design-toast-host')).toHaveLength(1);
    expect(screen.queryByTestId('design-confirm-host')).toBeNull();
  });
});
