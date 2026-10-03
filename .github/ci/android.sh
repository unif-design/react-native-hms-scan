#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Also resolve the compiler when the example's Turborepo build is a cache hit.
./example/android/gradlew -p example/android :unif_react-native-hms-scan:compileDebugKotlin --console=plain --max-workers=2
python3 scripts/test-android-native.py
