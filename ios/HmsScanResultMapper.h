//
//  HmsScanResultMapper.h
//  @unif/react-native-hms-scan
//
//  Converts HUAWEI Scan Kit result dictionaries into the library's stable
//  ScanResult[] JSON contract (shared by the TurboModule's decodeImage and the
//  Fabric view's onScanResult event). The JSON shape is:
//
//    [{"value":"...","format":"EAN_13","contentType":"ARTICLE",
//      "cornerPoints":[{"x":10,"y":20}]}]
//
//  Only `value` and `format` are guaranteed; `contentType` / `cornerPoints` are
//  emitted only when derivable. See README of NativeHmsScan.ts for the contract.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface HmsScanResultMapper : NSObject

/// Parse a comma-separated list of our BarcodeFormat strings into the
/// `HmsScanOptions.scanFormatType` bitmask (HMSScanFormatTypeCode OR-ed).
/// An empty/whitespace-only string means "all formats".
+ (unsigned int)scanFormatTypeFromCsv:(nullable NSString *)csv;

/// Map a single HUAWEI result dictionary (keys: text / formatValue / sceneType /
/// ResultPoint ...) into one ScanResult dictionary, or nil when there is no
/// usable `text`. Returned dictionary is JSON-serializable.
+ (nullable NSDictionary *)scanResultFromHuaweiDict:(nullable NSDictionary *)dict;

/// Map an array of HUAWEI result dictionaries into an array of ScanResult
/// dictionaries (dropping entries without a usable value).
+ (NSArray<NSDictionary *> *)scanResultsFromHuaweiArray:(nullable NSArray *)array;

/// Serialize an array of ScanResult dictionaries to a JSON string.
/// Never returns nil: on failure it returns "[]".
+ (NSString *)jsonStringFromScanResults:(nullable NSArray<NSDictionary *> *)results;

/// Convenience: HUAWEI multi-decode array -> ScanResult[] JSON string.
+ (NSString *)jsonStringFromHuaweiArray:(nullable NSArray *)array;

@end

NS_ASSUME_NONNULL_END
