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

  # 华为 HUAWEI Scan Kit（iOS 自包含，无需 AppGallery Connect / API Key）。
  # 提供 HmsCustomScanViewController（定制视图）与 HmsBitMap（图片识别）。
  s.dependency "ScanKitFrameWork", "~> 1.1.2"

  # ScanKitFrameWork 是 arm64-only 的静态 framework，不含模拟器 arm64 切片。
  # 在 Apple 芯片上排掉模拟器 arm64（模拟器走 x86_64 / Rosetta），真机 arm64 不受影响。
  s.pod_target_xcconfig  = { "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "arm64" }
  s.user_target_xcconfig = { "EXCLUDED_ARCHS[sdk=iphonesimulator*]" => "arm64" }

  # 接入 New Architecture（Fabric 组件 + TurboModule）的 codegen 依赖。
  install_modules_dependencies(s)
end
