/**
 * Phase 9 Web Search Service for HealthGuardian AI.
 * Performs privacy-aware, bounded public health queries with source extraction.
 */

// Reputable curated health sources database for instant trusted guidelines fallback
const CURATED_HEALTH_KNOWLEDGE = [
  {
    keywords: ["physical activity", "exercise", "workout", "active", "step", "cardio"],
    results: [
      {
        title: "WHO Guidelines on Physical Activity and Sedentary Behaviour",
        url: "https://www.who.int/publications/i/item/9789240015128",
        domain: "who.int",
        snippet: "Adults should do at least 150–300 minutes of moderate-intensity aerobic physical activity, or at least 75–150 minutes of vigorous-intensity aerobic physical activity per week.",
        publishedAt: "2020",
      },
      {
        title: "CDC: How Much Physical Activity Do Adults Need?",
        url: "https://www.cdc.gov/physicalactivity/basics/adults/index.htm",
        domain: "cdc.gov",
        snippet: "Each week adults need 150 minutes of moderate-intensity physical activity and 2 days of muscle-strengthening activity.",
        publishedAt: "2023",
      },
      {
        title: "AHA Recommendations for Physical Activity in Adults",
        url: "https://www.heart.org/en/healthy-living/fitness/fitness-basics/aha-recs-for-physical-activity-in-adults",
        domain: "heart.org",
        snippet: "Get at least 150 minutes per week of moderate-intensity aerobic activity or 75 minutes per week of vigorous aerobic activity, or a combination.",
        publishedAt: "2024",
      },
    ],
  },
  {
    keywords: ["sleep", "insomnia", "bedtime", "rest", "circadian", "sleep hygiene"],
    results: [
      {
        title: "CDC: How Much Sleep Do I Need?",
        url: "https://www.cdc.gov/sleep/about_sleep/how_much_sleep.html",
        domain: "cdc.gov",
        snippet: "Adults aged 18–60 years need 7 or more hours of sleep per night for optimal health and wellbeing.",
        publishedAt: "2022",
      },
      {
        title: "National Sleep Foundation: Sleep Guidelines & Sleep Hygiene",
        url: "https://www.sleepfoundation.org/how-sleep-works/how-much-sleep-do-we-really-need",
        domain: "sleepfoundation.org",
        snippet: "Healthy adults need between 7 and 9 hours of sleep per night. Consistent sleep schedules and dark, quiet environments improve restorative sleep.",
        publishedAt: "2024",
      },
    ],
  },
  {
    keywords: ["water", "hydration", "drink", "fluid", "dehydration"],
    results: [
      {
        title: "Harvard T.H. Chan School of Public Health: The Importance of Hydration",
        url: "https://www.hsph.harvard.edu/nutritionsource/water/",
        domain: "hsph.harvard.edu",
        snippet: "Daily water intake recommendations range from 2.7 to 3.7 liters per day from all beverages and foods for healthy adults depending on climate and activity.",
        publishedAt: "2023",
      },
      {
        title: "Mayo Clinic: Water - How much should you drink every day?",
        url: "https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/in-depth/water/art-20044256",
        domain: "mayoclinic.org",
        snippet: "General guidelines suggest about 15.5 cups (3.7 liters) of fluids a day for men and about 11.5 cups (2.7 liters) of fluids a day for women.",
        publishedAt: "2023",
      },
    ],
  },
  {
    keywords: ["blood pressure", "hypertension", "systolic", "diastolic", "bp"],
    results: [
      {
        title: "AHA/ACC High Blood Pressure Guidelines",
        url: "https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings",
        domain: "heart.org",
        snippet: "Normal blood pressure is defined as systolic less than 120 mm Hg and diastolic less than 80 mm Hg. Elevated blood pressure is 120-129 / <80 mm Hg.",
        publishedAt: "2023",
      },
      {
        title: "CDC: High Blood Pressure Symptoms and Causes",
        url: "https://www.cdc.gov/bloodpressure/about.htm",
        domain: "cdc.gov",
        snippet: "Hypertension is often called the silent killer because it usually has no warning signs or symptoms. Regular measurement is critical.",
        publishedAt: "2024",
      },
    ],
  },
  {
    keywords: ["glucose", "sugar", "diabetes", "hba1c", "glycemic"],
    results: [
      {
        title: "American Diabetes Association (ADA) Standards of Care",
        url: "https://diabetes.org/about-diabetes/diagnosis",
        domain: "diabetes.org",
        snippet: "Fasting plasma glucose < 100 mg/dL is normal. 100–125 mg/dL indicates prediabetes, and 126 mg/dL or higher on two separate tests indicates diabetes.",
        publishedAt: "2024",
      },
      {
        title: "CDC: Diabetes Symptoms and Screening Guidelines",
        url: "https://www.cdc.gov/diabetes/basics/symptoms.html",
        domain: "cdc.gov",
        snippet: "Common signs include frequent urination, excessive thirst, unexplained weight loss, and fatigue. Consult a physician for formal lab screening.",
        publishedAt: "2023",
      },
    ],
  },
];

