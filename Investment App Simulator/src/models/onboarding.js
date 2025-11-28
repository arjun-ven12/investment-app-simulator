// models/onboarding.js
const prisma = require("../../prisma/prismaClient");

module.exports.getOnboardingStatus = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingStage: true,
      skipOnboarding: true
    }
  });
};

module.exports.updateStage = async (userId, onboardingStage) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { onboardingStage },
    select: {
      onboardingStage: true,
      skipOnboarding: true
    }
  });
};

module.exports.skipForever = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingStage: "done",
      skipOnboarding: true
    },
    select: {
      onboardingStage: true,
      skipOnboarding: true
    }
  });
};

module.exports.restartOnboarding = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingStage: "home",
      skipOnboarding: false
    },
    select: {
      onboardingStage: true,
      skipOnboarding: true
    }
  });
};
