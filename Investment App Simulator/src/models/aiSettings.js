const prisma = require("../../prisma/prismaClient");

async function getAISettings(userId) {
  const settings = await prisma.aISetting.findUnique({
    where: { userId: Number(userId) },
  });

  return (
    settings || {
      riskTolerance: "moderate",
      aiTone: "professional",
    }
  );
}

async function updateAISettings(userId, riskTolerance, aiTone) {
  return prisma.aISetting.upsert({
    where: { userId: Number(userId) },
    create: {
      userId: Number(userId),
      riskTolerance,
      aiTone,
    },
    update: {
      riskTolerance,
      aiTone,
    },
  });
}

module.exports = {
  getAISettings,
  updateAISettings,
};
