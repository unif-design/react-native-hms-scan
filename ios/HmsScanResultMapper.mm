//
//  HmsScanResultMapper.mm
//  @unif/react-native-hms-scan
//

#import "HmsScanResultMapper.h"

#import <ScanKitFrameWork/ScanKitFrameWork.h>

// NOTE on naming collisions: HMSScanFormatTypeCode (in HmsScanFormat.h) declares
// *global, unscoped* enum constants named QR_CODE, EAN_13, DATA_MATRIX, etc.
// Those identifiers therefore refer to integers, NOT to our output strings.
// We only ever compare against those enum constants and emit string *literals*
// (@"QR_CODE" ...), so there is no clash.

@implementation HmsScanResultMapper

#pragma mark - CSV -> scanFormatType bitmask

// Maps one of our BarcodeFormat tokens to the matching HMSScanFormatTypeCode bit.
// Returns 0 for tokens HUAWEI iOS does not support (e.g. MULTI_FUNCTIONAL) or
// UNKNOWN, so they contribute nothing to the OR-ed mask.
+ (unsigned int)bitForFormatToken:(NSString *)token
{
  NSString *t = [[token stringByTrimmingCharactersInSet:
                  [NSCharacterSet whitespaceAndNewlineCharacterSet]] uppercaseString];
  if (t.length == 0) {
    return 0;
  }

  static NSDictionary<NSString *, NSNumber *> *map = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    map = @{
      @"QR_CODE": @(QR_CODE),
      @"AZTEC": @(AZTEC),
      @"DATA_MATRIX": @(DATA_MATRIX),
      @"PDF417": @(PDF_417),
      @"CODABAR": @(CODABAR),
      @"CODE_39": @(CODE_39),
      @"CODE_93": @(CODE_93),
      @"CODE_128": @(CODE_128),
      @"EAN_8": @(EAN_8),
      @"EAN_13": @(EAN_13),
      @"UPC_A": @(UPC_A),
      @"UPC_E": @(UPC_E),
      // Our ITF14 maps to HUAWEI's ITF bit.
      @"ITF14": @(ITF),
      // MULTI_FUNCTIONAL / UNKNOWN have no HUAWEI iOS equivalent -> 0.
    };
  });

  NSNumber *bit = map[t];
  return bit ? (unsigned int)bit.unsignedIntValue : 0u;
}

+ (unsigned int)scanFormatTypeFromCsv:(NSString *)csv
{
  NSString *trimmed = [csv stringByTrimmingCharactersInSet:
                       [NSCharacterSet whitespaceAndNewlineCharacterSet]];
  if (trimmed.length == 0) {
    return (unsigned int)ALL;  // empty string == all formats
  }

  unsigned int mask = 0u;
  for (NSString *token in [trimmed componentsSeparatedByString:@","]) {
    mask |= [self bitForFormatToken:token];
  }
  // If nothing resolved (e.g. only MULTI_FUNCTIONAL/UNKNOWN was requested),
  // fall back to ALL so we still attempt a decode rather than scanning nothing.
  return mask == 0u ? (unsigned int)ALL : mask;
}

#pragma mark - formatValue -> our BarcodeFormat string

