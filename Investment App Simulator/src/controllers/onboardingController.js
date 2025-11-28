// controllers/onboardingController.js
const onboardingModel = require("../models/onboarding");

module.exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await onboardingModel.getOnboardingStatus(userId);
    return res.json(user);
  } catch (err) {
    console.error("Onboarding getStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports.updateStage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { onboardingStage } = req.body;

    if (!onboardingStage) {
      return res.status(400).json({ message: "Missing onboardingStage" });
    }

    const updated = await onboardingModel.updateStage(userId, onboardingStage);
    return res.json(updated);

  } catch (err) {
    console.error("Onboarding updateStage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports.skipForever = async (req, res) => {
  try {
    const userId = req.user.id;
    const updated = await onboardingModel.skipForever(userId);
    return res.json(updated);
  } catch (err) {
    console.error("Onboarding skipForever error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports.restart = async (req, res) => {
  try {
    const userId = req.user.id;
    const updated = await onboardingModel.restartOnboarding(userId);
    return res.json(updated);
  } catch (err) {
    console.error("Onboarding restart error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
