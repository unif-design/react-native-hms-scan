//
//  HmsScanView.h
//  @unif/react-native-hms-scan
//
//  Fabric component registered under the name "HmsScanView". Hosts HUAWEI Scan
//  Kit's HmsCustomScanViewController as an embedded child view controller and
//  bridges its delegate callbacks to the codegen events
//  (onScanResult / onScanError / onTorchStatus).
//

#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

#ifndef HmsScanViewNativeComponent_h
#define HmsScanViewNativeComponent_h

NS_ASSUME_NONNULL_BEGIN

@interface HmsScanView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END

#endif /* HmsScanViewNativeComponent_h */
