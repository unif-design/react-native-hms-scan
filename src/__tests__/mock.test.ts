import {
  decodeImage,
  getCameraPermissionStatus,
  requestCameraPermission,
  HmsScanView,
  Scanner,
  ScanError,
} from '../mock';
test('the published mock uses the same input and result/error contracts', async () => {
  await expect(decodeImage({ uri: 'file:///tmp/a' })).resolves.toEqual([]);
  decodeImage.mockResolvedValueOnce([{ value: '001', format: 'EAN_13' }]);
  await expect(decodeImage({ uri: 'file:///tmp/a' })).resolves.toEqual([
    { value: '001', format: 'EAN_13' },
  ]);
  decodeImage.mockRejectedValueOnce(
    new ScanError({ reason: 'image_unavailable', message: 'gone' })
  );
  await expect(decodeImage({ uri: 'file:///tmp/a' })).rejects.toMatchObject({
    reason: 'image_unavailable',
  });
  await expect(getCameraPermissionStatus()).resolves.toBe('granted');
  await expect(requestCameraPermission()).resolves.toBe('granted');
  expect(HmsScanView({})).toBeNull();
  expect(Scanner({ onConfirm: jest.fn() })).toBeNull();
});
