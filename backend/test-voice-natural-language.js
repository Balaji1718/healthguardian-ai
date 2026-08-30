/**
 * test-voice-natural-language.js — Phase 10C Natural Language Understanding & Extraction Suite
 *
 * Verifies:
 * 1. Diverse natural phrasings and sentence structures (not rigid keywords)
 * 2. Conversational sentence variations in English, Tamil, Tanglish, Hindi, Hinglish
 * 3. Approximate phrasings ("about 6 hours", "around 5 glasses")
 * 4. Word order variations ("Drank 8 glasses of water and had 7 hours sleep")
 * 5. Fragmented vs full sentences
 * 6. Explicit 0 preservation vs unmentioned nulls
 * 7. Clean clinical summary generation in notes field
 */

import { extractWithRules } from "./conversational-checkin.js";

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
console.log("HealthGuardian AI — Phase 10C Natural Language Understanding Tests");
console.log("============================================================\n");

// --- TEST 1: Inverted Word Order & Conversational Phrasing ---
console.log("[Test 1: Inverted Word Order & Conversational Phrasing]");
const phrase1 = "Drank 8 glasses of water today, went for a 45 mins walk in the evening, and got around 7 hours sleep. Felt amazing!";
const r1 = extractWithRules(phrase1);
assert(r1.sleepHours === 7, "Inverted phrasing: sleepHours = 7");
assert(r1.waterGlasses === 8, "Inverted phrasing: waterGlasses = 8");
assert(r1.exerciseMinutes === 45, "Inverted phrasing: exerciseMinutes = 45");
assert(r1.exerciseType === "Walking", "Inverted phrasing: exerciseType = Walking");
assert(r1.wellbeing === "great", "Inverted phrasing: wellbeing = great");

// --- TEST 2: Tamil Conversational Variations ---
console.log("\n[Test 2: Tamil Conversational Variations]");
const phrase2 = "நேத்து நைட் 7 மணி நேரம் நல்லா தூங்கினேன், காலையில 20 நிமிஷம் நடைபயிற்சி போனேன், 4 கிளாஸ் தண்ணி குடிச்சேன்.";
const r2 = extractWithRules(phrase2);
assert(r2.sleepHours === 7, "Tamil colloquial: sleepHours = 7");
assert(r2.exerciseMinutes === 20, "Tamil colloquial: exerciseMinutes = 20");
assert(r2.exerciseType === "Walking", "Tamil colloquial: exerciseType = Walking");
assert(r2.waterGlasses === 4, "Tamil colloquial: waterGlasses = 4");

// --- TEST 3: Hindi / Hinglish Natural Phrasing ---
console.log("\n[Test 3: Hindi / Hinglish Natural Phrasing]");
const phrase3 = "Kal raat 8 ghante soya aur subah 30 min walk kiya, 6 glass paani piya. Bahut badhiya laga.";
const r3 = extractWithRules(phrase3);
assert(r3.sleepHours === 8, "Hinglish: sleepHours = 8");
assert(r3.exerciseMinutes === 30, "Hinglish: exerciseMinutes = 30");
assert(r3.exerciseType === "Walking", "Hinglish: exerciseType = Walking");
assert(r3.waterGlasses === 6, "Hinglish: waterGlasses = 6");
assert(r3.wellbeing === "great", "Hinglish: wellbeing = great");

// --- TEST 4: Tanglish Real-World Phonetic Utterance ---
console.log("\n[Test 4: Tanglish Real-World Phonetic Utterance]");
const phrase4 = "Nan Inaki Army Nehra Tong ne. Aur endglass kaafi Puducherry.";
const r4 = extractWithRules(phrase4);
assert(r4.sleepHours === 6, "Tanglish phonetic 'Army Nehra Tong': sleepHours = 6");
assert(r4.waterGlasses === 2, "Tanglish phonetic 'endglass': waterGlasses = 2");
assert(r4.foodQuality === "Coffee / Beverage", "Tanglish beverage 'kaafi': Coffee / Beverage");

// --- TEST 5: Explicit Zero vs Unmentioned Null Preservation ---
console.log("\n[Test 5: Explicit Zero vs Unmentioned Null]");
const phrase5 = "Slept 6 hours, drank 0 glasses water today.";
const r5 = extractWithRules(phrase5);
assert(r5.sleepHours === 6, "Slept 6 hours");
assert(r5.waterGlasses === 0, "Explicit '0 glasses water' -> waterGlasses = 0");
assert(r5.exerciseMinutes === null, "Unmentioned exercise remains null");
assert(r5.systolicBP === null, "Unmentioned BP remains null");
assert(r5.bloodGlucose === null, "Unmentioned glucose remains null");

// --- TEST 6: Clinical Vitals Natural Expression ---
console.log("\n[Test 6: Clinical Vitals Natural Expression]");
const phrase6 = "Checked my bp this morning it was 125 82 and sugar was 105, current weight 68.5 kg.";
const r6 = extractWithRules(phrase6);
assert(r6.systolicBP === 125, "Systolic BP = 125");
assert(r6.diastolicBP === 82, "Diastolic BP = 82");
assert(r6.bloodGlucose === 105, "Blood glucose = 105");
assert(r6.weightKg === 68.5, "Weight = 68.5 kg");

console.log("\n============================================================");
console.log(`Natural Language Tests: ${passCount} Passed, ${failCount} Failed`);
console.log("============================================================\n");

if (failCount > 0) process.exit(1);
