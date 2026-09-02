import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

async function copyRepositoryFile(fixtureRoot, relativePath) {
  const destination = join(fixtureRoot, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(repositoryRoot, relativePath), destination);
}

function runVerifier(fixtureRoot, scriptName, args = []) {
  return spawnSync(
    process.execPath,
    [join(fixtureRoot, 'scripts', scriptName), ...args],
    {
      cwd: fixtureRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: join(fixtureRoot, '.npm-cache'),
      },
    }
  );
}

function verifierOutput(result) {
  return `${result.stderr}\n${result.stdout}`;
}

test('example README keeps the iOS Pods workflow reproducible from the repository root', async () => {
  const readme = await readFile(
    join(repositoryRoot, 'example/README.md'),
    'utf8'
  );
  const expectedPodsBlock = `\`\`\`sh
(
  cd example
  bundle install
  bundle exec pod install --project-directory=ios
)
\`\`\``;

  assert.ok(
    readme.includes(expectedPodsBlock),
    'example README must enter example before bundle install and pod install'
  );
  assert.ok(
    readme.includes(
      '`(cd example && bundle install && bundle exec pod install --project-directory=ios)` 后 `yarn example build:ios`'
    ),
    'the iOS test matrix must preserve the same root-safe Pods workflow'
  );
  assert.doesNotMatch(
    readme,
    /bundle exec pod install --project-directory=example\/ios/
  );
});

test('example README exposes the reproducible Scanner demo input and unmatched boundary', async () => {
  const readme = await readFile(
    join(repositoryRoot, 'example/README.md'),
    'utf8'
  );

  assert.match(readme, /EAN-13 `6925303773908`/);
  assert.match(readme, /阿萨姆原味奶茶 500ml/);
  assert.match(readme, /其他条码[^\n]*`null`/);
});

test('CI code filter treats ESLint and Jest setup changes as executable code', async () => {
  const workflow = await readFile(
    join(repositoryRoot, '.github/workflows/ci.yml'),
    'utf8'
  );
  const codeStart = workflow.indexOf('\n            code:\n');
  const codeEnd = workflow.indexOf('\n  lint:\n', codeStart);

  assert.notEqual(codeStart, -1, 'CI workflow must define the code filter');
  assert.notEqual(codeEnd, -1, 'CI workflow code filter must precede lint');
  const codeFilter = workflow.slice(codeStart, codeEnd);

  assert.match(codeFilter, /^\s+- 'eslint\.config\.mjs'$/m);
  assert.match(codeFilter, /^\s+- 'jest\.setup\.ts'$/m);
});

