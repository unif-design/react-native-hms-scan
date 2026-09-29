import { render, waitFor } from '@testing-library/react-native';

jest.mock('../NativeHmsScan', () => {
  throw new Error('Web loaded TurboModule');
});
jest.mock('../HmsScanViewNativeComponent', () => {
  throw new Error('Web loaded Fabric');
});

test('the browser entry loads without native modules and reports unsupported operations', async () => {
  const web = require('../index.web') as typeof import('../index');
  await expect(web.decodeImage({ uri: 'file:///tmp/a' })).rejects.toMatchObject(
    { reason: 'unsupported' }
  );
  await expect(web.getCameraPermissionStatus()).rejects.toMatchObject({
    reason: 'unsupported',
  });
  await expect(web.requestCameraPermission()).rejects.toMatchObject({
    reason: 'unsupported',
  });
  const onError = jest.fn();
  render(<web.HmsScanView onScanError={onError} />);
  await waitFor(() =>
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'unsupported' })
    )
  );
});
