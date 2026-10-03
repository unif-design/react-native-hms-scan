//
//  HmsScanModule.mm
//  @unif/react-native-hms-scan
//

#import "HmsScanModule.h"
#import "HmsScanResultMapper.h"

#import <AVFoundation/AVFoundation.h>
#import <UIKit/UIKit.h>

#import <ScanKitFrameWork/ScanKitFrameWork.h>

// Native codes are normalized to ScanFailure at the public capability boundary.
static NSString *const kErrImageLoadFailed = @"E_IMAGE_LOAD_FAILED";
static NSString *const kErrDecodeFailed = @"E_DECODE_FAILED";

@implementation HmsScanModule

// Export under the JS-visible TurboModule name "HmsScan".
RCT_EXPORT_MODULE(HmsScan)

#pragma mark - Permission status mapping

// AVAuthorizationStatus -> our ScanCameraPermission string.
// authorized -> granted; notDetermined -> undetermined; denied/restricted -> blocked.
+ (NSString *)stringForAuthorizationStatus:(AVAuthorizationStatus)status {
  switch (status) {
  case AVAuthorizationStatusAuthorized:
    return @"granted";
  case AVAuthorizationStatusNotDetermined:
    return @"undetermined";
  case AVAuthorizationStatusDenied:
  case AVAuthorizationStatusRestricted:
    return @"blocked";
  default:
    return @"unknown";
  }
}

- (void)getCameraPermissionStatus:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  resolve([HmsScanModule stringForAuthorizationStatus:status]);
}

- (void)requestCameraPermission:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  AVAuthorizationStatus current = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];

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

// Read only the local file prepared by the caller.
+ (nullable UIImage *)imageForURI:(NSString *)uri {
  if (uri.length == 0) {
    return nil;
  }

  NSURL *url = [NSURL URLWithString:uri];
  if (url.isFileURL) {
    NSString *path = url.path;
    return path ? [UIImage imageWithContentsOfFile:path] : nil;
  }

  return nil;
}

#pragma mark - decodeImage

- (void)decodeImage:(NSString *)uri
         formatsCsv:(NSString *)formatsCsv
            resolve:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject {
  if ([HmsScanResultMapper unsupportedFormatInCsv:formatsCsv] != nil) {
    reject(@"E_UNSUPPORTED_FORMAT", @"iOS ScanKit 不支持请求的码制", nil);
    return;
  }
  UIImage *image = [HmsScanModule imageForURI:uri];
  if (image == nil) {
    reject(kErrImageLoadFailed, [NSString stringWithFormat:@"无法读取本地图片文件：%@", uri ?: @"(nil)"], nil);
    return;
  }

  @try {
    unsigned int formatType = [HmsScanResultMapper scanFormatTypeFromCsv:formatsCsv];
    // photoMode/Photo=YES: still-image (album) decode path, per HUAWEI guidance.
    HmsScanOptions *options = [[HmsScanOptions alloc] initWithScanFormatType:formatType Photo:YES];

    NSArray *raw = [HmsBitMap multiDecodeBitMapForImage:image withOptions:options];
    NSString *json = [HmsScanResultMapper jsonStringFromHuaweiArray:raw];
    // Always resolve a JSON array string (may be "[]" when nothing was found);
    // JS parseResultsJson handles the empty case.
    resolve(json);
  } @catch (NSException *exception) {
    reject([exception.name isEqualToString:@"HmsInvalidResponse"] ? @"E_INVALID_RESPONSE" : kErrDecodeFailed,
           exception.reason ?: @"HUAWEI Scan Kit 解码图片时发生异常", nil);
  }
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeHmsScanSpecJSI>(params);
}

@end
