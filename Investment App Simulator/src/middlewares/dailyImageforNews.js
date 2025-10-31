// ============================================================
// src/cron/dailyFallbackImageRefresh.js — Pexels → DB Updater
// ============================================================
const cron = require("node-cron");
const prisma = require("../../prisma/prismaClient");
const fetch = require("node-fetch");
require("dotenv").config();

const PEXELS_KEY = process.env.PEXELS_API_KEY || process.env.PEXELS_KEY;

// ------------------- CATEGORY MAP -------------------
const queryMap = {
  finance: "stocks, charts, investment graphs, financial data",
  economy: "global business, economy, corporate skyline",
  crypto: "blockchain, cryptocurrency, bitcoin, ethereum",
  technology: "technology, ai, futuristic interface, coding screens",
  business: "boardroom, meeting, startup, office workspace",
};

// ------------------- HELPERS -------------------
async function fetchFromPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) throw new Error(`Pexels error ${res.status}`);
  const data = await res.json();
  return data.photos || [];
}

async function refreshCategory(category, query) {
  console.log(`🔄 [CRON] Refreshing '${category}' fallback images...`);

  try {
    const photos = await fetchFromPexels(query);
    if (!photos.length) return console.warn(`⚠️ No results for ${category}`);

    // Clean up old entries older than 7 days (optional)
    await prisma.fallbackImage.deleteMany({
      where: {
        category,
        createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // Map new data
    const data = photos.map((p) => ({
      category,
      url: p.src?.landscape || p.src?.large2x || p.src?.large,
      alt: p.alt || null,
      photographer: p.photographer || null,
      photographerUrl: p.photographer_url || null,
      avgColor: p.avg_color || null,
    }));

    await prisma.fallbackImage.createMany({ data, skipDuplicates: true });
    console.log(`✅ [${category}] ${data.length} images saved.`);
  } catch (err) {
    console.error(`❌ [${category}] Refresh failed:`, err.message);
  }
}

// ------------------- MAIN CRON -------------------
async function refreshAllCategories() {
  console.log("🧩 [CRON] Starting daily fallback image refresh:", new Date().toISOString());
  for (const [cat, query] of Object.entries(queryMap)) {
    await refreshCategory(cat, query);
  }
  console.log("✅ [CRON] Fallback image refresh complete.");
}

cron.schedule(
  "01 17 * * *", // every day at 3 AM
  async () => {
    await refreshAllCategories();
  },
  { timezone: "Asia/Singapore" }
);

module.exports = { refreshAllCategories };
