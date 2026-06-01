//
//  HmsScanModule.mm
//  @unif/react-native-hms-scan
//

#import "HmsScanModule.h"
#import "HmsScanResultMapper.h"

#import <AVFoundation/AVFoundation.h>
#import <UIKit/UIKit.h>

#import <ScanKitFrameWork/ScanKitFrameWork.h>

// Error codes mirror HmsScanErrorCode in src/types.ts.
static NSString *const kErrImageLoadFailed = @"E_IMAGE_LOAD_FAILED";
static NSString *const kErrDecodeFailed = @"E_DECODE_FAILED";

@implementation HmsScanModule

// Export under the JS-visible name "HmsScan" (TurboModuleRegistry.getEnforcing<Spec>('HmsScan')).
RCT_EXPORT_MODULE(HmsScan)

#pragma mark - Permission status mapping

// AVAuthorizationStatus -> our CameraPermissionStatus string.
// authorized -> granted; notDetermined -> undetermined; denied/restricted -> blocked.
+ (NSString *)stringForAuthorizationStatus:(AVAuthorizationStatus)status
{
  switch (status) {
    case AVAuthorizationStatusAuthorized:
      return @"granted";
    case AVAuthorizationStatusNotDetermined:
      return @"undetermined";
    case AVAuthorizationStatusDenied:
    case AVAuthorizationStatusRestricted:
      return @"blocked";
    default:
      return @"undetermined";
  }
}

- (void)getCameraPermissionStatus:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject
{
  AVAuthorizationStatus status =
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  resolve([HmsScanModule stringForAuthorizationStatus:status]);
}

- (void)requestCameraPermission:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject
{
  AVAuthorizationStatus current =
      [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];

  // Only notDetermined can present the system prompt. For an already-resolved
  // state, return it directly (requestAccess would still call back immediately,
  // but this avoids any ambiguity and keeps the mapping exact).
  if (current != AVAuthorizationStatusNotDetermined) {
    resolve([HmsScanModule stringForAuthorizationStatus:current]);
    return;
  }

  [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo
                           completionHandler:^(BOOL granted) {
    // Re-read the authoritative status rather than inferring from `granted`,
    // so restricted/denied are reported correctly.
    AVAuthorizationStatus updated =
        [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
    resolve([HmsScanModule stringForAuthorizationStatus:updated]);
  }];
}

#pragma mark - Image loading

// Load a UIImage from a local URI: file:// , an absolute/relative file path,
// or a data: URI. Remote URLs and Photos (ph:// / assets-library://) are not
// supported here -> returns nil so the caller rejects E_IMAGE_LOAD_FAILED.
+ (nullable UIImage *)imageForURI:(NSString *)uri
{
  if (uri.length == 0) {
    return nil;
  }

  NSURL *url = [NSURL URLWithString:uri];
  NSString *scheme = url.scheme.lowercaseString;

  // data: URI (base64 or otherwise) -> decode bytes directly.
  if ([scheme isEqualToString:@"data"]) {
    NSData *data = [NSData dataWithContentsOfURL:url];
    return data ? [UIImage imageWithData:data] : nil;
  }

  // file:// URI -> use its filesystem path.
  if ([scheme isEqualToString:@"file"]) {
    NSString *path = url.path;
    return path ? [UIImage imageWithContentsOfFile:path] : nil;
  }

  // No scheme (or a Windows-like drive letter is irrelevant on iOS): treat the
  // whole string as a filesystem path. Also strip a leading file path that may
  // have arrived percent-encoded.
  if (scheme == nil || scheme.length == 0) {
    UIImage *image = [UIImage imageWithContentsOfFile:uri];
    if (image == nil) {
      NSString *decoded = [uri stringByRemovingPercentEncoding];
      if (decoded != nil && ![decoded isEqualToString:uri]) {
        image = [UIImage imageWithContentsOfFile:decoded];
      }
    }
    return image;
  }

  // ph:// , assets-library:// , http(s):// , content:// (Android-only) etc. are
  // intentionally unsupported on iOS in this bridge.
  return nil;
}

#pragma mark - decodeImage

- (void)decodeImage:(NSString *)uri
         formatsCsv:(NSString *)formatsCsv
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  UIImage *image = [HmsScanModule imageForURI:uri];
  if (image == nil) {
    reject(kErrImageLoadFailed,
           [NSString stringWithFormat:@"无法从 URI 加载图片（仅支持 file:// / 绝对路径 / data:）：%@",
            uri ?: @"(nil)"],
           nil);
    return;
  }

  @try {
    unsigned int formatType = [HmsScanResultMapper scanFormatTypeFromCsv:formatsCsv];
    // photoMode/Photo=YES: still-image (album) decode path, per HUAWEI guidance.
    HmsScanOptions *options =
        [[HmsScanOptions alloc] initWithScanFormatType:formatType Photo:YES];

    NSArray *raw = [HmsBitMap multiDecodeBitMapForImage:image withOptions:options];
    NSString *json = [HmsScanResultMapper jsonStringFromHuaweiArray:raw];
    // Always resolve a JSON array string (may be "[]" when nothing was found);
    // JS parseResultsJson handles the empty case.
    resolve(json);
  } @catch (NSException *exception) {
    reject(kErrDecodeFailed,
           exception.reason ?: @"HUAWEI Scan Kit 解码图片时发生异常",
           nil);
  }
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeHmsScanSpecJSI>(params);
}

@end
