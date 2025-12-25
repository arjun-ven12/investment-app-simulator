const aiSettingsModel = require("../models/aiSettings");

module.exports.getAISettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await aiSettingsModel.getAISettings(userId);
    return res.status(200).json(settings);

  } catch (err) {
    console.error("getAISettings error:", err);
    return res.status(500).json({ error: "Failed to load AI settings" });
  }
};


module.exports.updateAISettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
  riskTolerance,
  aiTone,
  investmentHorizon,
  objective,
} = req.body;


    if (!riskTolerance || !aiTone || !investmentHorizon || !objective) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const updated = await aiSettingsModel.updateAISettings(
  userId,
  riskTolerance,
  aiTone,
  investmentHorizon,
  objective,
);


    return res.status(200).json({
      message: "AI settings updated",
      settings: updated,
    });

  } catch (err) {
    console.error("updateAISettings error:", err);
    return res.status(500).json({ error: "Failed to update AI settings" });
  }
};

