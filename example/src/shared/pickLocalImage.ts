import { launchImageLibrary } from 'react-native-image-picker';

export async function pickLocalImage(): Promise<string | null> {
  const response = await launchImageLibrary({
    mediaType: 'photo',
    selectionLimit: 1,
  });

  if (response.didCancel) return null;

  return response.assets?.[0]?.uri || null;
}
