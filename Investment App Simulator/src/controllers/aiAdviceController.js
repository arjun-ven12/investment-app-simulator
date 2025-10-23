const aiAdviceModel = require("../models/aiAdvice");

module.exports = {
  async getAdvice(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      const category = req.query.category || "stocks";
      if (isNaN(userId)) return res.status(400).json({ success: false, message: "Invalid userId" });

      const advice = await aiAdviceModel.getLatestAdvice(userId, category);
      res.json({ success: true, category, advice });
    } catch (err) {
      console.error("❌ Error in getAdvice:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },

  async getAllAdvice(req, res) {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) return res.status(400).json({ success: false, message: "Invalid userId" });

      const advice = await aiAdviceModel.getAllAdvice(userId);
      res.json({ success: true, advice });
    } catch (err) {
      console.error("❌ Error in getAllAdvice:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
};
