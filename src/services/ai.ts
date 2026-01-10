import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});

const SYSTEM_PROMPT = `You are a witty tech blogger. Polish the diary into an engaging social media post. Use emojis, first-person perspective, and casual language. Keep it under 280 characters per chunk if possible.`;

const REDNOTE_SUMMARIZE_PROMPT = `You are a professional content editor. Please summarize the following content to approximately 800-900 characters while keeping the core ideas and emotions. Use first-person perspective, engaging language suitable for social media. Important: Keep the content in English, do not translate. Only output the summarized content without any title or additional explanation.`;

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

export async function summarizeForRedNote(content: string): Promise<string> {
  // 如果内容不超过 1000 字，直接返回
  if (content.length <= 1000) {
    return content;
  }

  console.log(`Content is ${content.length} chars, summarizing for RedNote...`);

  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL_NAME || "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: REDNOTE_SUMMARIZE_PROMPT },
      { role: "user", content },
    ],
  });

  const summarized = response.choices[0].message.content || "";
  console.log(`Summarized to ${summarized.length} chars`);

  return summarized;
}