// HUAWEI's `formatValue` is documented as the HMSScanFormatTypeCode integer.
// We tolerate it being delivered as an NSNumber (bit value) OR an NSString
// (either a numeric string or already a token like "QR_CODE"), since the
// public headers do not pin the type and demos have shown both shapes.
+ (NSString *)formatStringFromValue:(id)formatValue
{
  // Case 1: numeric (NSNumber, or numeric NSString) -> match the enum bit.
  NSInteger code = NSNotFound;
  if ([formatValue isKindOfClass:[NSNumber class]]) {
    code = [(NSNumber *)formatValue integerValue];
  } else if ([formatValue isKindOfClass:[NSString class]]) {
    NSString *s = (NSString *)formatValue;
    NSString *trimmed = [s stringByTrimmingCharactersInSet:
                         [NSCharacterSet whitespaceAndNewlineCharacterSet]];
    // Pure-integer string?
    NSScanner *scanner = [NSScanner scannerWithString:trimmed];
    NSInteger parsed = 0;
    if ([scanner scanInteger:&parsed] && scanner.isAtEnd) {
      code = parsed;
    } else {
      // Case 2: already a token string -> normalize known spellings.
      NSString *upper = [trimmed uppercaseString];
      if ([upper isEqualToString:@"PDF_417"]) return @"PDF417";
      if ([upper isEqualToString:@"ITF"]) return @"ITF14";
      static NSSet<NSString *> *known = nil;
      static dispatch_once_t onceToken;
      dispatch_once(&onceToken, ^{
        known = [NSSet setWithArray:@[
          @"QR_CODE", @"AZTEC", @"DATA_MATRIX", @"PDF417", @"CODABAR",
          @"CODE_39", @"CODE_93", @"CODE_128", @"EAN_8", @"EAN_13",
          @"UPC_A", @"UPC_E", @"ITF14", @"MULTI_FUNCTIONAL",
        ]];
      });
      return [known containsObject:upper] ? upper : @"UNKNOWN";
    }
  } else {
    return @"UNKNOWN";
  }

  // Map enum bit -> our string. Compare against the global enum constants.
  switch (code) {
    case QR_CODE:     return @"QR_CODE";
    case AZTEC:       return @"AZTEC";
    case DATA_MATRIX: return @"DATA_MATRIX";
    case PDF_417:     return @"PDF417";
    case CODABAR:     return @"CODABAR";
    case CODE_39:     return @"CODE_39";
    case CODE_93:     return @"CODE_93";
    case CODE_128:    return @"CODE_128";
    case EAN_8:       return @"EAN_8";
    case EAN_13:      return @"EAN_13";
    case UPC_A:       return @"UPC_A";
    case UPC_E:       return @"UPC_E";
    case ITF:         return @"ITF14";
    default:          return @"UNKNOWN";
  }
}

#pragma mark - sceneType -> our BarcodeContentType (best effort)

// HUAWEI iOS does not publish a sceneType enum in the headers; precision is
// limited. We map a few well-known scene tokens/codes and otherwise return nil
// so `contentType` is omitted (the JS contract treats unknown as undefined).
+ (nullable NSString *)contentTypeFromSceneType:(id)sceneType
{
  NSString *token = nil;
  if ([sceneType isKindOfClass:[NSString class]]) {
    token = [[(NSString *)sceneType stringByTrimmingCharactersInSet:
              [NSCharacterSet whitespaceAndNewlineCharacterSet]] uppercaseString];
  } else if ([sceneType isKindOfClass:[NSNumber class]]) {
    // No documented numeric scene mapping -> leave unknown.
    return nil;
  } else {
    return nil;
  }
  if (token.length == 0) {
    return nil;
  }

  static NSDictionary<NSString *, NSString *> *map = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    map = @{
      @"TEXT": @"TEXT",
      @"URL": @"URL",
      @"URI": @"URL",
      @"EMAIL": @"EMAIL",
      @"PHONE": @"PHONE",
      @"TEL": @"PHONE",
      @"SMS": @"SMS",
      @"WIFI": @"WIFI",
      @"CONTACT": @"CONTACT",
      @"CONTACT_INFO": @"CONTACT",
      @"EVENT": @"EVENT",
      @"LOCATION": @"LOCATION",
      @"GEO": @"LOCATION",
      @"DRIVER": @"DRIVER",
      @"ISBN": @"ISBN",
      @"ARTICLE": @"ARTICLE",
      @"PRODUCT": @"ARTICLE",
    };
  });
  return map[token];  // nil when unrecognized -> contentType omitted
}

#pragma mark - ResultPoint -> cornerPoints

