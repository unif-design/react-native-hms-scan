#pragma once
#import <CoreGraphics/CoreGraphics.h>
#import <Foundation/Foundation.h>
#define UIViewAutoresizingFlexibleWidth 1
#define UIViewAutoresizingFlexibleHeight 2
@interface UIView : NSObject
@property CGRect frame;
@property CGRect bounds;
@property NSUInteger autoresizingMask;
@property(strong) NSObject *window;
- (instancetype)initWithFrame:(CGRect)frame;
- (void)didMoveToWindow;
@end
@interface UIViewController : NSObject
@property(strong) UIView *view;
- (void)addChildViewController:(UIViewController *)child;
- (void)didMoveToParentViewController:(UIViewController *)parent;
- (void)willMoveToParentViewController:(UIViewController *)parent;
- (void)removeFromParentViewController;
@end
