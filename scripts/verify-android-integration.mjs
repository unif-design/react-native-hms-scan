import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(
  path.join(
    rootDir,
    'android/src/main/java/com/unif/reactnativehmsscan/HmsScanView.kt'
  ),
  'utf8'
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
