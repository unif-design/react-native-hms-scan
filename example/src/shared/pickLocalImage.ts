import type { ScannerImage } from '@unif/react-native-hms-scan';
import { launchImageLibrary } from 'react-native-image-picker';

export async function pickLocalImage(): Promise<ScannerImage | null> {
  const response = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
  });

  if (response.didCancel) return null;

  if (response.errorCode)
    throw new Error(response.errorMessage ?? response.errorCode);
  const uri = response.assets?.[0]?.uri;
  return uri ? { uri } : null;
}