test('Android integration matches React Native lock entries instead of unrelated 0.85.3 values', async () => {
  const fixtureRoot = await mkdtemp(
    join(tmpdir(), 'hms-scan-android-contract-')
  );

  try {
    await Promise.all(
      [
        'package.json',
        'example/package.json',
        'example/android/app/src/main/AndroidManifest.xml',
        'example/android/build.gradle',
        'example/android/gradle.properties',
        'scripts/verify-android-integration.mjs',
        'android/src/main/java/com/unif/reactnativehmsscan/HmsScanView.kt',
      ].map((relativePath) =>
        copyRepositoryFile(fixtureRoot, relativePath)
      )
    );
    await Promise.all(
      [
        [
          '@unif/react-native-design',
          {
            version: '0.30.1',
            peerDependencies: {
              'react-native-gesture-handler': '>=3.0.0 <4.0.0',
            },
          },
        ],
        ['react-native-gesture-handler', { version: '3.1.0' }],
        [
          'react-native-reanimated-carousel',
          {
            version: '5.0.0',
            peerDependencies: {
              'react-native-gesture-handler': '>=2.9.0 <3.0.0',
            },
          },
        ],
      ].map(async ([packageName, manifest]) => {
        const packageDirectory = join(
          fixtureRoot,
          'node_modules',
          packageName
        );
        await mkdir(packageDirectory, { recursive: true });
        await writeFile(
          join(packageDirectory, 'package.json'),
          `${JSON.stringify(manifest, null, 2)}\n`
        );
      })
    );

    const rootPackage = JSON.parse(
      await readFile(join(fixtureRoot, 'package.json'), 'utf8')
    );
    Object.assign(rootPackage.devDependencies, {
      '@babel/core': '^7.25.2',
      '@eslint/js': '^8.57.1',
      '@react-native/metro-config': '0.86.3',
      eslint: '^8.57.1',
    });
    await writeFile(
      join(fixtureRoot, 'package.json'),
      `${JSON.stringify(rootPackage, null, 2)}\n`
    );

    const websitePackage = {
      dependencies: {
        '@sbaiahmed1/react-native-blur': '6.0.1',
        '@unif/react-native-design': '0.30.1',
        '@unif/react-native-hms-scan': 'workspace:*',
        react: '19.2.3',
        'react-dom': '19.2.3',
        'react-native': '0.86.3',
        'react-native-gesture-handler': '^3.1.0',
        'react-native-reanimated': '^4.6.0',
        'react-native-reanimated-carousel': '^5.0.0',
        'react-native-safe-area-context': '^5.7.0',
        'react-native-svg': '^15.15.5',
        'react-native-worklets': '^0.12.1',
      },
      devDependencies: {
        '@babel/core': '^7.25.2',
        '@react-native/metro-config': '0.86.3',
        '@types/react': '^19.2.0',
      },
    };
    await mkdir(join(fixtureRoot, 'website'), { recursive: true });
    await writeFile(
      join(fixtureRoot, 'website/package.json'),
      `${JSON.stringify(websitePackage, null, 2)}\n`
    );

    const safeLockfile = `"react-native@npm:0.86.3":
  version: 0.86.3
  resolution: "react-native@npm:0.86.3"

"unrelated-tool@npm:0.85.3":
  version: 0.85.3
  resolution: "unrelated-tool@npm:0.85.3"
`;
    await writeFile(join(fixtureRoot, 'yarn.lock'), safeLockfile);

    const safeResult = runVerifier(
      fixtureRoot,
      'verify-android-integration.mjs'
    );
    assert.equal(
      safeResult.status,
      0,
      `unrelated 0.85.3 entries must remain valid:\n${verifierOutput(safeResult)}`
    );

    const peerDriftPackage = JSON.parse(JSON.stringify(rootPackage));
    peerDriftPackage.peerDependencies['react-native-svg'] = '>=16';
    await writeFile(
      join(fixtureRoot, 'package.json'),
      `${JSON.stringify(peerDriftPackage, null, 2)}\n`
    );

    const peerDriftResult = runVerifier(
      fixtureRoot,
      'verify-android-integration.mjs'
    );
    assert.notEqual(
      peerDriftResult.status,
      0,
      'Android integration must reject drift in every public peer dependency'
    );
    assert.match(
      verifierOutput(peerDriftResult),
      /peerDependencies.*public contract/i
    );

    await writeFile(
      join(fixtureRoot, 'package.json'),
      `${JSON.stringify(rootPackage, null, 2)}\n`
    );
    const mutatedLockfile = safeLockfile.replaceAll(
      'react-native@npm:0.86.3',
      'react-native@npm:0.85.3'
    );
    await writeFile(join(fixtureRoot, 'yarn.lock'), mutatedLockfile);

    const mutatedResult = runVerifier(
      fixtureRoot,
      'verify-android-integration.mjs'
    );
    assert.notEqual(
      mutatedResult.status,
      0,
      'Android integration must reject an RN 0.85 package resolution'
    );
    assert.match(verifierOutput(mutatedResult), /react-native@npm:0\.85\.3/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('iOS integration rejects a tracked Pod lock that remains ignored', async () => {
  const fixtureRoot = await mkdtemp(
    join(tmpdir(), 'hms-scan-ios-contract-')
  );

  try {
    await Promise.all(
      [
        'package.json',
        'ReactNativeHmsScan.podspec',
        'turbo.json',
        'example/package.json',
        'example/ios/ReactNativeHmsScanExample/Info.plist',
        'example/ios/Podfile.lock',
        'scripts/verify-ios-integration.mjs',
      ].map((relativePath) =>
        copyRepositoryFile(fixtureRoot, relativePath)
      )
    );
    await writeFile(join(fixtureRoot, '.gitignore'), '');

    const initResult = spawnSync('git', ['init', '-q'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
    assert.equal(initResult.status, 0, verifierOutput(initResult));
    const addResult = spawnSync('git', ['add', '-f', '.'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
    assert.equal(addResult.status, 0, verifierOutput(addResult));

    const safeResult = runVerifier(
      fixtureRoot,
      'verify-ios-integration.mjs',
      ['--require-lock']
    );
    assert.equal(safeResult.status, 0, verifierOutput(safeResult));

    await writeFile(
      join(fixtureRoot, '.gitignore'),
      'example/ios/Podfile.lock\n'
    );
    const ignoredResult = runVerifier(
      fixtureRoot,
      'verify-ios-integration.mjs',
      ['--require-lock']
    );
    assert.notEqual(
      ignoredResult.status,
      0,
      'iOS integration must reject an ignored versioned Pod lock'
    );
    assert.match(
      verifierOutput(ignoredResult),
      /example\/ios\/Podfile\.lock/
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
