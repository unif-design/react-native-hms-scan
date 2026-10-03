#import "HmsScanView.h"
#import <AVFoundation/AVFoundation.h>
#import <ScanKitFrameWork/ScanKitFrameWork.h>
#include <cstdio>
using namespace facebook::react;
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
static HmsScanView *activeView() {
  HmsScanView *view = [[HmsScanView alloc] initWithFrame:CGRectMake(0, 0, 320, 480)];
  apply(view, true);
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
    return failures ? 1 : 0;
  }
}
