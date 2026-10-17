#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$ROOT/coverage/native/ios"
mkdir -p "$OUTPUT"
xcrun clang++ -std=c++17 -fobjc-arc -fblocks -fprofile-instr-generate -fcoverage-mapping \
  -Wno-nullability-completeness -Wno-objc-property-implementation \
  -framework Foundation -framework CoreGraphics \
  -I"$ROOT/scripts/native-tests/ios" -I"$ROOT/scripts/native-tests/ios/fabric" -I"$ROOT/ios" \
  "$ROOT"/ios/*.mm "$ROOT/scripts/native-tests/ios/Boundary.mm" \
  "$ROOT/scripts/native-tests/ios/Harness.mm" -o "$OUTPUT/scan-tests"
LLVM_PROFILE_FILE="$OUTPUT/scan-tests.profraw" "$OUTPUT/scan-tests"
xcrun llvm-profdata merge -sparse "$OUTPUT/scan-tests.profraw" -o "$OUTPUT/scan-tests.profdata"
xcrun llvm-cov report "$OUTPUT/scan-tests" -instr-profile="$OUTPUT/scan-tests.profdata" "$ROOT"/ios/*.mm
xcrun llvm-cov export "$OUTPUT/scan-tests" -instr-profile="$OUTPUT/scan-tests.profdata" "$ROOT"/ios/*.mm > "$OUTPUT/coverage.json"
xcrun llvm-cov show "$OUTPUT/scan-tests" -instr-profile="$OUTPUT/scan-tests.profdata" \
  -format=html -output-dir="$OUTPUT/html" "$ROOT"/ios/*.mm
python3 "$ROOT/scripts/native/check_library_coverage.py" ios
