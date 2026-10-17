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

// ScanKit 1.1.2.305.300 public HmsScanFormat.h bit values.
typedef NS_ENUM(int, HMSScanFormatTypeCode) {
  AZTEC = 1 << 0, CODABAR = 1 << 1, CODE_39 = 1 << 2,
  CODE_93 = 1 << 3, CODE_128 = 1 << 4, DATA_MATRIX = 1 << 5,
  EAN_8 = 1 << 6, EAN_13 = 1 << 7, ITF = 1 << 8,
  PDF_417 = 1 << 9, QR_CODE = 1 << 10, UPC_A = 1 << 11,
  UPC_E = 1 << 12, ALL = (1 << 13) - 1
};
@interface HmsBitMap : NSObject
+ (NSArray *)multiDecodeBitMapForImage:(UIImage *)image withOptions:(HmsScanOptions *)options;
@end
extern NSArray *decodeResults;
extern NSException *decodeException;
extern unsigned int lastDecodeFormats;
