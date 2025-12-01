const prisma = require("../../prisma/prismaClient");

// -----------------------------------------------------------
// MAIN Onboarding
// -----------------------------------------------------------
module.exports.getOnboardingStatus = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingStage: true,
      skipOnboarding: true,

      // include scenario onboarding state
      scenarioConsoleStage: true,
      skipScenarioConsole: true
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

// -----------------------------------------------------------
// Scenario Console Onboarding
// -----------------------------------------------------------
module.exports.updateScenarioConsoleStage = async (userId, scenarioConsoleStage) => {
  return await prisma.user.update({
    where: { id: userId },
    data: { scenarioConsoleStage },
    select: {
      scenarioConsoleStage: true,
      skipScenarioConsole: true
    }
  });
};

module.exports.skipScenarioConsole = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      scenarioConsoleStage: "done",
      skipScenarioConsole: true
    },
    select: {
      scenarioConsoleStage: true,
      skipScenarioConsole: true
    }
  });
};

module.exports.restartScenarioConsole = async (userId) => {
  return await prisma.user.update({
    where: { id: userId },
    data: {
      scenarioConsoleStage: "not_started",
      skipScenarioConsole: false
    },
    select: {
      scenarioConsoleStage: true,
      skipScenarioConsole: true
    }
  });
};
