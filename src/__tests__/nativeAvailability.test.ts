jest.mock('react-native', () => ({ TurboModuleRegistry: { get: () => null } }));
import { decodeImage } from '../decodeImage';
import {
  getCameraPermissionStatus,
  requestCameraPermission,
} from '../permissions';
it('reports missing native registration without starting device work', async () => {
  await expect(decodeImage({ uri: 'file:///tmp/a.jpg' })).rejects.toMatchObject(
    { reason: 'unavailable' }
  );
  await expect(getCameraPermissionStatus()).rejects.toMatchObject({
    reason: 'unavailable',
  });
  await expect(requestCameraPermission()).rejects.toMatchObject({
    reason: 'unavailable',
  });
});
