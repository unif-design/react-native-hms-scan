//
//  HmsScanModule.h
//  @unif/react-native-hms-scan
//
//  TurboModule registered under the name "HmsScan". Implements the codegen
//  protocol NativeHmsScanSpec (generated from src/NativeHmsScan.ts):
//    - decodeImage:formatsCsv:resolve:reject:
//    - getCameraPermissionStatus:reject:
//    - requestCameraPermission:reject:
//

#import <ReactNativeHmsScanSpec/ReactNativeHmsScanSpec.h>

NS_ASSUME_NONNULL_BEGIN

@interface HmsScanModule : NSObject <NativeHmsScanSpec>

@end

NS_ASSUME_NONNULL_END
