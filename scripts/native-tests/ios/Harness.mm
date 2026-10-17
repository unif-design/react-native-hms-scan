#import "HmsScanView.h"
#import "HmsScanModule.h"
#import "HmsScanResultMapper.h"
#import <AVFoundation/AVFoundation.h>
#import <ScanKitFrameWork/ScanKitFrameWork.h>
#import <objc/runtime.h>
#include <cstdio>
using namespace facebook::react;
// Exercise the actual implementation's small helpers; no implementation is replaced.
@interface HmsScanView (NativeTests)
+ (facebook::react::ComponentDescriptorProvider)componentDescriptorProvider;
- (void)customizedScanDelegateForResult:(NSDictionary *)result;
- (void)buildScanViewControllerWithCsv:(NSString *)csv;
- (void)emitScanResultJson:(NSString *)json;
- (void)emitScanErrorWithCode:(NSString *)code message:(NSString *)message;
- (void)emitTorchStateAvailable:(BOOL)available on:(BOOL)on force:(BOOL)force;
- (void)attachChildViewController;
- (void)detachChildViewController;
- (void)startObservingTorch;
- (void)stopObservingTorch;
- (BOOL)setTorchHardwareOn:(BOOL)on available:(BOOL *)available commandFailed:(BOOL *)commandFailed;
@end
extern Class<RCTComponentViewProtocol> HmsScanViewCls(void);

// A vendor dictionary may fail while its values are being read. The mapper
// remains the production mapper; only the supplied SDK object is controlled.
@interface FailingVendorDictionary : NSDictionary
@property(copy) NSString *failureReason;
@end
@implementation FailingVendorDictionary
- (NSUInteger)count { return 0; }
- (NSEnumerator *)keyEnumerator { return @{}.keyEnumerator; }
- (id)objectForKey:(id)key {
  @throw [NSException exceptionWithName:@"VendorPayload" reason:self.failureReason userInfo:nil];
}
@end

static IMP originalStringInitializer;
static id failStringInitialization(id object, SEL selector, NSData *data, NSStringEncoding encoding) {
  // NSString's designated initializer permits nil when creation cannot complete.
  return nil;
}
static IMP originalJSONSerializer;
static NSData *failJSONSerialization(id object, SEL selector, id value, NSJSONWritingOptions options, NSError **error) {
  if (error) *error = [NSError errorWithDomain:NSCocoaErrorDomain code:3840 userInfo:nil];
  return nil;
}

