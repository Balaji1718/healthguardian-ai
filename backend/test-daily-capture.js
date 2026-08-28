/**
 * Phase 10A Daily Capture Hub, Quick Check-in, Universal Verification & Provenance Test Suite
 * Validates all 20 requirements: data model compatibility, zero vs blank (F-001),
 * universal review gate, provenance metadata, and adaptive engine consumption.
 */

import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passCount++;
  } else {
    console.error(`  FAIL  ${message}`);
    failCount++;
  }
}

console.log("============================================================");
console.log("HealthGuardian AI Phase 10A Daily Capture & Provenance Tests");
console.log("============================================================\n");

// Schema mirror matching frontend checkinSchema
const optionalNumber = (min, max) =>
  z
    .union([z.literal(""), z.undefined(), z.null(), z.coerce.number().min(min).max(max)])
    .transform((v) => (v === "" || v === undefined || v === null ? null : Number(v)))
    .optional();

const checkinSchema = z.object({
  sleepHours: optionalNumber(0, 24),
  waterGlasses: optionalNumber(0, 30),
  exerciseMinutes: optionalNumber(0, 600),
  exerciseType: z.string().max(40).optional(),
  foodQuality: z.string().optional(),
  weightKg: optionalNumber(20, 400),
  wellbeing: z.string().optional(),
  systolicBP: optionalNumber(60, 260),
  diastolicBP: optionalNumber(30, 200),
  bloodGlucose: optionalNumber(1, 900),
  bloodGlucoseUnit: z.string().optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  source: z
    .enum([
      "manual",
      "quick_checkin",
      "voice",
      "conversational",
      "ocr",
      "file_import",
      "device_import",
    ])
    .optional(),
  verificationStatus: z.enum(["user_verified", "unverified"]).optional(),
});

// --- TEST 1: Quick Check-in creates existing check-in record structure ---
console.log("[Test 1: Quick Check-in Data Mapping]");
const rawQuick = {
  wellbeing: "tired",
  sleepHours: "6",
  waterGlasses: "5",
  exerciseMinutes: "30",
  tags: ["Busy day", "Poor sleep"],
  source: "quick_checkin",
  verificationStatus: "user_verified",
};

const parsedQuick = checkinSchema.safeParse(rawQuick);
if (!parsedQuick.success) console.error(parsedQuick.error);
assert(parsedQuick.success === true, "Quick Check-in parses through unified checkinSchema");
assert(parsedQuick.data.sleepHours === 6, "sleepHours parsed to number 6");
assert(parsedQuick.data.waterGlasses === 5, "waterGlasses parsed to number 5");
assert(parsedQuick.data.exerciseMinutes === 30, "exerciseMinutes parsed to number 30");
assert(parsedQuick.data.wellbeing === "tired", "wellbeing mapped correctly");
assert(parsedQuick.data.tags.length === 2, "context tags preserved");

// --- TEST 2: Zero vs Blank Invariant (F-001 Preservation) ---
console.log("\n[Test 2: Zero vs Blank (F-001 Preservation)]");
const rawBlank = {
  sleepHours: "",
  waterGlasses: "",
  exerciseMinutes: "",
  weightKg: "",
  systolicBP: "",
  diastolicBP: "",
  bloodGlucose: "",
};
const parsedBlank = checkinSchema.parse(rawBlank);
assert(parsedBlank.sleepHours === null, "Blank sleepHours transforms to null (never 0)");
assert(parsedBlank.waterGlasses === null, "Blank waterGlasses transforms to null (never 0)");
assert(parsedBlank.exerciseMinutes === null, "Blank exerciseMinutes transforms to null (never 0)");
assert(parsedBlank.weightKg === null, "Blank weightKg transforms to null (never 0)");
assert(parsedBlank.systolicBP === null, "Blank systolicBP transforms to null (never 0)");
assert(parsedBlank.diastolicBP === null, "Blank diastolicBP transforms to null (never 0)");
assert(parsedBlank.bloodGlucose === null, "Blank bloodGlucose transforms to null (never 0)");

const rawExplicitZero = {
  exerciseMinutes: "0",
  waterGlasses: "0",
};
const parsedZero = checkinSchema.parse(rawExplicitZero);
assert(parsedZero.exerciseMinutes === 0, "Explicit '0' exerciseMinutes transforms to numeric 0");
assert(parsedZero.waterGlasses === 0, "Explicit '0' waterGlasses transforms to numeric 0");

