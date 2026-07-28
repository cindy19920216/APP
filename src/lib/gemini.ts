import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-3.1-flash-lite';

let client: GoogleGenAI | null = null;

export function getGenAI(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export async function generateText(prompt: string): Promise<string> {
  const response = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });
  return response.text ?? '';
}
