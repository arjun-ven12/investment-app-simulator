// src/cron/dailyAIAdvice.js
const cron = require("node-cron");
const prisma = require("../../prisma/prismaClient");
const chatbotController = require("../controllers/chatbotController");
// const optionsController = require("../controllers/optionsController"); // not needed here
const pLimit = require("p-limit");            // ✅ use require in CommonJS
const limit = pLimit(5);                      // run 5 users at once

async function runForUser(userId) {
  console.log(`🧩 Generating daily advice for user ${userId}`);

  // --- A) Portfolio AI Advice ---
  try {
    const reqPortfolio = { params: { userId }, query: { riskProfile: "moderate" } };
    const resPortfolio = { status: () => ({ json: (data) => data }) };
    const portfolioAdvice = await chatbotController.getPortfolioAdvice(reqPortfolio, resPortfolio);

    if (portfolioAdvice?.advice) {
      await prisma.aIAdvice.create({
        data: {
          userId,
          category: "stocks",       // ✅ your schema says category is String
          advice: portfolioAdvice.advice,
          createdAt: new Date(),
        },
      });
      console.log(`✅ Stocks advice saved for user ${userId}`);
    } else {
      console.log(`ℹ️ No stocks advice generated for user ${userId}`);
    }
  } catch (err) {
    console.error(`⚠️ Failed stocks advice for user ${userId}:`, err.message);
  }

  // --- B) Options AI Advice ---
  try {
    const reqOptions = { user: { id: userId } };
    const resOptions = { status: () => ({ json: (data) => data }) };
    const optionAdvice = await chatbotController.getUserOptionAdvice(reqOptions, resOptions);

    if (optionAdvice?.aiAdvice) {
      await prisma.aIAdvice.create({
        data: {
          userId,
          category: "options",
          advice: optionAdvice.aiAdvice,
          createdAt: new Date(),
        },
      });
      console.log(`✅ Options advice saved for user ${userId}`);
    } else {
      console.log(`ℹ️ No options advice generated for user ${userId}`);
    }
  } catch (err) {
    console.error(`⚠️ Failed options advice for user ${userId}:`, err.message);
  }
}

async function generateDailyAdvice() {
  console.log("🧠 [CRON] Running daily AI advice generation:", new Date().toISOString());

  try {
    // 1️⃣ Fetch all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    // 2️⃣ Run with controlled parallelism
    const tasks = users.map((u) => limit(() => runForUser(u.id)));
    const results = await Promise.allSettled(tasks);

    const ok = results.filter(r => r.status === "fulfilled").length;
    const fail = results.length - ok;
    console.log(`🎉 Daily advice done. Success: ${ok}, Failed: ${fail}`);
  } catch (err) {
    console.error("❌ [CRON] Daily AI advice error:", err);
  }
}

cron.schedule(
  "0 9,21 * * *",
  async () => {
    await generateDailyAdvice();
  },
  { timezone: "Asia/Singapore" }
);


module.exports = { generateDailyAdvice };
