import { GoogleGenAI } from '@google/genai';
import { ModelProvider, ProviderCompletionOptions, ProviderResponse } from './types';
import personaData from '../../identity/persona.json';
import { executeWebSearch, fetchWebPage } from '../tools/webTools';

export class GeminiProvider implements ModelProvider {
  public name = 'Gemini';
  private client: GoogleGenAI | null = null;
  private lastApiKey: string | undefined = undefined;

  public isConfigured(): boolean {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
    return Boolean(apiKey && typeof apiKey === 'string' && apiKey.trim() && apiKey !== 'undefined');
  }

  private getClient(): GoogleGenAI | null {
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
        console.error('[GeminiProvider] Client init error:', err);
        return null;
      }
    }
    return this.client;
  }

  public async generateResponse(
    contents: any[],
    options: ProviderCompletionOptions = {}
  ): Promise<ProviderResponse> {
    const ai = this.getClient();
    const systemPrompt = options.systemInstruction || `${personaData.systemPrompt}\n${personaData.boundaries.map(b => `- ${b}`).join('\n')}`;

    if (ai) {
      const preferredModels = ['gemini-3.6-flash'];
      for (const modelName of preferredModels) {
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          attempts++;
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
            const parts = candidate?.content?.parts || [];

            // Handle autonomous function calls requested by model
            const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
            if (functionCalls.length > 0) {
              for (const fc of functionCalls) {
                if (fc.name === 'webSearch' && fc.args?.query) {
                  console.log(`[GeminiProvider] Autonomous function call: webSearch('${fc.args.query}')`);
                  const searchResults = await executeWebSearch(fc.args.query);
                  const toolResponseContent = [
                    ...contents,
                    { role: 'model', parts: [{ functionCall: fc }] },
                    {
                      role: 'user',
                      parts: [
                        {
                          functionResponse: {
                            name: 'webSearch',
                            response: { results: searchResults },
                          },
                        },
                      ],
                    },
                  ];
                  const followUpRes = await ai.models.generateContent({
                    model: modelName,
                    contents: toolResponseContent,
                    config: { systemInstruction: systemPrompt, temperature: options.temperature ?? 0.3 },
                  });
                  const followUpText = followUpRes.text || followUpRes.candidates?.[0]?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('\n') || '';
                  if (followUpText.trim()) {
                    return { text: followUpText.trim(), modelUsed: modelName, fallbackUsed: false, providerName: this.name };
                  }
                } else if (fc.name === 'fetchWebPage' && fc.args?.url) {
                  console.log(`[GeminiProvider] Autonomous function call: fetchWebPage('${fc.args.url}')`);
                  const pageData = await fetchWebPage(fc.args.url);
                  const toolResponseContent = [
                    ...contents,
                    { role: 'model', parts: [{ functionCall: fc }] },
                    {
                      role: 'user',
                      parts: [
                        {
                          functionResponse: {
                            name: 'fetchWebPage',
                            response: pageData,
                          },
                        },
                      ],
                    },
                  ];
                  const followUpRes = await ai.models.generateContent({
                    model: modelName,
                    contents: toolResponseContent,
                    config: { systemInstruction: systemPrompt, temperature: options.temperature ?? 0.3 },
                  });
                  const followUpText = followUpRes.text || followUpRes.candidates?.[0]?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('\n') || '';
                  if (followUpText.trim()) {
                    return { text: followUpText.trim(), modelUsed: modelName, fallbackUsed: false, providerName: this.name };
                  }
                }
              }
            }

            const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n') || '';
            const out = textParts.trim() || res.text || '';
            if (out) {
              return { text: out, modelUsed: modelName, fallbackUsed: false, providerName: this.name };
            }
          } catch (e) {
            const err = e as any;
            const errMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || '';
            const isRateLimit = err?.status === 429 || errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED');

            if (isRateLimit && attempts < maxAttempts) {
              let delayMs = attempts * 3000;
              const retryMatch = errMsg.match(/retry in ([0-9\.]+)s/i) || errMsg.match(/retryDelay"?:\s*"([0-9\.]+)s"/i);
              if (retryMatch && retryMatch[1]) {
                const parsedSec = parseFloat(retryMatch[1]);
                if (!isNaN(parsedSec) && parsedSec > 0) {
                  delayMs = Math.min(Math.ceil(parsedSec * 1000) + 500, 10000);
                }
              }
              console.log(`[GeminiProvider] Quota/Rate limit notice for '${modelName}'. Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`);
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
              if (isRateLimit) {
                console.log(`[GeminiProvider] Temporary API rate limit reached for '${modelName}'. Falling back to deterministic response engine.`);
              } else {
                console.log(`[GeminiProvider] Model '${modelName}' notice (attempt ${attempts}/${maxAttempts}): ${errMsg.slice(0, 120)}`);
              }
              break;
            }
          }
        }
      }
    }

    const lastMsgPart = contents[contents.length - 1]?.parts?.[0]?.text || 'Hello';
    return {
      text: `Greetings. I am ${personaData.name}. I received your message: "${lastMsgPart}". System state is nominal with full identity preservation intact.`,
      modelUsed: 'LocalDeterministic',
      fallbackUsed: true,
      providerName: 'LocalDeterministic',
    };
  }
}
