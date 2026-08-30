import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');

console.log('===============================================================');
console.log('  HealthGuardian AI — Phase 12C Build Dependencies Audit');
console.log('===============================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. frontend/package.json exists
const packageJsonPath = path.join(frontendDir, 'package.json');
assert(fs.existsSync(packageJsonPath), 'frontend/package.json exists');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 2. frontend/vite.config.ts references @vitejs/plugin-react
const viteConfigPath = path.join(frontendDir, 'vite.config.ts');
assert(fs.existsSync(viteConfigPath), 'frontend/vite.config.ts exists');
const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
assert(
  viteConfigContent.includes('@vitejs/plugin-react'),
  'frontend/vite.config.ts imports @vitejs/plugin-react',
);

// 3. frontend/package.json declares @vitejs/plugin-react
const declaredInDev = Boolean(packageJson.devDependencies?.['@vitejs/plugin-react']);
const declaredInProd = Boolean(packageJson.dependencies?.['@vitejs/plugin-react']);
assert(
  declaredInDev || declaredInProd,
  `frontend/package.json declares @vitejs/plugin-react (version: ${packageJson.devDependencies?.['@vitejs/plugin-react'] || packageJson.dependencies?.['@vitejs/plugin-react']})`,
);

// 4. frontend/package-lock.json contains @vitejs/plugin-react
const lockfilePath = path.join(frontendDir, 'package-lock.json');
assert(fs.existsSync(lockfilePath), 'frontend/package-lock.json exists');
const lockfileContent = fs.readFileSync(lockfilePath, 'utf8');
assert(
  lockfileContent.includes('node_modules/@vitejs/plugin-react'),
  'frontend/package-lock.json contains resolved node_modules/@vitejs/plugin-react entry',
);

// 5. Installed package exists on disk
const installedPackageJsonPath = path.join(frontendDir, 'node_modules/@vitejs/plugin-react/package.json');
assert(
  fs.existsSync(installedPackageJsonPath),
  'frontend/node_modules/@vitejs/plugin-react/package.json exists on disk',
);
if (fs.existsSync(installedPackageJsonPath)) {
  const installedPkg = JSON.parse(fs.readFileSync(installedPackageJsonPath, 'utf8'));
  assert(
    Boolean(installedPkg.version),
    `Installed @vitejs/plugin-react version verified: ${installedPkg.version}`,
  );
}

// 6. Root package.json install:all includes --include=dev for production builds
const rootPackageJsonPath = path.join(rootDir, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
assert(
  rootPkg.scripts?.['install:all']?.includes('--include=dev'),
  'root package.json install:all includes --include=dev for frontend build tooling',
);

// 7. frontend/package.json declares cross-platform native bindings
assert(
  Boolean(packageJson.optionalDependencies?.['@rolldown/binding-linux-x64-gnu']),
  'frontend/package.json declares @rolldown/binding-linux-x64-gnu in optionalDependencies',
);
assert(
  Boolean(packageJson.optionalDependencies?.['lightningcss-linux-x64-gnu']),
  'frontend/package.json declares lightningcss-linux-x64-gnu in optionalDependencies',
);
assert(
  Boolean(packageJson.optionalDependencies?.['@tailwindcss/oxide-linux-x64-gnu']),
  'frontend/package.json declares @tailwindcss/oxide-linux-x64-gnu in optionalDependencies',
);

// 8. frontend/package-lock.json contains Linux native bindings for Render
assert(
  lockfileContent.includes('node_modules/@rolldown/binding-linux-x64-gnu'),
  'frontend/package-lock.json contains resolved node_modules/@rolldown/binding-linux-x64-gnu entry',
);
assert(
  lockfileContent.includes('lightningcss-linux-x64-gnu'),
  'frontend/package-lock.json contains resolved lightningcss-linux-x64-gnu entry',
);
assert(
  lockfileContent.includes('@tailwindcss/oxide-linux-x64-gnu'),
  'frontend/package-lock.json contains resolved @tailwindcss/oxide-linux-x64-gnu entry',
);

// 9. frontend/dist build output verified
const distHtmlPath = path.join(frontendDir, 'dist/index.html');
assert(fs.existsSync(distHtmlPath), 'frontend/dist/index.html exists and is generated');

console.log('\n===============================================================');
console.log(`  Tests Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed === 0) {
  console.log('  ALL BUILD DEPENDENCY ASSERTIONS PASSED!');
} else {
  console.error(`  ${failed} TESTS FAILED!`);
  process.exitCode = 1;
}
console.log('===============================================================\n');
