/**
 * F-001 Regression Test — optionalNumber Zod schema blank → null
 *
 * Verifies that:
 *   - blank string ""  → null  (was: 0 before the fix)
 *   - undefined        → null
 *   - null             → null
 *   - "0"              → 0     (explicit zero is preserved)
 *   - 0                → 0     (numeric zero is preserved)
 *   - valid values     → Number(value)
 *   - out-of-range     → Zod error (min/max preserved)
 *
 * The critical distinction:
 *   NOT ENTERED (blank) → null   (unknown, excluded from baselines)
 *   USER ENTERED ZERO   → 0     (real measurement, included in baselines)
 */

import { z } from "zod";

// --- replicate the exact helper from schemas.ts (post-fix) ---
const optionalNumber = (min, max) =>
  z
    .union([z.literal(""), z.undefined(), z.null(), z.coerce.number().min(min).max(max)])
    .transform((v) => (v === "" || v === undefined || v === null ? null : Number(v)));

// Use .partial() equivalents by testing the helper directly
const sleepField   = optionalNumber(0, 24);
const waterField   = optionalNumber(0, 30);
const exercField   = optionalNumber(0, 600);
const weightField  = optionalNumber(20, 400);
const sysField     = optionalNumber(60, 260);
const diasField    = optionalNumber(30, 200);
const glucoseField = optionalNumber(1, 900);

// Full checkin schema (to test full-form blank scenario)
const checkinSchema = z.object({
  sleepHours:      sleepField,
  waterGlasses:    waterField,
  exerciseMinutes: exercField,
  weightKg:        weightField,
  systolicBP:      sysField,
  diastolicBP:     diasField,
  bloodGlucose:    glucoseField,
});

// --- test helpers ---
let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  const ok = actual === expected;
  if (ok) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    failed++;
  }
}

function parseField(schema, input) {
  const r = schema.safeParse(input);
  if (!r.success) return { error: r.error.issues.map(i => i.message).join("; ") };
  return r.data;
}

function assertFieldError(label, schema, input) {
  const r = schema.safeParse(input);
  if (!r.success) {
    console.log(`  PASS  ${label} (correctly rejected: ${r.error.issues[0]?.message})`);
    passed++;
  } else {
    console.error(`  FAIL  ${label} — expected Zod error but got ${JSON.stringify(r.data)}`);
    failed++;
  }
}

// ============================================================
// GROUP 1 — sleepHours (min 0, max 24)
// ============================================================
console.log("\n[sleepHours — optionalNumber(0, 24)]");

assert("blank string ''  → null",               parseField(sleepField, ""), null);
assert("undefined        → null",               parseField(sleepField, undefined), null);
assert("null             → null",               parseField(sleepField, null), null);
assert("string '0'       → 0 (real zero)",      parseField(sleepField, "0"), 0);
assert("numeric 0        → 0 (real zero)",      parseField(sleepField, 0), 0);
assert("'5'              → 5",                  parseField(sleepField, "5"), 5);
assert("'8.5'            → 8.5",                parseField(sleepField, "8.5"), 8.5);
assert("8.5 (number)     → 8.5",                parseField(sleepField, 8.5), 8.5);
assertFieldError("negative (-1)    → error",    sleepField, "-1");
assertFieldError("exceeds max (25) → error",    sleepField, "25");

// ============================================================
// GROUP 2 — waterGlasses (min 0, max 30)
// ============================================================
console.log("\n[waterGlasses — optionalNumber(0, 30)]");

assert("blank ''         → null",               parseField(waterField, ""), null);
assert("undefined        → null",               parseField(waterField, undefined), null);
assert("null             → null",               parseField(waterField, null), null);
assert("'0'              → 0 (real zero)",      parseField(waterField, "0"), 0);
assert("'8'              → 8",                  parseField(waterField, "8"), 8);
assertFieldError("exceeds max (31) → error",    waterField, "31");

// ============================================================
// GROUP 3 — exerciseMinutes (min 0, max 600)
// ============================================================
console.log("\n[exerciseMinutes — optionalNumber(0, 600)]");

assert("blank ''         → null",               parseField(exercField, ""), null);
assert("undefined        → null",               parseField(exercField, undefined), null);
assert("null             → null",               parseField(exercField, null), null);
assert("'0'              → 0 (real zero)",      parseField(exercField, "0"), 0);
assert("'30'             → 30",                 parseField(exercField, "30"), 30);
assertFieldError("exceeds max (601) → error",   exercField, "601");

// ============================================================
// GROUP 4 — vitals: already-correct fields must remain correct
// ============================================================
console.log("\n[vitals — already-correct fields]");

assert("weightKg blank   → null",    parseField(weightField, ""), null);
assert("weightKg '70'    → 70",      parseField(weightField, "70"), 70);
assert("systolicBP blank → null",    parseField(sysField, ""), null);
assert("systolicBP '120' → 120",     parseField(sysField, "120"), 120);
assert("diastolicBP blank→ null",    parseField(diasField, ""), null);
assert("diastolicBP '80' → 80",      parseField(diasField, "80"), 80);
assert("bloodGlucose blank→ null",   parseField(glucoseField, ""), null);
assert("bloodGlucose '95'→ 95",      parseField(glucoseField, "95"), 95);

