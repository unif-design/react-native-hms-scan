#pragma once
#import <Foundation/Foundation.h>
static NSString *const AVCaptureDeviceTypeBuiltInWideAngleCamera = @"back";
static NSString *const AVMediaTypeVideo = @"video";
static const NSInteger AVCaptureDevicePositionBack = 1;
typedef NS_ENUM(NSInteger, AVCaptureTorchMode) { AVCaptureTorchModeOff = 0, AVCaptureTorchModeOn = 1 };
@interface AVCaptureDevice : NSObject
@property BOOL delaysTorchChange;
@property BOOL failsConfigurationLock;
@property BOOL hasTorch;
@property(getter=isTorchAvailable) BOOL torchAvailable;
@property(getter=isTorchActive) BOOL torchActive;
@property(nonatomic) AVCaptureTorchMode torchMode;
+ (instancetype)defaultDeviceWithMediaType:(NSString *)type;
- (BOOL)lockForConfiguration:(NSError **)error;
- (void)unlockForConfiguration;
- (BOOL)isTorchModeSupported:(AVCaptureTorchMode)mode;
@end
@interface AVCaptureDeviceDiscoverySession : NSObject
@property(copy) NSArray<AVCaptureDevice *> *devices;
+ (instancetype)discoverySessionWithDeviceTypes:(NSArray *)types
                                      mediaType:(NSString *)type
                                       position:(NSInteger)position;
@end
