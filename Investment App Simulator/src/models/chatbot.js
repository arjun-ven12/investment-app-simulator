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
