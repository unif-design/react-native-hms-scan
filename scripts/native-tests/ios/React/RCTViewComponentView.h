#pragma once
#import <UIKit/UIKit.h>
#include <memory>
#include <string>
#include <vector>
namespace facebook::react {
struct Props {
  using Shared = std::shared_ptr<const Props>;
  virtual ~Props() = default;
};
struct HmsScanViewProps : Props {
  std::string formatsCsv = "";
  bool continuous = true;
  bool paused = false;
  bool torch = false;
};
struct HmsScanViewComponentDescriptor {};
using ComponentDescriptorProvider = int;
template <typename T> int concreteComponentDescriptorProvider() { return 1; }
struct EventEmitter {
  virtual ~EventEmitter() = default;
};
struct HmsScanViewEventEmitter : EventEmitter {
  struct OnScanResult {
    std::string resultsJson;
  };
  struct OnScanError {
    std::string code;
    std::string message;
  };
  struct OnTorchState {
    bool available;
    bool hasAvailable;
    bool lowLight;
    bool hasLowLight;
    bool on;
  };
  static inline std::vector<OnTorchState> torchEvents;
  void onScanResult(OnScanResult) const {};
  void onScanError(OnScanError) const {};
  void onTorchState(OnTorchState state) const { torchEvents.push_back(state); }
};
} // namespace facebook::react
@protocol RCTComponentViewProtocol
@end
@interface RCTViewComponentView : UIView <RCTComponentViewProtocol> {
@protected
  std::shared_ptr<const facebook::react::Props> _props;
  std::shared_ptr<const facebook::react::EventEmitter> _eventEmitter;
}
@property(strong) UIView *contentView;
- (void)updateProps:(facebook::react::Props::Shared const &)props
           oldProps:(facebook::react::Props::Shared const &)oldProps;
- (void)prepareForRecycle;
- (UIViewController *)reactViewController;
@end
