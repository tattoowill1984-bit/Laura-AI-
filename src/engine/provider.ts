/**
 * Layer 1: Perception Gateway & Model Adapter (`provider.ts`)
 * Clean model adapter wrapping GoogleGenAI and local deterministic fallback.
 */

import { GoogleGenAI } from '@google/genai';
import personaData from '../identity/persona.json';

export interface ModelCompletionOptions {
  systemInstruction?: string;
  temperature?: number;
  tools?: any[];
}

export class ModelProviderAdapter {
  private client: GoogleGenAI | null = null;
  private lastApiKey: string | undefined = undefined;

  public getClient(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim() || apiKey === 'undefined') {
      return null;
    }
    if (!this.client || this.lastApiKey !== apiKey) {
      try {
        this.lastApiKey = apiKey;
        this.client = new GoogleGenAI({
          apiKey: apiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (err) {
        console.error('[ModelProviderAdapter] Client init error:', err);
        return null;
      }
    }
    return this.client;
  }

  public async generateResponse(
    contents: any[],
    options: ModelCompletionOptions = {}
  ): Promise<{ text: string; modelUsed: string; fallbackUsed: boolean }> {
    const ai = this.getClient();
    const systemPrompt = options.systemInstruction || `${personaData.systemPrompt}\n${personaData.boundaries.map(b => `- ${b}`).join('\n')}`;

    if (ai) {
      const preferredModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      for (const modelName of preferredModels) {
        try {
          const res = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: systemPrompt,
              temperature: options.temperature ?? 0.3,
              tools: options.tools,
            },
          });

          const candidate = res.candidates?.[0];
          const textParts = candidate?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('\n') || '';
          const out = textParts.trim() || res.text || '';
          if (out) {
            return { text: out, modelUsed: modelName, fallbackUsed: false };
          }
        } catch (e) {
          console.warn(`[ModelProviderAdapter] Model '${modelName}' call failed, trying next:`, (e as Error).message);
        }
      }
    }

    // Local deterministic synthesis fallback
    const lastMsgPart = contents[contents.length - 1]?.parts?.[0]?.text || 'Hello';
    return {
      text: `Greetings. I am ${personaData.name}. I received your message: "${lastMsgPart}". System state is nominal with full identity preservation intact.`,
      modelUsed: 'LocalDeterministic',
      fallbackUsed: true,
    };
  }
}

export const modelProviderAdapter = new ModelProviderAdapter();
