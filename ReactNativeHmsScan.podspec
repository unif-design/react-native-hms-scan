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

  # hms-scan 使用 AVFoundation（摄像头权限 + torch）；
  # UIKit / Foundation 显式声明，避免依赖传递关系。
  s.frameworks = "AVFoundation", "UIKit", "Foundation"

  # Huawei Scan Kit iOS SDK（自包含，无需 AppGallery Connect / API Key）。
  # 当前只支持真机；Simulator 不生成兼容切片。
  s.dependency "ScanKitFrameWork", "1.1.2.305"

  # 接入 New Architecture（Fabric 组件 + TurboModule）的 codegen 依赖。
  install_modules_dependencies(s)
end
