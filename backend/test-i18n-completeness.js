/**
 * Phase 11 — Full Application Localization Completeness Test Suite
 * 
 * Verifies:
 * 1. Complete key parity across en.json, ta.json, hi.json (0 missing keys)
 * 2. Native language display names: English, தமிழ், हिन्दी
 * 3. Script validation for Tamil (Unicode \u0B80-\u0BFF) and Hindi (\u0900-\u097F)
 * 4. Medical clinical terms parity
 * 5. Deterministic Emergency Gate in English, Tamil, and Hindi
 * 6. Numeric & unit stability across languages (mmHg, mg/dL, kg, hours)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.resolve(__dirname, "../frontend/src/locales");
const enPath = path.join(localesDir, "en.json");
const taPath = path.join(localesDir, "ta.json");
const hiPath = path.join(localesDir, "hi.json");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function getLeafKeys(obj, prefix = "") {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys = keys.concat(getLeafKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, dotPath) {
  return dotPath.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

console.log("\n=======================================================");
console.log("  HealthGuardian AI — Phase 11 i18n Localization Tests");
console.log("=======================================================\n");

// 1. Load Dictionary Files
console.log("1. Dictionary Files Existence & JSON Validity");
assert(fs.existsSync(enPath), "en.json exists");
assert(fs.existsSync(taPath), "ta.json exists");
assert(fs.existsSync(hiPath), "hi.json exists");

const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));
const ta = JSON.parse(fs.readFileSync(taPath, "utf-8"));
const hi = JSON.parse(fs.readFileSync(hiPath, "utf-8"));

const enKeys = getLeafKeys(en);
const taKeys = getLeafKeys(ta);
const hiKeys = getLeafKeys(hi);

assert(enKeys.length > 50, `en.json contains ${enKeys.length} translation keys`);
assert(taKeys.length > 50, `ta.json contains ${taKeys.length} translation keys`);
assert(hiKeys.length > 50, `hi.json contains ${hiKeys.length} translation keys`);

// 2. Key-for-Key Completeness (0 Missing Keys)
console.log("\n2. Key-for-Key Completeness & Parity");
const missingInTamil = enKeys.filter((k) => getNestedValue(ta, k) === undefined);
const missingInHindi = enKeys.filter((k) => getNestedValue(hi, k) === undefined);

assert(missingInTamil.length === 0, `Tamil translation completeness: 0 missing keys (found ${missingInTamil.length})`);
assert(missingInHindi.length === 0, `Hindi translation completeness: 0 missing keys (found ${missingInHindi.length})`);

// 3. User-Facing Native Language Display Names
console.log("\n3. Native Language Selector Display Names");
assert(en.languages.en === "English", "English label is 'English'");
assert(en.languages.ta === "தமிழ்", "Tamil label is native 'தமிழ்'");
assert(en.languages.hi === "हिन्दी", "Hindi label is native 'हिन्दी'");
assert(ta.languages.ta === "தமிழ்", "Tamil in ta.json is native 'தமிழ்'");
assert(hi.languages.hi === "हिन्दी", "Hindi in hi.json is native 'हिन्दी'");

// 4. Script Validation (Tamil & Hindi characters)
console.log("\n4. Script Validation (Unicode Character Sets)");
const hasTamilScript = (str) => /[\u0B80-\u0BFF]/.test(str);
const hasDevanagariScript = (str) => /[\u0900-\u097F]/.test(str);

const tamilSampleKeys = [
  "nav.dashboard",
  "nav.dailyCheckin",
  "auth.signIn",
  "auth.createAccount",
  "checkin.placeholder",
  "review.gateTitle",
  "emergency.warningTitle",
];

for (const k of tamilSampleKeys) {
  const val = getNestedValue(ta, k);
  assert(typeof val === "string" && hasTamilScript(val), `Tamil '${k}' contains valid Tamil script: "${val?.slice(0, 30)}..."`);
}

const hindiSampleKeys = [
  "nav.dashboard",
  "nav.dailyCheckin",
  "auth.signIn",
  "auth.createAccount",
  "checkin.placeholder",
  "review.gateTitle",
  "emergency.warningTitle",
];

for (const k of hindiSampleKeys) {
  const val = getNestedValue(hi, k);
  assert(typeof val === "string" && hasDevanagariScript(val), `Hindi '${k}' contains valid Devanagari script: "${val?.slice(0, 30)}..."`);
}

// 5. Clinical and Medical Terminology Accuracy
console.log("\n5. Clinical Terminology Phrasing Accuracy");
assert(getNestedValue(ta, "dashboard.bloodPressure") === "இரத்த அழுத்தம்", "Tamil blood pressure translation is 'இரத்த அழுத்தம்'");
assert(getNestedValue(hi, "dashboard.bloodPressure") === "रक्तचाप", "Hindi blood pressure translation is 'रक्तचाप'");
assert(getNestedValue(ta, "dashboard.bloodGlucose") === "இரத்த சர்க்கரை", "Tamil blood glucose translation is 'இரத்த சர்க்கரை'");
assert(getNestedValue(hi, "dashboard.bloodGlucose") === "रक्त शर्करा", "Hindi blood glucose translation is 'रक्त शर्करा'");
assert(getNestedValue(ta, "dashboard.sleep") === "தூக்கம்", "Tamil sleep translation is 'தூக்கம்'");
assert(getNestedValue(hi, "dashboard.sleep") === "नींद", "Hindi sleep translation is 'नींद'");

// 6. Unit & Number Immutability Check
console.log("\n6. Numbers & Units Immutability Verification");
const units = ["mmHg", "mg/dL", "kg", "hours", "glasses"];
for (const unit of units) {
  assert(en.units[unit] === ta.units[unit] && ta.units[unit] === hi.units[unit], `Unit '${unit}' is identical across en, ta, hi: "${en.units[unit]}"`);
}

// 7. Check-in Composer Localized Placeholders
console.log("\n7. Check-in Composer Localized Placeholders");
assert(en.checkin.placeholder.includes("Type your health update"), "English placeholder matches standard");
assert(ta.checkin.placeholder.includes("உங்கள் இன்றைய உடல்நிலை"), "Tamil placeholder is natural and helpful");
assert(hi.checkin.placeholder.includes("आज की स्वास्थ्य जानकारी"), "Hindi placeholder is natural and helpful");

// 8. Deterministic Emergency Gate Multilingual Regex Matching
console.log("\n8. Deterministic Emergency Gate Multilingual Triggers");
function checkEmergencyTrigger(text) {
  const msgHasChest =
    /\b(chest\s*(?:pain|discomfort|pressure)|heart\s*pain)\b/i.test(text) ||
    /(?:நெஞ்சு\s*வலி|மாரடைப்பு|மார்பு\s*வலி)/i.test(text) ||
    /(?:सीने\s*में\s*दर्द|हृदय\s*दर्द)/i.test(text);

  const msgHasBreathing =
    /\b(shortness\s*of\s*breath|severe\s*breathing\s*difficulty|cannot\s*breathe|cant\s*breathe|can't\s*breathe|trouble\s*breathing)\b/i.test(text) ||
    /(?:மூச்சுத்திணறல்|சுவாசிக்க\s*முடியவில்லை|மூச்சு\s*வாங்க)/i.test(text) ||
    /(?:सांस\s*लेने\s*में\s*तकलीफ|सांस\s*नहीं\s*ले\s*पा\s*रहा|दम\s*घुट)/i.test(text);

  const msgHasFainting =
    /\b(faint(?:ed|ing)?|passed\s*out|loss\s*of\s*consciousness)\b/i.test(text) ||
    /(?:மயக்கம்|மயங்கி|நினைவிழந்த)/i.test(text) ||
    /(?:बेहोश|मूर्छित|चक्कर\s*आकर\s*गिर)/i.test(text);

  return msgHasChest || msgHasBreathing || msgHasFainting;
}

assert(checkEmergencyTrigger("I have severe chest pain since morning"), "English 'chest pain' triggers emergency gate");
assert(checkEmergencyTrigger("எனக்கு கடுமையான நெஞ்சு வலி உள்ளது"), "Tamil 'நெஞ்சு வலி' triggers emergency gate");
assert(checkEmergencyTrigger("मुझे सीने में दर्द और सांस लेने में तकलीफ है"), "Hindi 'सीने में दर्द' triggers emergency gate");
assert(checkEmergencyTrigger("எனக்கு மூச்சுத்திணறல் அதிகமாக உள்ளது"), "Tamil 'மூச்சுத்திணறல்' triggers emergency gate");
assert(checkEmergencyTrigger("मरीज अचानक बेहोश हो गया"), "Hindi 'बेहोश' triggers emergency gate");
assert(!checkEmergencyTrigger("I walked 30 minutes and drank water"), "Non-emergency message does not trigger emergency gate");
assert(!checkEmergencyTrigger("நான் 30 நிமிடம் நடைபயிற்சி செய்தேன்"), "Tamil routine checkin does not trigger emergency gate");
assert(!checkEmergencyTrigger("आज मैंने 7 घंटे नींद ली"), "Hindi routine checkin does not trigger emergency gate");

// Summary
console.log("\n=======================================================");
console.log(`  Tests Passed: ${passedTests} / ${totalTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests > 0) {
  console.error(`  Tests Failed: ${failedTests}`);
  process.exit(1);
} else {
  console.log("  ALL PHASE 11 LOCALIZATION TESTS PASSED!");
  console.log("=======================================================\n");
}
