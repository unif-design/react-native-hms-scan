#import "HmsScanResultMapper.h"
#import <AVFoundation/AVFoundation.h>
#import <React/RCTViewComponentView.h>
#import <ScanKitFrameWork/ScanKitFrameWork.h>
BOOL failNextViewInitialization = NO;
@implementation UIView
- (instancetype)initWithFrame:(CGRect)frame {
  if (failNextViewInitialization) {
    failNextViewInitialization = NO;
    return nil;
  }
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
BOOL parentControllerAvailable = YES;
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
- (void)updateEventEmitter:(const facebook::react::EventEmitter::Shared &)eventEmitter {
  _eventEmitter = eventEmitter;
}
- (UIViewController *)reactViewController {
  return parentControllerAvailable ? [UIViewController new] : nil;
}
@end
AVAuthorizationStatus authorizationStatus = AVAuthorizationStatusNotDetermined;
AVAuthorizationStatus authorizationAfterRequest = AVAuthorizationStatusAuthorized;
int authorizationRequests = 0;
BOOL captureDeviceAvailable = YES;
AVCaptureDevice *captureDeviceOverride = nil;
@implementation AVCaptureDevice
+ (AVAuthorizationStatus)authorizationStatusForMediaType:(NSString *)type { return authorizationStatus; }
+ (void)requestAccessForMediaType:(NSString *)type completionHandler:(void (^)(BOOL))handler {
  authorizationRequests++;
  authorizationStatus = authorizationAfterRequest;
  handler(authorizationStatus == AVAuthorizationStatusAuthorized);
}
+ (instancetype)defaultDeviceWithMediaType:(NSString *)type {
  if (!captureDeviceAvailable) return nil;
  if (captureDeviceOverride != nil) return captureDeviceOverride;
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
  return !self.failsConfigurationLock;
}
- (void)unlockForConfiguration {
}
- (BOOL)isTorchModeSupported:(AVCaptureTorchMode)mode {
  return !self.unsupportedTorchMode;
}
@end
@implementation AVCaptureDeviceDiscoverySession
+ (instancetype)discoverySessionWithDeviceTypes:(NSArray *)types
                                      mediaType:(NSString *)type
                                       position:(NSInteger)position {
  AVCaptureDeviceDiscoverySession *session = [self new];
  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:type];
  session.devices = device ? @[ device ] : @[];
  return session;
}
@end
int controllersCreated = 0;
unsigned int lastDecodeFormats = 0;
@implementation HmsScanOptions
- (instancetype)initWithScanFormatType:(unsigned int)format Photo:(BOOL)photo {
  lastDecodeFormats = format;
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

@implementation UIImage
+ (instancetype)imageWithContentsOfFile:(NSString *)path {
  return [[NSFileManager defaultManager] fileExistsAtPath:path] ? [self new] : nil;
}
@end
NSArray *decodeResults = @[];
NSException *decodeException = nil;
@implementation HmsBitMap
+ (NSArray *)multiDecodeBitMapForImage:(UIImage *)image withOptions:(HmsScanOptions *)options {
  if (decodeException != nil) @throw decodeException;
  return decodeResults;
}
@end
