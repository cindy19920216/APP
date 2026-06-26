import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

export const genai = new GoogleGenAI({ apiKey });

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';

export async function generateText(prompt: string): Promise<string> {
  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });
  return response.text ?? '';
}
