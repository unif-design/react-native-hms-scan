import type { BarcodeFormat } from '@unif/react-native-hms-scan';

export type FormatPresetId = 'all' | 'qr' | 'retail';

const formatsByPreset: Readonly<
  Record<FormatPresetId, readonly BarcodeFormat[] | undefined>
> = {
  all: undefined,
  qr: ['QR_CODE'],
  retail: ['EAN_8', 'EAN_13', 'UPC_A', 'UPC_E', 'CODE_128'],
};

export function formatsForPreset(
  id: FormatPresetId
): readonly BarcodeFormat[] | undefined {
  return formatsByPreset[id];
}
