import { fireEvent, render, waitFor } from '@testing-library/react-native';

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

test('web Scanner reports unsupported once and exposes optional close', () => {
  const { Scanner } = require('../Scanner/Scanner.web');
  const onError = jest.fn();
  const onClose = jest.fn();
  const view = render(<Scanner onError={onError} onClose={onClose} />);
  expect(onError).toHaveBeenCalledWith(
    expect.objectContaining({ reason: 'unsupported' })
  );
  fireEvent.press(view.getByRole('button', { name: '返回' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  view.rerender(<Scanner />);
  expect(view.queryByRole('button')).toBeNull();
  expect(onError).toHaveBeenCalledTimes(1);
  view.unmount();
  render(<Scanner />);
});