// ============================================================
// GROUP 5 — full blank form (the key F-001 scenario)
// ============================================================
console.log("\n[full blank form — all fields empty string]");

const blankForm = {
  sleepHours: "", waterGlasses: "", exerciseMinutes: "",
  weightKg: "",  systolicBP: "",   diastolicBP: "",   bloodGlucose: "",
};
const blankResult = checkinSchema.parse(blankForm);
assert("sleepHours       → null",  blankResult.sleepHours, null);
assert("waterGlasses     → null",  blankResult.waterGlasses, null);
assert("exerciseMinutes  → null",  blankResult.exerciseMinutes, null);
assert("weightKg         → null",  blankResult.weightKg, null);
assert("systolicBP       → null",  blankResult.systolicBP, null);
assert("diastolicBP      → null",  blankResult.diastolicBP, null);
assert("bloodGlucose     → null",  blankResult.bloodGlucose, null);

// ============================================================
// GROUP 6 — syncCheckinToHealthRecords guard
// ============================================================
console.log("\n[health record sync guard — null/undefined skipped]");

// mirrors syncCheckinToHealthRecords in repositories.ts:
//   if (value === undefined || value === null || Number.isNaN(value)) continue;
function syncSimulation(data) {
  const metrics = [
    ["sleep",        data.sleepHours],
    ["water",        data.waterGlasses],
    ["exercise",     data.exerciseMinutes],
    ["weight",       data.weightKg],
    ["glucose",      data.bloodGlucose],
    ["systolicBP",   data.systolicBP],
    ["diastolicBP",  data.diastolicBP],
  ];
  const written = [];
  for (const [metric, value] of metrics) {
    if (value === undefined || value === null || Number.isNaN(value)) continue;
    written.push({ metric, numericValue: value });
  }
  return written;
}

const blankCheckin = {
  sleepHours: null, waterGlasses: null, exerciseMinutes: null,
  weightKg: null,   bloodGlucose: null, systolicBP: null,    diastolicBP: null,
};
const writtenForBlank = syncSimulation(blankCheckin);
assert("blank check-in writes 0 health records", writtenForBlank.length, 0);

const partialCheckin = {
  sleepHours: 7, waterGlasses: null, exerciseMinutes: 30,
  weightKg: null, bloodGlucose: null, systolicBP: null, diastolicBP: null,
};
const writtenForPartial = syncSimulation(partialCheckin);
assert("partial check-in writes 2 health records (sleep + exercise)", writtenForPartial.length, 2);
assert("sleep record numericValue = 7",   writtenForPartial[0]?.numericValue, 7);
assert("exercise record numericValue = 30", writtenForPartial[1]?.numericValue, 30);

// Explicit zeros ARE real measurements — must be written
const zeroCheckin = {
  sleepHours: 0, waterGlasses: 0, exerciseMinutes: 0,
  weightKg: null, bloodGlucose: null, systolicBP: null, diastolicBP: null,
};
const writtenForZero = syncSimulation(zeroCheckin);
assert("explicit zero check-in writes 3 health records", writtenForZero.length, 3);

// ============================================================
// GROUP 7 — adaptive series: null excluded, zero included
// ============================================================
console.log("\n[adaptive series — null excluded from engine calculations]");

// mirrors engine.ts series() helper:
//   .filter(v => typeof v === "number" && !Number.isNaN(v))
function series(checkins, key) {
  return checkins.map(c => c[key]).filter(v => typeof v === "number" && !Number.isNaN(v));
}

const checkinsWithNulls = [
  { sleepHours: null },   // blank entry — must be excluded
  { sleepHours: 7 },
  { sleepHours: null },   // blank entry — must be excluded
  { sleepHours: 8 },
  { sleepHours: 0 },      // explicit zero — must be included
];

const sleepSeries = series(checkinsWithNulls, "sleepHours");
assert("null entries excluded from series (length=3)", sleepSeries.length, 3);
assert("series[0] = 7",  sleepSeries[0], 7);
assert("series[1] = 8",  sleepSeries[1], 8);
assert("series[2] = 0 (explicit zero preserved)", sleepSeries[2], 0);

// Baseline computation: null-only entries should produce null baseline
function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const nullOnlyCheckins = [
  { sleepHours: null }, { sleepHours: null }, { sleepHours: null },
];
const nullSeries = series(nullOnlyCheckins, "sleepHours");
const nullBaseline = median(nullSeries);
assert("all-null series produces null baseline", nullBaseline, null);

const mixedCheckins = [
  { sleepHours: null }, { sleepHours: 7 }, { sleepHours: 8 }, { sleepHours: null }, { sleepHours: 0 },
];
const mixedSeries = series(mixedCheckins, "sleepHours");
const mixedBaseline = median(mixedSeries);
assert("mixed series baseline = median([7,8,0]) = 7", mixedBaseline, 7);

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${"=".repeat(60)}`);
console.log(`F-001 Regression Test Results`);
console.log(`${"=".repeat(60)}`);
console.log(`  PASS: ${passed}`);
console.log(`  FAIL: ${failed}`);
console.log(`  Total: ${passed + failed}`);
console.log(`${"=".repeat(60)}`);

if (failed > 0) {
  console.error("\nF-001 regression test FAILED — see failures above.");
  process.exit(1);
} else {
  console.log("\nAll F-001 regression assertions passed. Fix is verified.");
  process.exit(0);
}
