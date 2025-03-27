const openAIModel = require("../models/chatbot");

// Generate AI Response
module.exports.generateResponse = async (req, res) => {
  const { prompt, model, max_tokens } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    // Call the model function to generate the response
    const aiResponse = await openAIModel.generateResponse(prompt, model, max_tokens);
    res.status(200).json({ response: aiResponse });
  } catch (error) {
    console.error("Error generating response:", error);
    res.status(500).json({ error: "Failed to generate AI response." });
  }
};