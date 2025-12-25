const prisma = require("../../prisma/prismaClient");

async function getAISettings(userId) {
  const settings = await prisma.aISetting.findUnique({
    where: { userId: Number(userId) },
  });

  // Fallback defaults (important)
  return (
  settings || {
    riskTolerance: "moderate",
    aiTone: "professional",
    investmentHorizon: "long",
    objective: "growth"
  }
);

}


async function updateAISettings(
  userId,
  riskTolerance,
  aiTone,
  investmentHorizon,
  objective
)
 {
  return prisma.aISetting.upsert({
  where: { userId: Number(userId) },
  create: {
    userId: Number(userId),
    riskTolerance,
    aiTone,
    investmentHorizon,
    objective
  },
  update: {
    riskTolerance,
    aiTone,
    investmentHorizon,
    objective
  },
});

}

module.exports = {
  getAISettings,
  updateAISettings,
};