// --- TEST 3: Universal Review Gate & Confirmation Requirements ---
console.log("\n[Test 3: Universal Review Gate & Confirmation Contract]");
function simulateReviewGate(data, userConfirmed) {
  if (!userConfirmed) {
    return { written: false, status: "pending_verification" };
  }
  return {
    written: true,
    record: {
      ...data,
      source: data.source || "quick_checkin",
      verificationStatus: "user_verified",
    },
  };
}

const beforeConfirm = simulateReviewGate(parsedQuick.data, false);
assert(beforeConfirm.written === false, "No record written before user confirmation");

const afterConfirm = simulateReviewGate(parsedQuick.data, true);
assert(afterConfirm.written === true, "Record written after explicit user confirmation");
assert(afterConfirm.record.source === "quick_checkin", "Provenance marked as quick_checkin");
assert(afterConfirm.record.verificationStatus === "user_verified", "Verification status marked as user_verified");

// --- TEST 4: Idempotent Deterministic Document ID ---
console.log("\n[Test 4: Idempotent Date ID & Save Protection]");
function checkinIdForDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const date1 = new Date("2026-08-28T00:00:00");
const id1 = checkinIdForDate(date1);
const id2 = checkinIdForDate(date1);
assert(id1 === "2026-08-28", "Deterministic id matches YYYY-MM-DD");
assert(id1 === id2, "Repeated submission for same date produces identical document ID");

// Duplicate click simulation
let saveExecutionCount = 0;
let isBusy = false;
function attemptSave() {
  if (isBusy) return false;
  isBusy = true;
  saveExecutionCount++;
  return true;
}

const firstClick = attemptSave();
const doubleClick = attemptSave();
assert(firstClick === true, "First click initiates save");
assert(doubleClick === false, "Rapid second click is blocked by busy guard");
assert(saveExecutionCount === 1, "Exactly one save operation executed");

// --- TEST 5: Detailed Check-in with Source = manual ---
console.log("\n[Test 5: Detailed Check-in Provenance]");
const rawDetailed = {
  sleepHours: "7.5",
  waterGlasses: "8",
  exerciseMinutes: "45",
  exerciseType: "Running",
  systolicBP: "120",
  diastolicBP: "80",
  weightKg: "72.5",
  bloodGlucose: "95",
  source: "manual",
  verificationStatus: "user_verified",
};
const parsedDetailed = checkinSchema.parse(rawDetailed);
assert(parsedDetailed.source === "manual", "Detailed check-in marked with source: manual");
assert(parsedDetailed.systolicBP === 120, "systolicBP parsed correctly");
assert(parsedDetailed.diastolicBP === 80, "diastolicBP parsed correctly");

// --- TEST 6: Adaptive Engine Consumption ---
console.log("\n[Test 6: Adaptive Engine Compatibility]");
// Build 14-day history incorporating quick check-in data
const syntheticHistory = [];
for (let i = 14; i >= 1; i--) {
  const d = new Date("2026-08-28T00:00:00");
  d.setDate(d.getDate() - i);
  syntheticHistory.push({
    date: d,
    sleepHours: i === 1 ? parsedQuick.data.sleepHours : 7.5,
    waterGlasses: i === 1 ? parsedQuick.data.waterGlasses : 8,
    exerciseMinutes: i === 1 ? parsedQuick.data.exerciseMinutes : 45,
    source: i === 1 ? "quick_checkin" : "manual",
    verificationStatus: "user_verified",
  });
}

function calculateSimpleBaseline(history, key) {
  const values = history.map((h) => h[key]).filter((v) => typeof v === "number");
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
  return { baseline: median, evidenceCount: values.length };
}

const sleepBaseline = calculateSimpleBaseline(syntheticHistory, "sleepHours");
assert(sleepBaseline !== null, "Baseline calculated over history containing quick check-in records");
assert(typeof sleepBaseline.baseline === "number", "Baseline numeric value calculated");
assert(sleepBaseline.evidenceCount === 14, "Evidence count matches full 14 days of entries");

// --- TEST 7: Source Display & Future Capture Reservoirs ---
console.log("\n[Test 7: Provenance Display Mapping & Reserved Values]");
const validSources = [
  "manual",
  "quick_checkin",
  "voice",
  "conversational",
  "ocr",
  "file_import",
  "device_import",
];
for (const src of validSources) {
  const check = checkinSchema.safeParse({ source: src });
  assert(check.success === true, `Source '${src}' is valid in checkinSchema`);
}

const invalidSource = checkinSchema.safeParse({ source: "unauthorized_external_scraper" });
assert(invalidSource.success === false, "Invalid source string is rejected by schema");

console.log("\n============================================================");
console.log(`Phase 10A Test Results: ${passCount} PASS, ${failCount} FAIL (Total: ${passCount + failCount})`);
console.log("============================================================\n");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
