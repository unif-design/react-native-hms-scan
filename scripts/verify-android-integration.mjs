import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const readPackageJson = (relativePath) =>
  JSON.parse(readFileSync(path.join(rootDir, relativePath), 'utf8'));
const read = (relativePath) =>
  readFileSync(path.join(rootDir, relativePath), 'utf8');
const source = readFileSync(
  path.join(
    rootDir,
    'android/src/main/java/com/unif/reactnativehmsscan/HmsScanView.kt'
  ),
  'utf8'
);

const rootPackage = readPackageJson('package.json');
const examplePackage = readPackageJson('example/package.json');
const websitePackage = readPackageJson('website/package.json');
const lockfile = read('yarn.lock');

const sharedRuntimeDependencies = {
  '@sbaiahmed1/react-native-blur': '^4.6.2',
  '@unif/react-native-design': '0.20.0',
  react: '19.2.3',
  'react-native': '0.86.2',
  'react-native-gesture-handler': '^3.1.0',
  'react-native-reanimated': '^4.5.3',
  'react-native-reanimated-carousel': '^5.0.0',
  'react-native-safe-area-context': '^5.7.0',
  'react-native-svg': '^15.15.5',
  'react-native-worklets': '^0.11.3',
};

function assertExactDependencies(manifest, field, manifestPath, expected) {
  for (const [name, version] of Object.entries(expected)) {
    assert.equal(
      manifest[field]?.[name],
      version,
      `${manifestPath} must declare ${name} as ${version} in ${field}`
    );
  }
}

function assertReactNativeLockfileResolution(contents) {
  const expectedResolution = 'react-native@npm:0.86.2';
  const packageDescriptors = [
    ...contents.matchAll(/^"(react-native@npm:[^"]+)":$/gm),
  ].map(([, descriptor]) => descriptor);
  const packageResolutions = [
    ...contents.matchAll(
      /^  resolution: "(react-native@npm:[^"]+)"$/gm
    ),
  ].map(([, resolution]) => resolution);

  assert.deepEqual(
    packageDescriptors,
    [expectedResolution],
    `yarn.lock must contain exactly one ${expectedResolution} package key; found ${packageDescriptors.join(', ') || 'none'}`
  );
  assert.deepEqual(
    packageResolutions,
    [expectedResolution],
    `yarn.lock must contain exactly one ${expectedResolution} package resolution; found ${packageResolutions.join(', ') || 'none'}`
  );
}

assertExactDependencies(rootPackage, 'devDependencies', 'package.json', {
  ...sharedRuntimeDependencies,
  '@babel/core': '^7.25.2',
  '@eslint/js': '^8.57.1',
  '@react-native/babel-preset': '0.86.2',
  '@react-native/eslint-config': '0.86.2',
  '@react-native/jest-preset': '0.86.2',
  '@react-native/metro-config': '0.86.2',
  eslint: '^8.57.1',
  'react-test-renderer': '19.2.3',
});
assertExactDependencies(
  examplePackage,
  'dependencies',
  'example/package.json',
  {
    ...sharedRuntimeDependencies,
    '@unif/react-native-hms-scan': 'workspace:*',
    'react-native-image-picker': '8.2.1',
  }
);
assertExactDependencies(
  websitePackage,
  'dependencies',
  'website/package.json',
  {
    ...sharedRuntimeDependencies,
    '@unif/react-native-hms-scan': 'workspace:*',
    'react-dom': '19.2.3',
  }
);
assertExactDependencies(
  websitePackage,
  'devDependencies',
  'website/package.json',
  {
    '@babel/core': '^7.25.2',
    '@react-native/metro-config': '0.86.2',
    '@types/react': '^19.2.0',
  }
);
assertReactNativeLockfileResolution(lockfile);

assert.equal(rootPackage.peerDependencies['@unif/react-native-design'], '>=0.8.0');
assert.equal(rootPackage.peerDependencies['react-native'], '>=0.80.0');

const installedDesign = readPackageJson(
  'node_modules/@unif/react-native-design/package.json'
);
const installedGestureHandler = readPackageJson(
  'node_modules/react-native-gesture-handler/package.json'
);
const installedCarousel = readPackageJson(
  'node_modules/react-native-reanimated-carousel/package.json'
);

assert.equal(installedDesign.version, '0.20.0');
assert.equal(
  installedDesign.peerDependencies['react-native-gesture-handler'],
  '>=3.0.0 <4.0.0'
);
assert.equal(installedGestureHandler.version, '3.1.0');
assert.equal(installedCarousel.version, '5.0.0');
assert.equal(
  installedCarousel.peerDependencies['react-native-gesture-handler'],
  '>=2.9.0 <3.0.0',
  'only the exact Carousel 5 / Gesture Handler 3 peer exception is approved'
);

function methodBody(signature) {
  const signatureIndex = source.indexOf(signature);
  assert.notEqual(signatureIndex, -1, `缺少 Kotlin 方法: ${signature}`);
  const bodyStart = source.indexOf('{', signatureIndex);
  assert.notEqual(bodyStart, -1, `${signature} 缺少方法体`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart + 1, index);
    }
  }
  assert.fail(`${signature} 方法体没有闭合`);
}

function assertOrdered(body, snippets, message) {
  let previousIndex = -1;
  for (const snippet of snippets) {
    const index = body.indexOf(snippet);
    assert.ok(index > previousIndex, `${message}: ${snippet}`);
    previousIndex = index;
  }
}

const applyTorch = methodBody('private fun applyTorch()');
assert.match(
  applyTorch,
  /view\.lightStatus\s*!=\s*torch[\s\S]*view\.switchLight\(\)/,
  'applyTorch 必须只在实际状态与 prop 不同时切换 RemoteView'
);
assertOrdered(
  applyTorch,
  ['catch (_: Throwable)', 'emitTorchStatus(view)'],
  'torch 切换成功或抛错后都必须回读并 emit 实际状态'
);

const emitTorchStatus = methodBody('private fun emitTorchStatus(');
assertOrdered(
  emitTorchStatus,
  [
    'view.lightStatus',
    'putBoolean("available", torchAvailable)',
    'putBoolean("on", on)',
  ],
  'torch status 必须从 RemoteView 回读 on，并保留最近环境光 available'
);

const onTorchVisible = methodBody('private fun onTorchVisible(');
assertOrdered(
  onTorchVisible,
  ['torchAvailable = visible', 'emitTorchStatus(view)'],
  '环境光 callback 必须先保存 available，再用 RemoteView 实际状态 emit'
);

const startRemoteView = methodBody('private fun startRemoteView()');
assertOrdered(
  startRemoteView,
  ['it.onStart()', 'it.onResume()', 'applyPaused()', 'applyTorch()'],
  '首次 pending runtime props 必须在 RemoteView start/resume 后应用'
);

for (const lifecycleMethod of [
  'override fun onAttachedToWindow()',
  'private fun rebuildIfAttached()',
]) {
  assert.match(
    methodBody(lifecycleMethod),
    /startRemoteView\(\)/,
    `${lifecycleMethod} 必须通过统一 lifecycle 路径落实 pending props`
  );
}

assertOrdered(
  methodBody('override fun onHostResume()'),
  ['remoteView?.onResume()', 'applyPaused()', 'applyTorch()'],
  'host resume 后必须重新落实 runtime props 并回传实际 torch 状态'
);
