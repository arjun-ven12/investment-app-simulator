const openAIModel = require("../models/chatbot");

//////////////////////////////////////////////////////
// GENERATE AI RESPONSE
//////////////////////////////////////////////////////
module.exports.generateResponse = async (req, res) => {
  // Destructure from request, but allow defaults
  const {
    prompt,
    model = "gpt-4o-mini",   // ✅ cheapest good option for chat
    max_tokens = 200          // ✅ safe token cap
  } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    // Call the model function to generate the response
    const aiResponse = await openAIModel.generateResponse(prompt, model, max_tokens);
    res.status(200).json({ response: aiResponse, model, max_tokens });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
};