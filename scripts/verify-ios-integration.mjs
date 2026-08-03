import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) =>
  readFileSync(path.join(rootDir, relativePath), 'utf8');
const readPackageJson = (relativePath) => JSON.parse(read(relativePath));

const podspec = read('ReactNativeHmsScan.podspec');
assert.match(
  podspec,
  /s\.dependency\s+"ScanKitFrameWork",\s+"1\.1\.2\.305"/,
  'podspec 必须精确依赖 ScanKitFrameWork 1.1.2.305'
);

for (const forbidden of [
  'prepare_command',
  'vendored_frameworks',
  'ios/vendor',
  'vtool',
]) {
  assert.equal(
    podspec.includes(forbidden),
    false,
    `podspec 不得包含 ${forbidden}`
  );
}

assert.equal(
  existsSync(
    path.join(rootDir, 'scripts/prepare-scankit-xcframework.sh')
  ),
  false,
  '旧 XCFramework 生成脚本必须删除'
);

const packageJson = readPackageJson('package.json');
assert.equal(
  packageJson.files.includes('scripts'),
  false,
  'repo-only 验证脚本不得随 npm 包发布'
);
const examplePackageJson = readPackageJson('example/package.json');
assert.equal(
  examplePackageJson.dependencies['react-native'],
  '0.86.2',
  'example 必须使用 RN 0.86.2'
);
for (const preset of [
  '@react-native/babel-preset',
  '@react-native/jest-preset',
  '@react-native/metro-config',
  '@react-native/typescript-config',
]) {
  assert.equal(
    examplePackageJson.devDependencies[preset],
    '0.86.2',
    `example ${preset} 必须与 RN 0.86.2 对齐`
  );
}
for (const cliPackage of [
  '@react-native-community/cli',
  '@react-native-community/cli-platform-android',
  '@react-native-community/cli-platform-ios',
]) {
  assert.equal(
    examplePackageJson.devDependencies[cliPackage],
    '20.1.0',
    `example ${cliPackage} 必须使用 CLI 20.1.0`
  );
}

const [packResult] = JSON.parse(
  execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: rootDir,
      encoding: 'utf8',
    }
  )
);
const packedPaths = new Set(packResult.files.map((file) => file.path));

assert.equal(
  packedPaths.has('ReactNativeHmsScan.podspec'),
  true,
  'npm tarball 必须包含 podspec'
);
assert.equal(
  packedPaths.has('scripts/prepare-scankit-xcframework.sh'),
  false,
  'npm tarball 不得包含旧生成脚本'
);
assert.deepEqual(
  [...packedPaths].filter((packedPath) => packedPath.startsWith('scripts/')),
  [],
  'npm tarball 不得包含 repo-only scripts/'
);
assert.equal(
  [...packedPaths].some((packedPath) =>
    packedPath.startsWith('ios/vendor/')
  ),
  false,
  'npm tarball 不得包含 Huawei 二进制'
);
assert.deepEqual(
  [...packedPaths].filter((packedPath) =>
    packedPath
      .split('/')
      .some((segment) =>
        ['.framework', '.xcframework', '.bundle'].some((suffix) =>
          segment.endsWith(suffix)
        )
      )
  ),
  [],
  'npm tarball 不得包含 Apple 二进制资源'
);

assert.equal(
  examplePackageJson.scripts.ios,
  'react-native run-ios --device',
  '示例 ios 命令必须选择物理设备'
);
assert.equal(
  examplePackageJson.scripts['build:ios'],
  'node ../scripts/verify-ios-integration.mjs --require-lock && react-native build-ios --mode Debug --device --extra-params "CODE_SIGNING_ALLOWED=NO"',
  'CI 必须构建 generic iOS device 并关闭签名'
);

const turbo = JSON.parse(read('turbo.json'));
assert.equal(
  turbo.tasks['build:ios'].cache,
  false,
  'iOS native build 不得被 Turbo cache 代替'
);

if (process.argv.includes('--require-lock')) {
  const lockPath = path.join(rootDir, 'example/ios/Podfile.lock');
  assert.equal(
    existsSync(lockPath),
    true,
    'native build 前必须生成 example/ios/Podfile.lock'
  );
  assert.match(
    read('example/ios/Podfile.lock'),
    /- ScanKitFrameWork \(1\.1\.2\.305\)/,
    'Podfile.lock 必须解析到 ScanKitFrameWork 1.1.2.305'
  );
}
