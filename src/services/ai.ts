import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

const SYSTEM_PROMPT = `You are a witty tech blogger. Polish the diary into an engaging social media post. Use emojis, first-person perspective, and casual language. Keep it under 280 characters per chunk if possible.`;

export async function polishContent(rawText: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL_NAME || "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
  });

  return response.choices[0].message.content || "";
}
