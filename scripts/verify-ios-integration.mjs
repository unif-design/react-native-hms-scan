import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const read = (relativePath) =>
  readFileSync(path.join(rootDir, relativePath), 'utf8');

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

const packageJson = JSON.parse(read('package.json'));
assert.equal(
  packageJson.files.includes('scripts'),
  false,
  'repo-only 验证脚本不得随 npm 包发布'
);

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
assert.equal(
  [...packedPaths].some((packedPath) =>
    packedPath.startsWith('ios/vendor/')
  ),
  false,
  'npm tarball 不得包含 Huawei 二进制'
);
