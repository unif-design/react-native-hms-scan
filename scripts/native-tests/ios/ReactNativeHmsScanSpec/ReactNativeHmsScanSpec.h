#pragma once
#import <Foundation/Foundation.h>
#include <memory>
#define RCT_EXPORT_MODULE(name)
typedef void (^RCTPromiseResolveBlock)(id);
typedef void (^RCTPromiseRejectBlock)(NSString *, NSString *, NSError *);
namespace facebook::react {
struct TurboModule { virtual ~TurboModule() = default; };
struct ObjCTurboModule { struct InitParams {}; };
struct NativeHmsScanSpecJSI : TurboModule {
  explicit NativeHmsScanSpecJSI(const ObjCTurboModule::InitParams &) {}
};
}
@protocol NativeHmsScanSpec <NSObject>
- (void)getCameraPermissionStatus:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)requestCameraPermission:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)decodeImage:(NSString *)uri formatsCsv:(NSString *)formatsCsv resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params;
@end
