import OpenAI from "openai";

const openai = new OpenAI({
  
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