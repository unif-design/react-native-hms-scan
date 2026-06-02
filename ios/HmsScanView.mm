//
//  HmsScanView.mm
//  @unif/react-native-hms-scan
//

#import "HmsScanView.h"
#import "HmsScanResultMapper.h"

#import <React/RCTConversions.h>
#import <React/UIView+React.h>

#import <react/renderer/components/ReactNativeHmsScanSpec/ComponentDescriptors.h>
#import <react/renderer/components/ReactNativeHmsScanSpec/EventEmitters.h>
#import <react/renderer/components/ReactNativeHmsScanSpec/Props.h>
#import <react/renderer/components/ReactNativeHmsScanSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#import <AVFoundation/AVFoundation.h>
#import <ScanKitFrameWork/ScanKitFrameWork.h>

using namespace facebook::react;

@interface HmsScanView () <CustomizedScanDelegate>
@end

@implementation HmsScanView {
  HmsCustomScanViewController *_scanVC;
  // Mirror of the props we apply imperatively, so updateProps can diff against
  // the *actually applied* state (RCTViewComponentView resets _props each call).
  NSString *_appliedFormatsCsv;
  BOOL _appliedContinuous;
  BOOL _appliedPaused;
  BOOL _appliedTorch;
  BOOL _hasAppliedOnce;
  BOOL _childAttached;
}

#pragma mark - Codegen wiring

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<HmsScanViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const HmsScanViewProps>();
    _props = defaultProps;

    _appliedContinuous = YES; // matches WithDefault<boolean, true>
    _appliedPaused = NO;
    _appliedTorch = NO;
    _appliedFormatsCsv = @""; // matches WithDefault<string, ''> (= all formats)
    _hasAppliedOnce = NO;
    _childAttached = NO;

    [self buildScanViewControllerWithCsv:_appliedFormatsCsv];
  }
  return self;
}

#pragma mark - Scan view controller lifecycle

- (void)buildScanViewControllerWithCsv:(NSString *)csv {
  // (Re)create the VC. HmsCustomScanViewController takes its format set at init
  // via HmsScanOptions and exposes no setter to change it later, so a formatsCsv
  // change requires rebuilding the controller.
  [self teardownScanViewController];

  unsigned int formatType = [HmsScanResultMapper scanFormatTypeFromCsv:csv];
  HmsScanOptions *options = [[HmsScanOptions alloc] initWithScanFormatType:formatType Photo:NO];

  HmsCustomScanViewController *vc = [[HmsCustomScanViewController alloc] initCustomizedScanWithFormatType:options];
  vc.backButtonHidden = YES; // we render our own chrome from JS
  vc.customizedScanDelegate = self;
  vc.continuouslyScan = _appliedContinuous;

  _scanVC = vc;
  _appliedFormatsCsv = csv ?: @"";

  // Embed the VC's view as our content view, filling self.
  UIView *scanView = vc.view;
  scanView.frame = self.bounds;
  scanView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
  self.contentView = scanView;

  // If we're already on screen, (re)attach to the nearest view controller.
  if (self.window != nil) {
    [self attachChildViewController];
  }

  // Re-apply paused state after a rebuild (continuouslyScan was set above).
  if (_appliedPaused) {
    [_scanVC pauseContinuouslyScan];
  } else {
    [_scanVC resumeContinuouslyScan];
  }
}

- (void)teardownScanViewController {
  if (_scanVC == nil) {
    return;
  }
  [self detachChildViewController];
  _scanVC.customizedScanDelegate = nil;
  if (self.contentView == _scanVC.view) {
    self.contentView = nil;
  }
  _scanVC = nil;
}

- (void)attachChildViewController {
  if (_scanVC == nil || _childAttached) {
    return;
  }
  UIViewController *parent = [self reactViewController];
  if (parent == nil) {
    return; // try again on next didMoveToWindow
  }
  [parent addChildViewController:_scanVC];
  // The view is already in our hierarchy (set as contentView); just notify.
  [_scanVC didMoveToParentViewController:parent];
  _childAttached = YES;
}

- (void)detachChildViewController {
  if (_scanVC == nil || !_childAttached) {
    return;
  }
  [_scanVC willMoveToParentViewController:nil];
  [_scanVC removeFromParentViewController];
  _childAttached = NO;
}

- (void)didMoveToWindow {
  [super didMoveToWindow];
  if (self.window != nil) {
    [self attachChildViewController];
  } else {
    [self detachChildViewController];
  }
}

