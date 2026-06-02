#!/usr/bin/env bash
#
# 生成含 arm64-simulator 切片的 ScanKitFrameWork.xcframework(+ 资源 bundle)。
#
# 背景:华为官方 ScanKitFrameWork 1.1.2 是 2020 年前的老式 fat framework
# (arm64 = 真机 / x86_64 = Intel 模拟器,LC_VERSION_MIN_IPHONEOS 标记),
# 不含 arm64-simulator 切片。Apple Silicon(M 芯片)的 iOS 模拟器是 arm64-sim,
# 会因缺这一片而链接失败(旧 podspec 只能 EXCLUDED_ARCHS 排掉、导致模拟器编不过)。
#
# 这里用 Apple 官方 vtool 把真机 arm64 改写成 simulator 平台、补出 arm64-sim,
# 再 lipo 合并 x86_64,最后 xcodebuild -create-xcframework 打成 xcframework
# (device 片 / simulator 片分目录,fat binary 不允许同 arch 共存)。
#
# vtool 转出来的 sim 片仅用于编译/链接(CI、模拟器跑通);真机仍走 device 片。
# 模拟器上真去调摄像头硬件会崩,但模拟器本无扫码硬件场景,不影响。
#
# 由 ReactNativeHmsScan.podspec 的 prepare_command 在 pod install 时调用。
# 产物 ios/vendor/ 不入 git —— 按需生成(已生成则跳过)。
#
set -euo pipefail

OUT_DIR="ios/vendor"
XCFW="$OUT_DIR/ScanKitFrameWork.xcframework"
BUNDLE="$OUT_DIR/ScanKitFrameWorkBundle.bundle"

# 华为官方 Scan SDK-Plus iOS 工具包(scansdk-ios-tool 1.1.0.305)。
# URL 取自 ScanKitFrameWork 的 CocoaPods spec(source.http),带 10 年签名有效期。
ZIP_URL="https://contentcenter-vali-drcn.dbankcdn.cn/pvt_2/DeveloperAlliance_package_901_9/eb/v3/FoQltlwsS0Ge-TitlHPL3A/scansdk-ios-tool-1.1.0.305.zip?HW-CC-KV=V1&HW-CC-Date=20230321T064901Z&HW-CC-Expire=315360000&HW-CC-Sign=C23A0122B070535FDFA38C56BA62E25E6BE66582D963B8C7F5DDF4FCA5C34CFF"

# 只在 macOS 生成(需 lipo / vtool / xcodebuild);Android 等平台的 pod install 直接跳过。
if [ "$(uname)" != "Darwin" ]; then
  echo "[scankit] 非 macOS,跳过 xcframework 生成"
  exit 0
fi

# 已生成且两个平台切片齐全 → 跳过(避免每次 pod install 重复下载几十 MB)。
if [ -d "$XCFW/ios-arm64" ] && [ -d "$XCFW/ios-arm64_x86_64-simulator" ] && [ -d "$BUNDLE" ]; then
  echo "[scankit] xcframework 已存在,跳过"
  exit 0
fi

echo "[scankit] 下载华为 Scan SDK ..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "$ZIP_URL" -o "$TMP/sdk.zip"
unzip -q "$TMP/sdk.zip" -d "$TMP/sdk"

SRC_FW="$(find "$TMP/sdk" -type d -name 'ScanKitFrameWork.framework' | head -1)"
SRC_BUNDLE="$(find "$TMP/sdk" -type d -name 'ScanKitFrameWorkBundle.bundle' | head -1)"
if [ -z "$SRC_FW" ]; then
  echo "[scankit] ✗ 解压后未找到 ScanKitFrameWork.framework" >&2
  exit 1
fi
BIN="$SRC_FW/ScanKitFrameWork"

echo "[scankit] 拆片 + vtool 补 arm64-simulator + 组 xcframework ..."
mkdir -p "$TMP/device" "$TMP/sim"

# device:真机 arm64
cp -R "$SRC_FW" "$TMP/device/ScanKitFrameWork.framework"
lipo "$BIN" -thin arm64 -output "$TMP/device/ScanKitFrameWork.framework/ScanKitFrameWork"

# simulator:arm64(真机片经 vtool 改写成 simulator 平台 7)+ x86_64(原 Intel 模拟器片)
cp -R "$SRC_FW" "$TMP/sim/ScanKitFrameWork.framework"
lipo "$BIN" -thin arm64 -output "$TMP/a64d"
vtool -arch arm64 -set-build-version 7 13.5 13.5 -replace -output "$TMP/a64s" "$TMP/a64d"
lipo "$BIN" -thin x86_64 -output "$TMP/x86"
lipo -create "$TMP/a64s" "$TMP/x86" -output "$TMP/sim/ScanKitFrameWork.framework/ScanKitFrameWork"

mkdir -p "$OUT_DIR"
rm -rf "$XCFW"
xcodebuild -create-xcframework \
  -framework "$TMP/device/ScanKitFrameWork.framework" \
  -framework "$TMP/sim/ScanKitFrameWork.framework" \
  -output "$XCFW"

# 资源 bundle(扫码 UI 资源),原由 ScanKitFrameWork pod 带,现随 vendored 一起放。
if [ -n "$SRC_BUNDLE" ]; then
  rm -rf "$BUNDLE"
  cp -R "$SRC_BUNDLE" "$BUNDLE"
fi

echo "[scankit] ✓ 生成 $XCFW(+ bundle)"