/**
 * Sanitizes user query to remove sensitive identifiable or personalized medical details.
 */
export function sanitizeSearchQuery(query) {
  if (typeof query !== "string") return "general public health guidelines";
  return query
    .replace(/\b(my|i|me|mine|user|patient)\b/gi, "")
    .replace(/\b\d+(\.\d+)?\s*(mg\/dl|mmhg|kg|lbs|bpm)\b/gi, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150) || "health guidelines";
}

/**
 * Executes a live web search with privacy sanitization and curated medical fallbacks.
 */
export async function executeWebSearch(rawQuery) {
  const query = sanitizeSearchQuery(rawQuery);
  const lower = query.toLowerCase();

  // 1. Try DuckDuckGo Instant Answer API for live summary
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const res = await fetch(ddgUrl, { signal: controller.signal, headers: { "User-Agent": "HealthGuardian-AI/1.0" } });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const liveResults = [];

      if (data.AbstractText && data.AbstractURL) {
        liveResults.push({
          title: data.Heading || data.AbstractSource || "Web Reference",
          url: data.AbstractURL,
          domain: new URL(data.AbstractURL).hostname.replace(/^www\./, ""),
          snippet: data.AbstractText.slice(0, 300),
          publishedAt: "Current",
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (topic.Text && topic.FirstURL && liveResults.length < 4) {
            try {
              liveResults.push({
                title: topic.Text.split(" - ")[0] || "Health Resource",
                url: topic.FirstURL,
                domain: new URL(topic.FirstURL).hostname.replace(/^www\./, ""),
                snippet: topic.Text.slice(0, 250),
                publishedAt: "Current",
              });
            } catch {
              // ignore invalid url
            }
          }
        }
      }

      if (liveResults.length > 0) {
        return {
          ok: true,
          query,
          results: liveResults,
          source: "live_search",
        };
      }
    }
  } catch {
    // Network / timeout -> fallback to trusted medical knowledge base
  }

  // 2. Fallback to Curated Trusted Guidelines Database
  for (const item of CURATED_HEALTH_KNOWLEDGE) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return {
        ok: true,
        query,
        results: item.results,
        source: "curated_guidelines",
      };
    }
  }

  // Default generic public health sources
  return {
    ok: true,
    query,
    results: [
      {
        title: "World Health Organization (WHO) Health Topics",
        url: "https://www.who.int/health-topics",
        domain: "who.int",
        snippet: "Global public health guidance, preventive care standards, and evidence-based clinical recommendations from the WHO.",
        publishedAt: "2024",
      },
      {
        title: "Centers for Disease Control and Prevention (CDC)",
        url: "https://www.cdc.gov",
        domain: "cdc.gov",
        snippet: "Public health guidelines, disease prevention strategies, and healthy living recommendations.",
        publishedAt: "2024",
      },
    ],
    source: "default_guidelines",
  };
}
