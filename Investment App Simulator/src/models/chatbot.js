import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
});

//////////////////////////////////////////////////////
// GENERATE AI RESPONSE
//////////////////////////////////////////////////////
export const generateResponse = async (prompt, model = "gpt-4o-mini", max_tokens = 150) => {
  try {
    const completion = await openai.chat.completions.create({
      model,
      store: true,
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    throw new Error("Error generating AI response: " + error.message);
  }
};