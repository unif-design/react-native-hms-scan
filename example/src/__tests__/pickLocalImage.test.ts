import {
  launchImageLibrary,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { pickLocalImage } from '../shared/pickLocalImage';

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const mockLaunch = launchImageLibrary as jest.MockedFunction<
  typeof launchImageLibrary
>;

const selectedAsset: NonNullable<ImagePickerResponse['assets']>[number] = {
  uri: 'content://media/external/images/1',
  fileName: 'qr.png',
  type: 'image/png',
  width: 512,
  height: 512,
  fileSize: 1024,
};

beforeEach(() => {
  mockLaunch.mockReset();
});

describe('pickLocalImage', () => {
  it('只选择一张照片并返回本地 URI，不请求 base64', async () => {
    mockLaunch.mockResolvedValueOnce({
      didCancel: false,
      assets: [selectedAsset],
    });

    await expect(pickLocalImage()).resolves.toBe(
      'content://media/external/images/1'
    );

    expect(mockLaunch).toHaveBeenCalledTimes(1);
    expect(mockLaunch).toHaveBeenCalledWith({
      mediaType: 'photo',
      selectionLimit: 1,
    });
    expect(mockLaunch.mock.calls[0]?.[0]).not.toHaveProperty(
      'includeBase64'
    );
  });

  it('用户取消时返回 null，即使响应里仍带 asset', async () => {
    mockLaunch.mockResolvedValueOnce({
      didCancel: true,
      assets: [selectedAsset],
    });

    await expect(pickLocalImage()).resolves.toBeNull();
  });

  it('assets 为空时返回 null', async () => {
    mockLaunch.mockResolvedValueOnce({
      didCancel: false,
      assets: [],
    });

    await expect(pickLocalImage()).resolves.toBeNull();
  });

  it('首个 asset 缺少 uri 时返回 null', async () => {
    mockLaunch.mockResolvedValueOnce({
      didCancel: false,
      assets: [
        {
          fileName: 'qr.png',
          type: 'image/png',
          width: 512,
          height: 512,
          fileSize: 1024,
        },
      ],
    });

    await expect(pickLocalImage()).resolves.toBeNull();
  });
});
