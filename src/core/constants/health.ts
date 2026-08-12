/**
 * Single source of truth for health thresholds, enums and the risk engine version.
 * Never scatter these values across UI components.
 */

export const ALGORITHM_VERSION = "hg-rules-1.0.0";

export const THRESHOLDS = {
  sleep: {
    minHealthyHours: 7,
    lowHours: 6,
    veryLowHours: 5,
    declineWindow: 4, // consecutive check-ins considered for decline
    declineDeltaHours: 1, // total decrease across window that counts as a decline
  },
  water: {
    targetGlasses: 8,
    lowGlasses: 4,
  },
  exercise: {
    weeklyTargetMinutes: 150,
    dailyTargetMinutes: 30,
    inactiveDailyMinutes: 10,
    lowActivityWindow: 4,
  },
  weight: {
    increaseWindow: 5,
    increaseKg: 2, // kg gained across window that counts as a pattern
  },
  bloodPressure: {
    elevatedSystolic: 130,
    elevatedDiastolic: 85,
    highSystolic: 140,
    highDiastolic: 90,
  },
  glucoseMgDl: {
    elevatedFasting: 100,
    highFasting: 126,
  },
  checkin: {
    consistencyWindowDays: 7,
    minCheckinsForTrend: 3,
  },
  symptoms: {
    repeatedCountInWindow: 3,
    windowDays: 14,
  },
} as const;

export const RISK_LEVELS = ["low", "moderate", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const FACTOR_LABELS: Record<string, string> = {
  sleep_decline: "Sleep duration has been decreasing",
  short_sleep: "Sleep is regularly below the recommended range",
  low_activity: "Physical activity has been low",
  no_activity: "Little or no logged activity recently",
  low_hydration: "Water intake is below your usual target",
  weight_increase_pattern: "Weight has been trending upward",
  elevated_blood_pressure: "Some blood pressure readings were above the usual range",
  elevated_glucose: "Some glucose readings were above the usual range",
  repeated_symptom: "The same symptom was reported repeatedly",
  low_checkin_consistency: "Check-ins have been irregular",
  abnormal_verified_lab: "A verified lab result was outside its reference range",
  poor_food_quality: "Recent meals were mostly logged as low quality",
};

export const FOOD_QUALITY_OPTIONS = ["poor", "fair", "good", "excellent"] as const;
export const WELLBEING_OPTIONS = ["very_low", "low", "okay", "good", "great"] as const;

export const COMMON_SYMPTOMS = [
  "fatigue",
  "headache",
  "dizziness",
  "joint_pain",
  "fever",
  "cough",
  "shortness_of_breath",
  "nausea",
  "chest_discomfort",
  "poor_sleep",
  "stress",
  "rash",
];

export const SPECIALTIES = [
  "General Physician",
  "Cardiology",
  "Endocrinology",
  "Rheumatology",
  "Dermatology",
  "Pulmonology",
  "Gastroenterology",
  "Neurology",
  "Nutrition & Dietetics",
  "Mental Health",
] as const;

export const NOTIFICATION_TYPES = [
  "daily_checkin",
  "pattern_alert",
  "goal_reminder",
  "follow_up",
  "health_report",
  "general_reminder",
] as const;

export const NOTIFICATION_CATEGORIES = [
  "sleep",
  "water",
  "exercise",
  "food",
  "weight",
  "symptoms",
  "health_report",
  "goal",
  "general",
] as const;

export const GOAL_TYPES = ["exercise", "sleep", "water", "weight", "checkin_consistency", "custom"] as const;

export const USER_INTENTS = [
  "understand_report",
  "analyze_health",
  "daily_guidance",
  "review_trend",
  "set_goal",
  "ask_health_question",
  "specialist_guidance",
  "general_conversation",
] as const;
export type UserIntent = (typeof USER_INTENTS)[number];

export const MEDICAL_DISCLAIMER =
  "HealthGuardian AI supports preventive health awareness only. It does not diagnose conditions, prescribe or change medication, and it does not replace a qualified healthcare professional.";

/** Human labels for the General Health Score bands (wellness indicator, not diagnostic). */
export const SCORE_BANDS: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  needs_attention: "Needs attention",
};
