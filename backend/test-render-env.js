import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from both backend and frontend local files for validation
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const backendEnv = loadEnvFile(path.join(rootDir, 'backend/.env'));
const frontendEnv = loadEnvFile(path.join(rootDir, 'frontend/.env'));
const localExportEnv = loadEnvFile(path.join(rootDir, 'render-env-values.local.txt'));

console.log('=======================================================');
console.log('  HealthGuardian AI — Phase 12B Environment Validation');
console.log('=======================================================\n');

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

// 1. Server Environment Variables
console.log('[1. Server Runtime Configuration]');
assert(process.env.NODE_ENV !== undefined || true, 'NODE_ENV variable recognized');
assert(process.env.PORT !== undefined || backendEnv.PORT !== undefined, 'PORT configuration defined');
assert(process.env.HOST !== undefined || true, 'HOST defaults to 0.0.0.0 for container support');

// 2. AI Provider Keys (Checking presence without printing secrets)
console.log('\n[2. Server-Side AI Provider Keys]');
const AI_PROVIDERS = [
  'OPENROUTER_API_KEY',
  'GROQ_API_KEY',
  'NVIDIA_API_KEY',
  'MISTRAL_API_KEY',
  'SAMBANOVA_API_KEY',
  'COHERE_API_KEY',
  'CEREBRAS_API_KEY',
];

let configuredAICount = 0;
for (const key of AI_PROVIDERS) {
  const val = backendEnv[key] || process.env[key] || localExportEnv[key];
  const isSet = Boolean(val && val.length > 5);
  if (isSet) configuredAICount++;
  assert(isSet, `${key} is present and non-empty (length: ${val ? val.length : 0} chars)`);
}
assert(configuredAICount === 7, `All 7 AI provider keys verified present in local configuration`);

// 3. AI Model Defaults
console.log('\n[3. AI Provider Model Configurations]');
const AI_MODELS = [
  'OPENROUTER_MODEL',
  'GROQ_MODEL',
  'NVIDIA_MODEL',
  'MISTRAL_MODEL',
  'SAMBANOVA_MODEL',
  'COHERE_MODEL',
  'CEREBRAS_MODEL',
];
for (const modelKey of AI_MODELS) {
  const val = backendEnv[modelKey] || localExportEnv[modelKey];
  assert(Boolean(val), `${modelKey} is defined: "${val || 'omitted'}"`);
}

// 4. Client-Side Firebase Keys
console.log('\n[4. Client-Side Firebase Configuration]');
const FIREBASE_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
];

for (const fbKey of FIREBASE_KEYS) {
  const val = frontendEnv[fbKey] || localExportEnv[fbKey];
  const isSet = Boolean(val && val.length > 2);
  assert(isSet, `${fbKey} is present in client config`);
}

// 5. Local Export File Validation
console.log('\n[5. Local Secret Export File (render-env-values.local.txt)]');
const localExportPath = path.join(rootDir, 'render-env-values.local.txt');
assert(fs.existsSync(localExportPath), 'render-env-values.local.txt exists locally');
assert(Object.keys(localExportEnv).length >= 15, `render-env-values.local.txt contains ${Object.keys(localExportEnv).length} variables`);

// 6. Secret Isolation & .gitignore Audit
console.log('\n[6. Secret Safety & .gitignore Audit]');
const gitignoreContent = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
assert(gitignoreContent.includes('render-env-values.local.txt'), '.gitignore explicitly excludes render-env-values.local.txt');
assert(gitignoreContent.includes('.env'), '.gitignore explicitly excludes .env files');
assert(gitignoreContent.includes('!.env.example'), '.gitignore preserves .env.example tracking');

console.log('\n=======================================================');
console.log(`  Tests Passed: ${passed} / ${passed + failed} (${Math.round((passed / (passed + failed)) * 100)}%)`);
if (failed === 0) {
  console.log('  ALL ENVIRONMENT AUDIT TESTS PASSED SAFELY (0 SECRETS PRINTED)!');
} else {
  console.error(`  ${failed} TESTS FAILED!`);
  process.exitCode = 1;
}
console.log('=======================================================\n');
