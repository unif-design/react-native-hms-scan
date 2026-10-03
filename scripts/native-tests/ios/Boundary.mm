#import "HmsScanResultMapper.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTViewComponentView.h>
#import <ScanKitFrameWork/ScanKitFrameWork.h>
@implementation UIView
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super init]) {
    self.frame = frame;
    self.bounds = frame;
  }
  return self;
}
- (void)didMoveToWindow {
}
@end
@implementation UIViewController
- (instancetype)init {
  if (self = [super init])
    self.view = [UIView new];
  return self;
}
- (void)addChildViewController:(UIViewController *)child {
}
- (void)didMoveToParentViewController:(UIViewController *)parent {
}
- (void)willMoveToParentViewController:(UIViewController *)parent {
}
- (void)removeFromParentViewController {
}
@end
@implementation RCTViewComponentView
- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame])
    _eventEmitter = std::make_shared<facebook::react::HmsScanViewEventEmitter>();
  return self;
}
- (void)updateProps:(facebook::react::Props::Shared const &)props
           oldProps:(facebook::react::Props::Shared const &)oldProps {
  _props = props;
}
- (void)prepareForRecycle {
}
- (UIViewController *)reactViewController {
  return [UIViewController new];
}
@end
@implementation AVCaptureDevice
+ (instancetype)defaultDeviceWithMediaType:(NSString *)type {
  static AVCaptureDevice *device;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    device = [self new];
    device.hasTorch = YES;
    device.torchAvailable = YES;
  });
  return device;
}
- (void)setTorchMode:(AVCaptureTorchMode)mode {
  _torchMode = mode;
  if (!self.delaysTorchChange)
    self.torchActive = mode == AVCaptureTorchModeOn;
}
- (BOOL)lockForConfiguration:(NSError **)error {
  return YES;
}
- (void)unlockForConfiguration {
}
- (BOOL)isTorchModeSupported:(AVCaptureTorchMode)mode {
  return YES;
}
@end
@implementation AVCaptureDeviceDiscoverySession
+ (instancetype)discoverySessionWithDeviceTypes:(NSArray *)types
                                      mediaType:(NSString *)type
                                       position:(NSInteger)position {
  AVCaptureDeviceDiscoverySession *session = [self new];
  session.devices = @[ [AVCaptureDevice defaultDeviceWithMediaType:type] ];
  return session;
}
@end
int controllersCreated = 0;
@implementation HmsScanOptions
- (instancetype)initWithScanFormatType:(unsigned int)format Photo:(BOOL)photo {
  return [super init];
}
@end
@implementation HmsCustomScanViewController
- (instancetype)initCustomizedScanWithFormatType:(HmsScanOptions *)options {
  controllersCreated++;
  return [super init];
}
- (void)pauseContinuouslyScan {
}
- (void)resumeContinuouslyScan {
}
@end
@implementation HmsScanResultMapper
+ (NSString *)unsupportedFormatInCsv:(NSString *)csv {
  return nil;
}
+ (unsigned int)scanFormatTypeFromCsv:(NSString *)csv {
  return 0;
}
+ (NSDictionary *)scanResultFromHuaweiDict:(NSDictionary *)value {
  return value;
}
+ (NSArray *)scanResultsFromHuaweiArray:(NSArray *)value {
  return value;
}
+ (NSString *)jsonStringFromScanResults:(NSArray *)value {
  return @"[]";
}
+ (NSString *)jsonStringFromHuaweiArray:(NSArray *)value {
  return @"[]";
}
@end