+ (nullable NSNumber *)numberFromPointDict:(NSDictionary *)dict keys:(NSArray<NSString *> *)keys
{
  for (NSString *key in keys) {
    id v = dict[key];
    if ([v isKindOfClass:[NSNumber class]]) {
      return (NSNumber *)v;
    }
    if ([v isKindOfClass:[NSString class]]) {
      return @([(NSString *)v doubleValue]);
    }
  }
  return nil;
}

// HUAWEI delivers `ResultPoint` as an array of dicts with `posX`/`posY` numbers.
// We tolerate a couple of key spellings just in case.
+ (nullable NSArray<NSDictionary *> *)cornerPointsFromResultPoint:(id)resultPoint
{
  if (![resultPoint isKindOfClass:[NSArray class]]) {
    return nil;
  }
  NSMutableArray<NSDictionary *> *points = [NSMutableArray array];
  for (id element in (NSArray *)resultPoint) {
    if (![element isKindOfClass:[NSDictionary class]]) {
      continue;
    }
    NSDictionary *p = (NSDictionary *)element;
    NSNumber *x = [self numberFromPointDict:p keys:@[ @"posX", @"x", @"X" ]];
    NSNumber *y = [self numberFromPointDict:p keys:@[ @"posY", @"y", @"Y" ]];
    if (x != nil && y != nil) {
      [points addObject:@{ @"x": x, @"y": y }];
    }
  }
  return points.count > 0 ? [points copy] : nil;
}

#pragma mark - Dict -> ScanResult

+ (nullable NSString *)valueFromHuaweiDict:(NSDictionary *)dict
{
  // Primary key is `text`; tolerate a couple of alternates defensively.
  for (NSString *key in @[ @"text", @"originalValue", @"showText", @"value" ]) {
    id v = dict[key];
    if ([v isKindOfClass:[NSString class]] && ((NSString *)v).length > 0) {
      return (NSString *)v;
    }
  }
  return nil;
}

+ (nullable NSDictionary *)scanResultFromHuaweiDict:(NSDictionary *)dict
{
  if (![dict isKindOfClass:[NSDictionary class]]) {
    return nil;
  }

  NSString *value = [self valueFromHuaweiDict:dict];
  if (value == nil) {
    return nil;  // no usable decoded text -> drop
  }

  NSMutableDictionary *out = [NSMutableDictionary dictionary];
  out[@"value"] = value;
  out[@"format"] = [self formatStringFromValue:dict[@"formatValue"]];

  NSString *contentType = [self contentTypeFromSceneType:dict[@"sceneType"]];
  if (contentType != nil) {
    out[@"contentType"] = contentType;
  }

  NSArray<NSDictionary *> *corners = [self cornerPointsFromResultPoint:dict[@"ResultPoint"]];
  if (corners != nil) {
    out[@"cornerPoints"] = corners;
  }

  return [out copy];
}

+ (NSArray<NSDictionary *> *)scanResultsFromHuaweiArray:(NSArray *)array
{
  NSMutableArray<NSDictionary *> *results = [NSMutableArray array];
  if ([array isKindOfClass:[NSArray class]]) {
    for (id element in array) {
      NSDictionary *mapped = [self scanResultFromHuaweiDict:element];
      if (mapped != nil) {
        [results addObject:mapped];
      }
    }
  }
  return [results copy];
}

#pragma mark - JSON

+ (NSString *)jsonStringFromScanResults:(NSArray<NSDictionary *> *)results
{
  NSArray *safe = [results isKindOfClass:[NSArray class]] ? results : @[];
  if (![NSJSONSerialization isValidJSONObject:safe]) {
    return @"[]";
  }
  NSError *error = nil;
  NSData *data = [NSJSONSerialization dataWithJSONObject:safe options:0 error:&error];
  if (data == nil || error != nil) {
    return @"[]";
  }
  NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  return json ?: @"[]";
}

+ (NSString *)jsonStringFromHuaweiArray:(NSArray *)array
{
  return [self jsonStringFromScanResults:[self scanResultsFromHuaweiArray:array]];
}

@end