#pragma mark - Props

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &newViewProps = *std::static_pointer_cast<HmsScanViewProps const>(props);

  NSString *newCsv = [NSString stringWithUTF8String:newViewProps.formatsCsv.c_str()];
  if (newCsv == nil) {
    newCsv = @"";
  }
  BOOL newContinuous = newViewProps.continuous;
  BOOL newPaused = newViewProps.paused;
  BOOL newTorch = newViewProps.torch;

  BOOL first = !_hasAppliedOnce;

  // formatsCsv change -> rebuild the controller (carry over continuous/paused).
  if (first || ![newCsv isEqualToString:_appliedFormatsCsv]) {
    _appliedContinuous = newContinuous;
    _appliedPaused = newPaused;
    [self buildScanViewControllerWithCsv:newCsv];
  } else {
    // continuous change -> toggle continuouslyScan in place.
    if (newContinuous != _appliedContinuous) {
      _appliedContinuous = newContinuous;
      _scanVC.continuouslyScan = newContinuous;
    }
    // paused change -> pause/resume in place.
    if (newPaused != _appliedPaused) {
      _appliedPaused = newPaused;
      if (newPaused) {
        [_scanVC pauseContinuouslyScan];
      } else {
        [_scanVC resumeContinuouslyScan];
      }
    }
  }

  // torch change (best-effort, see applyTorch:).
  if (first || newTorch != _appliedTorch) {
    _appliedTorch = newTorch;
    [self applyTorch:newTorch];
  }

  _hasAppliedOnce = YES;

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - Torch (best-effort)

// HUAWEI Scan Kit exposes NO public torch API on iOS — HmsCustomScanViewController
// renders its own torch button and auto-detects low light. We therefore drive the
// torch directly through AVFoundation as a best-effort convenience. This is NOT
// guaranteed to stay in sync with HUAWEI's built-in torch button, and may be a
// no-op if HUAWEI holds an exclusive lock on the capture device's configuration.
- (void)applyTorch:(BOOL)on {
  BOOL available = NO;
  BOOL torchOn = [self setTorchHardwareOn:on available:&available];
  [self emitTorchStatusAvailable:available on:torchOn];
}

// Mutates the capture device's torch. Returns the resulting on-state and writes
// hardware availability into `available`. Does NOT emit any event (so it can be
// reused on teardown/recycle without firing onTorchStatus on a stale emitter).
- (BOOL)setTorchHardwareOn:(BOOL)on available:(BOOL *)available {
  AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
  BOOL isAvailable = (device != nil && device.hasTorch && device.isTorchAvailable);
  if (available != NULL) {
    *available = isAvailable;
  }
  if (!isAvailable) {
    return NO;
  }

  BOOL torchOn = NO;
  NSError *error = nil;
  if ([device lockForConfiguration:&error]) {
    if (on && [device isTorchModeSupported:AVCaptureTorchModeOn]) {
      device.torchMode = AVCaptureTorchModeOn;
      torchOn = YES;
    } else {
      device.torchMode = AVCaptureTorchModeOff;
      torchOn = NO;
    }
    [device unlockForConfiguration];
  }
  // On lock failure we silently ignore (best-effort) and report torchOn = NO.
  return torchOn;
}

#pragma mark - CustomizedScanDelegate

// Called by HUAWEI on every decode (repeatedly in continuous mode). `resultDic`
// is a single result dictionary; we wrap it into the contract's top-level array.
- (void)customizedScanDelegateForResult:(NSDictionary *)resultDic {
  NSDictionary *mapped = [HmsScanResultMapper scanResultFromHuaweiDict:resultDic];
  if (mapped == nil) {
    // Decoded payload had no usable value; surface as a soft error event.
    [self emitScanErrorWithCode:@"E_NO_RESULT" message:@"扫码结果为空或无法解析"];
    return;
  }
  NSString *json = [HmsScanResultMapper jsonStringFromScanResults:@[ mapped ]];
  [self emitScanResultJson:json];
}

#pragma mark - Event emitters

- (void)emitScanResultJson:(NSString *)json {
  if (!_eventEmitter) {
    return;
  }
  std::string resultsJson = json ? std::string([json UTF8String]) : std::string("[]");
  std::static_pointer_cast<const HmsScanViewEventEmitter>(_eventEmitter)
      ->onScanResult(HmsScanViewEventEmitter::OnScanResult{
          .resultsJson = resultsJson,
      });
}

- (void)emitScanErrorWithCode:(NSString *)code message:(NSString *)message {
  if (!_eventEmitter) {
    return;
  }
  std::static_pointer_cast<const HmsScanViewEventEmitter>(_eventEmitter)
      ->onScanError(HmsScanViewEventEmitter::OnScanError{
          .code = code ? std::string([code UTF8String]) : std::string(""),
          .message = message ? std::string([message UTF8String]) : std::string(""),
      });
}

- (void)emitTorchStatusAvailable:(BOOL)available on:(BOOL)on {
  if (!_eventEmitter) {
    return;
  }
  std::static_pointer_cast<const HmsScanViewEventEmitter>(_eventEmitter)
      ->onTorchStatus(HmsScanViewEventEmitter::OnTorchStatus{
          .available = available ? true : false,
          .on = on ? true : false,
      });
}

#pragma mark - Cleanup

- (void)prepareForRecycle {
  // Reset imperative state so a recycled view re-applies props cleanly.
  // Turn the torch off WITHOUT emitting (the emitter is being torn down).
  [self setTorchHardwareOn:NO available:NULL];
  [self teardownScanViewController];
  _hasAppliedOnce = NO;
  _appliedFormatsCsv = @"";
  _appliedContinuous = YES;
  _appliedPaused = NO;
  _appliedTorch = NO;
  [super prepareForRecycle];
}

- (void)dealloc {
  if (_scanVC != nil) {
    _scanVC.customizedScanDelegate = nil;
  }
}

@end
