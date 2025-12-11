const prisma = require("../src/models/prismaClient");
const fs = require("fs");
const path = require("path");

/* =======================================================================
   1. STATIC SEED DATA
======================================================================= */

/* -------- NEWS CATEGORIES -------- */
const newsCategories = [
  { name: "general" },
  { name: "forex" },
  { name: "crypto" },
  { name: "merger" },
];



/* -------- SCENARIOS -------- */
const scenarios = [
  {
    title: "Global Trade Tension Shock (2025)",
    description:
      "A major U.S. trade policy announcement triggered a sharp market correction, followed by a partial rebound when the measures were later paused.",
    startDate: new Date("2025-04-02T00:00:00Z"),
    endDate: new Date("2025-04-10T00:00:00Z"),
    startingBalance: 100000.0,
    region: null,
    lat: null,
    lng: null,
    volatility: null,
  },
  {
    title: "European Monetary Shift Period (2022)",
    description:
      "Inflation peaks and central banks begin signalling reversal—Europe sees increased market swings.",
    startDate: new Date("2022-07-01T00:00:00Z"),
    endDate: new Date("2022-12-31T23:59:59Z"),
    startingBalance: 100000.0,
    region: "Europe",
    lat: 50,
    lng: 10,
    volatility: "medium",
  },
  {
    title: "Asia-Pacific Supply Chain Volatility (2023)",
    description:
      "Major disruptions in Asia’s manufacturing and logistics cause strong equity market swings in Asia & Pacific.",
    startDate: new Date("2023-01-15T00:00:00Z"),
    endDate: new Date("2023-05-31T23:59:59Z"),
    startingBalance: 100000.0,
    region: "Asia-Pacific",
    lat: 35,
    lng: 105,
    volatility: "high",
  },
  {
    title: "Global Energy Supply Tightening (2024)",
    description:
      "A supply disruption in the MENA oil sector led to significant volatility in global energy and commodity markets.",
    startDate: new Date("2024-03-01T00:00:00Z"),
    endDate: new Date("2024-06-30T23:59:59Z"),
    startingBalance: 100000.0,
    region: "Middle East-North Africa",
    lat: 25,
    lng: 45,
    volatility: "high",
  },
];

/* =======================================================================
   2. MAIN SEED FUNCTION
======================================================================= */

async function main() {
  console.log("🌱 Starting BlackSealed DB Seed...");

  /* -------- Seed News Categories -------- */
  for (const category of newsCategories) {
    await prisma.newsCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log("✔ News categories seeded");

  /* -------- Seed Investment Guides (Folder: how-tos/) -------- */
  const guideFolder = path.join(__dirname, "how-tos");
  if (fs.existsSync(guideFolder)) {
    const files = fs.readdirSync(guideFolder);

    for (const fileName of files) {
      const filePath = path.join(guideFolder, fileName);
      const guideData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      if (!guideData.content) continue;

      await prisma.investmentGuide.upsert({
        where: { title: guideData.title },
        update: {},
        create: {
          title: guideData.title,
          content: guideData.content,
        },
      });
    }
    console.log("✔ Investment guides seeded");
  } else {
    console.log("⚠ Skipped guides — folder not found");
  }


  /* -------- Seed Scenarios -------- */
  for (const scen of scenarios) {
    await prisma.scenario.upsert({
      where: { title: scen.title },
      update: {},
      create: scen,
    });
  }
  console.log("✔ Scenarios seeded");

  console.log("🌟 All seed data inserted successfully!");
}

/* =======================================================================
   3. RUN SEED
======================================================================= */

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("❌ Seed failed:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
