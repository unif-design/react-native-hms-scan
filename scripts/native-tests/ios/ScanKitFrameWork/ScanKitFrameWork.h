#pragma once
#import <UIKit/UIKit.h>
@protocol CustomizedScanDelegate <NSObject>
- (void)customizedScanDelegateForResult:(NSDictionary *)result;
@end
@interface HmsScanOptions : NSObject
- (instancetype)initWithScanFormatType:(unsigned int)format Photo:(BOOL)photo;
@end
@interface HmsCustomScanViewController : UIViewController
@property BOOL backButtonHidden;
@property BOOL continuouslyScan;
@property(weak) id<CustomizedScanDelegate> customizedScanDelegate;
- (instancetype)initCustomizedScanWithFormatType:(HmsScanOptions *)options;
- (void)pauseContinuouslyScan;
- (void)resumeContinuouslyScan;
@end
extern int controllersCreated;
