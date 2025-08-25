import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
});

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