static void check(bool ok, NSString *message) {
  if (!ok)
    [NSException raise:@"Assertion" format:@"%@", message];
}
static void apply(HmsScanView *view, bool torch) {
  auto value = std::make_shared<HmsScanViewProps>();
  value->torch = torch;
  Props::Shared props = value;
  [view updateProps:props oldProps:props];
}
static HmsScanView *activeView(bool torch = true) {
  HmsScanView *view = [[HmsScanView alloc] initWithFrame:CGRectMake(0, 0, 320, 480)];
  apply(view, torch);
  view.window = [NSObject new];
  [view didMoveToWindow];
  return view;
}
int main() {
  @autoreleasepool {
    __block int failures = 0;
    void (^test)(NSString *, void (^)(void)) = ^(NSString *name, void (^body)(void)) {
      @autoreleasepool {
        @try {
          body();
          printf("PASS: %s\n", name.UTF8String);
        } @catch (NSException *exception) {
          failures++;
          printf("FAIL: %s: %s\n", name.UTF8String, exception.reason.UTF8String);
        }
      }
    };
    test(@"initial props create one vendor controller", ^{
      controllersCreated = 0;
      HmsScanView *view = [[HmsScanView alloc] initWithFrame:CGRectZero];
      apply(view, false);
      check(controllersCreated == 1, @"constructed default and configured controllers");
      [view prepareForRecycle];
    });
    test(@"failed torch enable reports off again so the next press can retry", ^{
      HmsScanViewEventEmitter::torchEvents.clear();
      HmsScanView *view = activeView(false);
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      @try {
        check(HmsScanViewEventEmitter::torchEvents.size() == 1 && !HmsScanViewEventEmitter::torchEvents.back().on,
              @"initial off state was not reported");
        device.failsConfigurationLock = YES;
        apply(view, true);
        check(HmsScanViewEventEmitter::torchEvents.size() == 2 && !HmsScanViewEventEmitter::torchEvents.back().on,
              @"failed enable did not acknowledge the unchanged off state");
        device.failsConfigurationLock = NO;
        apply(view, false); // Scanner reconciles its request to the actual-state report.
        check(HmsScanViewEventEmitter::torchEvents.size() == 2, @"unchanged successful off request was reported again");
        apply(view, true);
        check(HmsScanViewEventEmitter::torchEvents.size() == 3 && HmsScanViewEventEmitter::torchEvents.back().on,
              @"next press did not retry the hardware command");
      } @finally {
        device.failsConfigurationLock = NO;
        [view prepareForRecycle];
      }
    });
    test(@"unavailable torch enable acknowledges the unchanged off state", ^{
      HmsScanViewEventEmitter::torchEvents.clear();
      HmsScanView *view = activeView(false);
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      @try {
        check(HmsScanViewEventEmitter::torchEvents.size() == 1 && !HmsScanViewEventEmitter::torchEvents.back().on,
              @"initial off state was not reported");
        device.torchAvailable = NO;
        apply(view, true);
        check(HmsScanViewEventEmitter::torchEvents.size() == 2 && !HmsScanViewEventEmitter::torchEvents.back().on,
              @"unavailable enable did not acknowledge the unchanged off state");
      } @finally {
        [view prepareForRecycle];
        device.torchAvailable = YES;
      }
    });
    test(@"accepted torch enable waits for delayed hardware state without repeating off", ^{
      HmsScanView *view = activeView(false);
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      device.delaysTorchChange = YES;
      @try {
        HmsScanViewEventEmitter::torchEvents.clear();
        apply(view, true);
        device.torchActive = NO; // Unchanged observation while the accepted command is pending.
        device.torchAvailable = YES;
        check(HmsScanViewEventEmitter::torchEvents.empty(), @"accepted enable was reported as a failed off request");
        device.torchActive = YES;
        check(HmsScanViewEventEmitter::torchEvents.size() == 1 && HmsScanViewEventEmitter::torchEvents.back().on,
              @"delayed hardware enable was lost");
      } @finally {
        device.delaysTorchChange = NO;
        [view prepareForRecycle];
      }
    });
    test(@"detach reports actual torch off", ^{
      HmsScanView *view = activeView();
      HmsScanViewEventEmitter::torchEvents.clear();
      view.window = nil;
      [view didMoveToWindow];
      check(!HmsScanViewEventEmitter::torchEvents.empty() && !HmsScanViewEventEmitter::torchEvents.back().on,
            @"forced off was not reported");
      [view prepareForRecycle];
    });
    test(@"reattach reapplies unchanged torch request", ^{
      HmsScanView *view = activeView();
      view.window = nil;
      [view didMoveToWindow];
      view.window = [NSObject new];
      [view didMoveToWindow];
      check([AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo].isTorchActive, @"torch request was lost");
      [view prepareForRecycle];
    });
    test(@"detached view reports delayed hardware shutdown before releasing observation", ^{
      HmsScanView *view = activeView();
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      device.delaysTorchChange = YES;
      @try {
        HmsScanViewEventEmitter::torchEvents.clear();
        view.window = nil;
        [view didMoveToWindow];
        check(HmsScanViewEventEmitter::torchEvents.empty(), @"request completion was reported as actual shutdown");
        device.torchActive = NO; // Hardware completes after setTorchMode: has returned.
        check(HmsScanViewEventEmitter::torchEvents.size() == 1 && !HmsScanViewEventEmitter::torchEvents.back().on,
              @"delayed hardware shutdown was lost");
        device.torchActive = YES;
        check(HmsScanViewEventEmitter::torchEvents.size() == 1, @"detached view kept observing after shutdown");
      } @finally {
        device.delaysTorchChange = NO;
        [view prepareForRecycle];
      }
    });
    test(@"external torch changes are observed and repeated states are deduplicated", ^{
      HmsScanView *view = activeView();
      HmsScanViewEventEmitter::torchEvents.clear();
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      device.torchMode = AVCaptureTorchModeOff;
      device.torchMode = AVCaptureTorchModeOff;
      check(HmsScanViewEventEmitter::torchEvents.size() == 1 && !HmsScanViewEventEmitter::torchEvents.back().on,
            @"hardware changes did not produce exactly one event");
      [view prepareForRecycle];
      HmsScanViewEventEmitter::torchEvents.clear();
      device.torchMode = AVCaptureTorchModeOn;
      check(HmsScanViewEventEmitter::torchEvents.empty(), @"recycled view still observed hardware");
    });

    test(@"mapper preserves each supported format from numeric and token responses", ^{
      NSArray *tokens = @[ @"AZTEC", @"CODABAR", @"CODE_39", @"CODE_93", @"CODE_128", @"DATA_MATRIX", @"EAN_8", @"EAN_13", @"ITF14", @"PDF417", @"QR_CODE", @"UPC_A", @"UPC_E" ];
      for (NSUInteger index = 0; index < tokens.count; index++) {
        NSNumber *bit = @(1u << index);
        for (id value in @[ bit, bit.stringValue, tokens[index] ]) {
          NSDictionary *mapped = [HmsScanResultMapper scanResultFromHuaweiDict:@{ @"text": @"payload", @"formatValue": value }];
          check([mapped[@"format"] isEqual:tokens[index]], @"format identity changed");
          check([mapped[@"value"] isEqual:@"payload"], @"payload changed");
        }
        check([HmsScanResultMapper scanFormatTypeFromCsv:tokens[index]] == bit.unsignedIntValue, @"format request bit changed");
      }
      check([HmsScanResultMapper scanFormatTypeFromCsv:@""] == ALL, @"empty formats must request all");
      check([HmsScanResultMapper scanFormatTypeFromCsv:@" "] == ALL, @"whitespace formats must request all");
      check([HmsScanResultMapper scanFormatTypeFromCsv:@"QR_CODE,EAN_13"] == (QR_CODE | EAN_13), @"combined formats lost a bit");
      check([HmsScanResultMapper unsupportedFormatInCsv:@"QR_CODE,EAN_13"] == nil, @"valid formats rejected");
      check([[HmsScanResultMapper unsupportedFormatInCsv:@"QR_CODE,UNKNOWN"] isEqual:@"UNKNOWN"], @"unsupported format not identified");
      check([[HmsScanResultMapper unsupportedFormatInCsv:@" "] isEqual:@" "], @"empty token accepted");
      for (id value in @[ @"pdf_417", @"itf", @"unrecognized", @99999, @"12junk", [NSNull null] ]) {
        NSString *expected = [value isEqual:@"pdf_417"] ? @"PDF417" : [value isEqual:@"itf"] ? @"ITF14" : @"UNKNOWN";
        check([([HmsScanResultMapper scanResultFromHuaweiDict:@{ @"text": @"", @"formatValue": value }])[@"format"] isEqual:expected], @"unknown or alias format changed");
      }
    });
    test(@"mapper validates payloads and preserves optional content and finite corners", ^{
      for (NSString *key in @[ @"text", @"originalValue", @"showText", @"value" ]) {
        NSDictionary *mapped = [HmsScanResultMapper scanResultFromHuaweiDict:@{ key: @"data", @"sceneType": @" uri ", @"ResultPoint": @[ @{}, @"bad", @{ @"posX": @3, @"posY": @4 }, @{ @"x": @5, @"Y": @6 }, @{ @"x": @(NAN), @"y": @1 }, @{ @"x": @1, @"y": @(INFINITY) } ] }];
        check([mapped[@"value"] isEqual:@"data"], @"fallback payload lost");
        check([mapped[@"contentType"] isEqual:@"URL"], @"content alias lost");
        check([mapped[@"cornerPoints"] isEqual:@[ @{ @"x": @3, @"y": @4 }, @{ @"x": @5, @"y": @6 } ]], @"invalid corners entered public result");
      }
      for (id scene in @[ @"", @"other", @4, [NSNull null] ]) {
        check(([HmsScanResultMapper scanResultFromHuaweiDict:@{ @"text": @"data", @"sceneType": scene, @"ResultPoint": @[] }])[@"contentType"] == nil, @"unknown content type was invented");
      }
      check(([HmsScanResultMapper scanResultFromHuaweiDict:@{ @"text": @"payload", @"ResultPoint": @[ @{ @"x": @1 } ] }])[@"cornerPoints"] == nil, @"a point without y was accepted");
      check([HmsScanResultMapper scanResultFromHuaweiDict:(id)@"bad"] == nil, @"non-object result accepted");
      check([HmsScanResultMapper scanResultFromHuaweiDict:@{ @"text": @12 }] == nil, @"non-string result accepted");
      check([[HmsScanResultMapper scanResultsFromHuaweiArray:nil] isEqual:@[]], @"empty decode changed");
      check([[HmsScanResultMapper jsonStringFromHuaweiArray:@[]] isEqual:@"[]"], @"empty JSON changed");
      for (id raw in @[ @"bad", @[ @{} ] ]) {
        BOOL rejected = NO;
        @try { [HmsScanResultMapper scanResultsFromHuaweiArray:raw]; }
        @catch (NSException *error) { rejected = [error.name isEqual:@"HmsInvalidResponse"]; }
        check(rejected, @"invalid vendor array accepted");
      }
      for (id raw in @[ @"bad", @[ @{ @"invalid": [NSObject new] } ] ]) {
        BOOL rejected = NO;
        @try { [HmsScanResultMapper jsonStringFromScanResults:raw]; }
        @catch (NSException *error) { rejected = [error.name isEqual:@"HmsInvalidResponse"]; }
        check(rejected, @"unserializable output accepted");
      }
    });
    test(@"permission module maps authoritative platform states and requests only once needed", ^{
      HmsScanModule *module = [HmsScanModule new];
      NSArray *expected = @[ @"undetermined", @"blocked", @"blocked", @"granted", @"unknown" ];
      for (NSInteger state = 0; state < 5; state++) {
        authorizationStatus = (AVAuthorizationStatus)state;
        __block id value = nil;
        [module getCameraPermissionStatus:^(id result) { value = result; } reject:nil];
        check([value isEqual:expected[state]], @"permission mapping mismatch");
        if (state != 0) {
          int before = authorizationRequests;
          [module requestCameraPermission:^(id result) { value = result; } reject:nil];
          check([value isEqual:expected[state]] && authorizationRequests == before, @"resolved permission prompted again");
        }
      }
      authorizationStatus = AVAuthorizationStatusNotDetermined;
      authorizationAfterRequest = AVAuthorizationStatusDenied;
      __block id value = nil;
      [module requestCameraPermission:^(id result) { value = result; } reject:nil];
      check([value isEqual:@"blocked"], @"permission callback ignored authoritative denial");
      check([module getTurboModule:ObjCTurboModule::InitParams{}] != nullptr, @"TurboModule provider missing");
    });
    test(@"image module rejects missing files and maps vendor failure without changing caller files", ^{
      HmsScanModule *module = [HmsScanModule new];
      __block id value = nil;
      __block NSString *failure = nil;
      RCTPromiseResolveBlock resolve = ^(id result) { value = result; };
      RCTPromiseRejectBlock reject = ^(NSString *code, NSString *message, NSError *error) { failure = code; };
      for (id uri in @[ @"", @"https://example.com/image", @"file:opaque", @"file:///nonexistent-scan.jpg" ]) {
        failure = nil;
        [module decodeImage:uri formatsCsv:@"" resolve:resolve reject:reject];
        check([failure isEqual:@"E_IMAGE_LOAD_FAILED"], @"non-file image accepted");
      }
      [module decodeImage:nil formatsCsv:@"" resolve:resolve reject:reject];
      check([failure isEqual:@"E_IMAGE_LOAD_FAILED"], @"nil URI accepted");
      [module decodeImage:@"" formatsCsv:@"UNKNOWN" resolve:resolve reject:reject];
      check([failure isEqual:@"E_UNSUPPORTED_FORMAT"], @"unsupported format accepted");
      NSString *path = [NSTemporaryDirectory() stringByAppendingPathComponent:NSUUID.UUID.UUIDString];
      [@"fixture" writeToFile:path atomically:YES encoding:NSUTF8StringEncoding error:nil];
      NSString *uri = [NSURL fileURLWithPath:path].absoluteString;
      @try {
        decodeResults = @[ @{ @"text": @"payload", @"formatValue": @(QR_CODE) } ];
        failure = nil;
        [module decodeImage:uri formatsCsv:@"QR_CODE" resolve:resolve reject:reject];
        NSArray *decoded = [NSJSONSerialization JSONObjectWithData:[value dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
        check(failure == nil && [decoded[0][@"value"] isEqual:@"payload"] && lastDecodeFormats == QR_CODE, @"image result or requested format changed");
        decodeResults = @[ @{} ];
        [module decodeImage:uri formatsCsv:@"" resolve:resolve reject:reject];
        check([failure isEqual:@"E_INVALID_RESPONSE"], @"invalid SDK result reported as decode failure");
        decodeException = [NSException exceptionWithName:@"SDKFailure" reason:@"vendor failed" userInfo:nil];
        [module decodeImage:uri formatsCsv:@"" resolve:resolve reject:reject];
        check([failure isEqual:@"E_DECODE_FAILED"], @"vendor failure not mapped");
        check([[NSFileManager defaultManager] fileExistsAtPath:path], @"caller-owned image was removed");
      } @finally {
        decodeException = nil;
        decodeResults = @[];
        [[NSFileManager defaultManager] removeItemAtPath:path error:nil];
      }
    });
    test(@"view maps valid and malformed results and ignores paused or detached callbacks", ^{
      HmsScanViewEventEmitter::resultEvents.clear();
      HmsScanViewEventEmitter::errorEvents.clear();
      HmsScanView *view = activeView(false);
      NSDictionary *raw = @{ @"text": @"raw payload", @"formatValue": @(QR_CODE) };
      [view customizedScanDelegateForResult:raw];
      check(HmsScanViewEventEmitter::resultEvents.size() == 1, @"valid result not delivered");
      NSString *json = [NSString stringWithUTF8String:HmsScanViewEventEmitter::resultEvents.back().resultsJson.c_str()];
      NSArray *values = [NSJSONSerialization JSONObjectWithData:[json dataUsingEncoding:NSUTF8StringEncoding] options:0 error:nil];
      check([values[0][@"value"] isEqual:@"raw payload"], @"scan value was changed");
      [view customizedScanDelegateForResult:@{}];
      check(HmsScanViewEventEmitter::errorEvents.back().code == "E_INVALID_RESPONSE", @"malformed result not rejected");
      auto changed = std::make_shared<HmsScanViewProps>();
      changed->paused = true; changed->continuous = false;
      Props::Shared props = changed;
      [view updateProps:props oldProps:props];
      [view customizedScanDelegateForResult:raw];
      check(HmsScanViewEventEmitter::resultEvents.size() == 1, @"paused view delivered a result");
      apply(view, false);
      [view customizedScanDelegateForResult:raw];
      check(HmsScanViewEventEmitter::resultEvents.size() == 2, @"resume failed");
      view.window = nil;
      [view didMoveToWindow];
      [view customizedScanDelegateForResult:raw];
      check(HmsScanViewEventEmitter::resultEvents.size() == 2, @"detached view delivered a result");
      [view prepareForRecycle];
    });
    test(@"format changes rebuild in place and unsupported formats report errors", ^{
      HmsScanViewEventEmitter::errorEvents.clear();
      HmsScanView *view = activeView(false);
      int before = controllersCreated;
      auto changed = std::make_shared<HmsScanViewProps>();
      changed->formatsCsv = "EAN_13"; changed->paused = true;
      Props::Shared props = changed;
      [view updateProps:props oldProps:props];
      check(controllersCreated == before + 1 && lastDecodeFormats == EAN_13, @"format change did not rebuild");
      changed = std::make_shared<HmsScanViewProps>(); changed->formatsCsv = "UNKNOWN"; props = changed;
      [view updateProps:props oldProps:props];
      [view didMoveToWindow];
      check(HmsScanViewEventEmitter::errorEvents.size() == 2 && HmsScanViewEventEmitter::errorEvents.back().code == "E_UNSUPPORTED_FORMAT", @"unsupported formats accepted");
      changed = std::make_shared<HmsScanViewProps>(); changed->formatsCsv = std::string(1, '\xff'); props = changed;
      [view updateProps:props oldProps:props];
      check(lastDecodeFormats == ALL, @"invalid UTF-8 did not use the all-formats default");
      [view buildScanViewControllerWithCsv:nil];
      check(lastDecodeFormats == ALL, @"nil format default changed");
      [view prepareForRecycle];
    });
    test(@"missing parent or capture hardware keeps the view usable", ^{
      parentControllerAvailable = NO;
      captureDeviceAvailable = NO;
      HmsScanViewEventEmitter::torchEvents.clear();
      HmsScanView *view = activeView(true);
      check(!HmsScanViewEventEmitter::torchEvents.back().available, @"missing camera reported available");
      parentControllerAvailable = YES;
      [view didMoveToWindow];
      [view prepareForRecycle];
      captureDeviceAvailable = YES;
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      device.hasTorch = NO;
      view = activeView(true);
      check(!HmsScanViewEventEmitter::torchEvents.back().available, @"camera without torch reported available");
      [view prepareForRecycle];
      device.hasTorch = YES;
      device.unsupportedTorchMode = YES;
      view = activeView(true);
      check(!HmsScanViewEventEmitter::torchEvents.back().on, @"unsupported torch mode reported success");
      [view prepareForRecycle];
      device.unsupportedTorchMode = NO;
    });
    test(@"Fabric emitter detach drops output and helper defaults preserve event shape", ^{
      HmsScanView *view = [[HmsScanView alloc] initWithFrame:CGRectZero];
      HmsScanViewEventEmitter::resultEvents.clear();
      HmsScanViewEventEmitter::errorEvents.clear();
      HmsScanViewEventEmitter::torchEvents.clear();
      [view emitScanResultJson:nil];
      [view emitScanErrorWithCode:nil message:nil];
      check(HmsScanViewEventEmitter::resultEvents.back().resultsJson == "[]", @"empty result event changed");
      check(HmsScanViewEventEmitter::errorEvents.back().code.empty() && HmsScanViewEventEmitter::errorEvents.back().message.empty(), @"empty error event changed");
      EventEmitter::Shared absent;
      [view updateEventEmitter:absent];
      [view emitScanResultJson:@"[]"];
      [view emitScanErrorWithCode:@"E_INVALID_RESPONSE" message:@"late"];
      [view emitTorchStateAvailable:YES on:YES force:YES];
      check(HmsScanViewEventEmitter::resultEvents.size() == 1 && HmsScanViewEventEmitter::errorEvents.size() == 1 && HmsScanViewEventEmitter::torchEvents.empty(), @"detached emitter received events");
      check(HmsScanViewCls() == HmsScanView.class && [HmsScanView componentDescriptorProvider] != 0, @"Fabric registration missing");
    });
    test(@"failed UIKit initialization and independent content replacement are safe", ^{
      failNextViewInitialization = YES;
      check([[HmsScanView alloc] initWithFrame:CGRectZero] == nil, @"failed super initialization ignored");
      HmsScanView *view = [[HmsScanView alloc] initWithFrame:CGRectZero];
      [view attachChildViewController];
      [view detachChildViewController];
      apply(view, false);
      view.contentView = [[UIView alloc] initWithFrame:CGRectZero];
      UIView *replacement = view.contentView;
      [view prepareForRecycle];
      check(view.contentView == replacement, @"unrelated content was removed");
      @autoreleasepool {
        HmsScanView *unrecycled = [[HmsScanView alloc] initWithFrame:CGRectZero];
        apply(unrecycled, false);
      }
    });
    test(@"background hardware notifications dispatch and discard stale observations", ^{
      void (^drain)(void) = ^{
        __block BOOL finished = NO;
        dispatch_async(dispatch_get_main_queue(), ^{ finished = YES; });
        NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:2];
        while (!finished && deadline.timeIntervalSinceNow > 0)
          [[NSRunLoop mainRunLoop] runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.001]];
        check(finished, @"main-queue notification did not drain");
      };
      void (^background)(void (^)(void)) = ^(void (^operation)(void)) {
        dispatch_semaphore_t finished = dispatch_semaphore_create(0);
        dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
          check(!NSThread.isMainThread, @"fixture must use a worker thread");
          operation();
          dispatch_semaphore_signal(finished);
        });
        check(dispatch_semaphore_wait(finished, dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC)) == 0, @"worker did not finish");
      };
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      HmsScanView *view = activeView(false);
      HmsScanViewEventEmitter::torchEvents.clear();
      background(^{ device.torchActive = YES; });
      check(HmsScanViewEventEmitter::torchEvents.empty(), @"background observer emitted off the main queue");
      drain();
      check(HmsScanViewEventEmitter::torchEvents.size() == 1 && HmsScanViewEventEmitter::torchEvents.back().on, @"background hardware state was lost");
      background(^{ device.torchActive = NO; });
      [view stopObservingTorch];
      drain();
      check(HmsScanViewEventEmitter::torchEvents.size() == 1, @"stopped observation emitted queued event");
      [view startObservingTorch];
      background(^{ device.torchActive = YES; });
      [view stopObservingTorch];
      captureDeviceOverride = [AVCaptureDevice new];
      captureDeviceOverride.hasTorch = YES;
      captureDeviceOverride.torchAvailable = YES;
      [view startObservingTorch];
      drain();
      check(HmsScanViewEventEmitter::torchEvents.size() == 1, @"old device overwrote replacement state");
      [view prepareForRecycle];
      captureDeviceOverride = nil;
      @autoreleasepool {
        HmsScanView *released = activeView(false);
        background(^{ device.torchActive = YES; });
        [released prepareForRecycle];
      }
      drain();
    });
    test(@"detached observations, hardware lock failure and forwarded KVO stay bounded", ^{
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
      HmsScanView *view = activeView(false);
      device.torchAvailable = NO;
      device.torchAvailable = YES; // No pending request: availability alone must not enable it.
      view.window = nil;
      HmsScanViewEventEmitter::torchEvents.clear();
      device.torchActive = YES;
      check(HmsScanViewEventEmitter::torchEvents.empty(), @"unmounted observer emitted without an awaiting-off lifecycle");
      view.window = [NSObject new];
      [view didMoveToWindow];
      apply(view, true);
      device.delaysTorchChange = YES;
      view.window = nil;
      [view didMoveToWindow];
      device.torchAvailable = NO;
      device.torchActive = NO;
      device.delaysTorchChange = NO;
      device.torchAvailable = YES;
      device.failsConfigurationLock = YES;
      [view setTorchHardwareOn:NO available:NULL commandFailed:NULL];
      device.failsConfigurationLock = NO;
      BOOL forwarded = NO;
      @try { [view observeValueForKeyPath:@"unrelated" ofObject:device change:@{} context:NULL]; }
      @catch (NSException *error) { forwarded = YES; }
      check(forwarded, @"unrecognized KVO context was swallowed");
      [view emitTorchStateAvailable:NO on:YES force:NO];
      [view emitTorchStateAvailable:YES on:YES force:NO];
      [view emitTorchStateAvailable:YES on:NO force:NO];
      [view prepareForRecycle];
    });
    test(@"SDK payload exceptions with and without reasons are reported by the real mapper", ^{
      HmsScanView *view = activeView(false);
      for (id reason in @[ @"vendor failed", NSNull.null ]) {
        FailingVendorDictionary *value = [FailingVendorDictionary new];
        value.failureReason = reason == NSNull.null ? nil : reason;
        [view customizedScanDelegateForResult:value];
        const auto &error = HmsScanViewEventEmitter::errorEvents.back();
        check(error.code == "E_INVALID_RESPONSE", @"SDK exception was not normalized");
        NSString *message = [NSString stringWithUTF8String:error.message.c_str()];
        check([message isEqual:reason == NSNull.null ? @"扫码结果无法解析" : reason], @"SDK exception reason fallback changed");
      }
      [view prepareForRecycle];
    });
    test(@"Foundation serialization and string creation failures are surfaced", ^{
      Method serializer = class_getClassMethod(NSJSONSerialization.class, @selector(dataWithJSONObject:options:error:));
      originalJSONSerializer = method_setImplementation(serializer, (IMP)failJSONSerialization);
      BOOL rejected = NO;
      @try { [HmsScanResultMapper jsonStringFromScanResults:@[]]; }
      @catch (NSException *error) { rejected = [error.name isEqual:@"HmsInvalidResponse"]; }
      @finally { method_setImplementation(serializer, originalJSONSerializer); }
      check(rejected, @"Foundation serialization failure was accepted");
      // NSString is a class cluster. Interpose the actual allocated object's
      // initializer, only for this synchronous boundary-failure test.
      id placeholder = [NSString alloc];
      Method initializer = class_getInstanceMethod(object_getClass(placeholder), @selector(initWithData:encoding:));
      originalStringInitializer = method_setImplementation(initializer, (IMP)failStringInitialization);
      rejected = NO;
      @try { [HmsScanResultMapper jsonStringFromScanResults:@[]]; }
      @catch (NSException *error) { rejected = [error.name isEqual:@"HmsInvalidResponse"]; }
      @finally { method_setImplementation(initializer, originalStringInitializer); }
      check(rejected, @"Foundation string allocation failure was accepted");
    });
    return failures ? 1 : 0;
  }
}
