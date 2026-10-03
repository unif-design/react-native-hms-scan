#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$(mktemp -d -t hms-scan-native)"
trap 'rm -rf "$OUTPUT"' EXIT
xcrun clang++ -std=c++17 -fobjc-arc -fblocks -Wno-nullability-completeness -Wno-objc-property-implementation \
  -framework Foundation -framework CoreGraphics \
  -I"$ROOT/scripts/native-tests/ios" -I"$ROOT/scripts/native-tests/ios/fabric" -I"$ROOT/ios" \
  "$ROOT/ios/HmsScanView.mm" "$ROOT/scripts/native-tests/ios/Boundary.mm" \
  "$ROOT/scripts/native-tests/ios/Harness.mm" -o "$OUTPUT/scan-tests"
"$OUTPUT/scan-tests"
