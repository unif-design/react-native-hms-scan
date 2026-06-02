require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "ReactNativeHmsScan"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/unif-design/react-native-hms-scan.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift,cpp}"
  s.private_header_files = "ios/**/*.h"

  # hms-scan 自己用 AVFoundation(摄像头权限 + torch);UIKit / Foundation 显式声明保险。
  # 之前 podspec 缺这个 —— 被 EXCLUDED_ARCHS 排掉模拟器 arm64 编译掩盖了;现在去掉
  # EXCLUDED_ARCHS(xcframework 已补 arm64-sim 切片)、arm64 模拟器真编译就暴露了缺链接。
  s.frameworks = "AVFoundation", "UIKit", "Foundation"

  # 华为 HUAWEI Scan Kit（iOS 自包含，无需 AppGallery Connect / API Key）。
  # 提供 HmsCustomScanViewController（定制视图）与 HmsBitMap（图片识别）。
  #
  # 华为官方 ScanKitFrameWork 1.1.2 是老式 fat framework（arm64 真机 + x86_64 Intel 模拟器），
  # 不含 arm64-simulator 切片 → Apple Silicon 模拟器会链接失败（旧版只能 EXCLUDED_ARCHS 排掉、
  # 导致模拟器 / CI 编不过）。这里改为:prepare_command 用 Apple 官方 vtool 把真机 arm64
  # 改写成 simulator 平台、补出 arm64-sim，打成 xcframework（device 片 / simulator 片分目录）。
  # 详见 scripts/prepare-scankit-xcframework.sh。产物 ios/vendor/ 不入 git，pod install 时按需生成。
  s.prepare_command     = "bash scripts/prepare-scankit-xcframework.sh"
  s.vendored_frameworks = "ios/vendor/ScanKitFrameWork.xcframework"
  s.resources           = "ios/vendor/ScanKitFrameWorkBundle.bundle"

  # 接入 New Architecture（Fabric 组件 + TurboModule）的 codegen 依赖。
  install_modules_dependencies(s)
end
