import type {
  DecodeScanImageInput,
  HmsScanViewProps,
  ScannerProps,
  ScanResult,
  ScanFailure,
  RequestedScanFormat,
} from '@unif/react-native-hms-scan';
const readonlyFormats = ['QR_CODE', 'EAN_13'] as const;
const decode = {
  uri: 'file:///tmp/a',
  formats: readonlyFormats,
} satisfies DecodeScanImageInput;
const view = { formats: readonlyFormats } satisfies HmsScanViewProps;
const scanner = {
  formats: readonlyFormats,
  onConfirm: (_result: Readonly<ScanResult>) => {},
} satisfies ScannerProps;
const failure = {
  reason: 'invalid_response',
  message: 'invalid',
} satisfies ScanFailure;
// @ts-expect-error UNKNOWN describes a result, never an input filter.
const invalidFormat: RequestedScanFormat = 'UNKNOWN';
// @ts-expect-error Consumers must provide the single-result delivery callback.
const invalidScanner: ScannerProps = {};
void invalidFormat;
void invalidScanner;
test('public input contracts accept readonly filters', () => {
  expect(decode.formats).toEqual(view.formats);
  expect(scanner.formats).toEqual(readonlyFormats);
  expect(failure.reason).toBe('invalid_response');
});
