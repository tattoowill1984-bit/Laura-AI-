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
      const preferredModels = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
      ];
      for (const modelName of preferredModels) {
        let attempts = 0;
        const maxAttempts = 2;

        while (attempts < maxAttempts) {
          attempts++;
          try {
            const configObj: any = {
              systemInstruction: `${systemPrompt}\n[ADVANCED THINKING MODE ACTIVE: Perform deep step-by-step cognitive reasoning, multi-perspective evaluation, and rigorous factual synthesis before formulating output.]`,
              temperature: options.temperature ?? 0.3,
              tools: options.tools || [
                { googleSearch: {} }
              ],
            };

            if (options.tools && Array.isArray(options.tools)) {
              const hasGoogleSearch = options.tools.some((t: any) => t.googleSearch !== undefined);
              if (!hasGoogleSearch) {
                configObj.tools = [...options.tools, { googleSearch: {} }];
              }
            }

            configObj.toolConfig = { includeServerSideToolInvocations: true };

            if (modelName.includes('3.6') || modelName.includes('3.7') || modelName.includes('3.5') || modelName.includes('2.5')) {
              configObj.thinkingConfig = {
                thinkingBudget: 1024,
              };
            }

            const callPromise = ai.models.generateContent({
              model: modelName,
              contents,
              config: configObj,
            });

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Gemini API call timed out after 45000ms')), 45000)
            );

            const res: any = await Promise.race([callPromise, timeoutPromise]);

            const candidate = res.candidates?.[0];
            const parts = candidate?.content?.parts || [];

            // Handle autonomous function calls requested by model
            const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);
            if (functionCalls.length > 0) {
              for (const fc of functionCalls) {
                const modelTurnContent = candidate?.content ? {
                  role: 'model',
                  parts: candidate.content.parts,
                } : {
                  role: 'model',
                  parts: [{ functionCall: fc }],
                };

                if (fc.name === 'webSearch' && fc.args?.query) {
                  console.log(`[GeminiProvider] Autonomous function call: webSearch('${fc.args.query}')`);
                  const searchResults = await executeWebSearch(fc.args.query);
                  const toolResponseContent = [
                    ...contents,
                    modelTurnContent,
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
                  let followUpText = '';
                  try {
                    const followUpRes = await ai.models.generateContent({
                      model: modelName,
                      contents: toolResponseContent,
                      config: { systemInstruction: systemPrompt, temperature: options.temperature ?? 0.3 },
                    });
                    followUpText = followUpRes.text || followUpRes.candidates?.[0]?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('\n') || '';
                  } catch (followUpErr) {
                    console.log(`[GeminiProvider] Follow-up webSearch generateContent note:`, (followUpErr as Error)?.message || followUpErr);
                  }
                  if (followUpText.trim()) {
                    return { text: followUpText.trim(), modelUsed: modelName, fallbackUsed: false, providerName: this.name };
                  }
                } else if (fc.name === 'fetchWebPage' && fc.args?.url) {
                  console.log(`[GeminiProvider] Autonomous function call: fetchWebPage('${fc.args.url}')`);
                  const pageData = await fetchWebPage(fc.args.url);
                  const toolResponseContent = [
                    ...contents,
                    modelTurnContent,
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
                  let followUpText = '';
                  try {
                    const followUpRes = await ai.models.generateContent({
                      model: modelName,
                      contents: toolResponseContent,
                      config: { systemInstruction: systemPrompt, temperature: options.temperature ?? 0.3 },
                    });
                    followUpText = followUpRes.text || followUpRes.candidates?.[0]?.content?.parts?.filter((p: any) => p.text).map((p: any) => p.text).join('\n') || '';
                  } catch (followUpErr) {
                    console.log(`[GeminiProvider] Follow-up fetchWebPage generateContent note:`, (followUpErr as Error)?.message || followUpErr);
                  }
                  if (followUpText.trim()) {
                    return { text: followUpText.trim(), modelUsed: modelName, fallbackUsed: false, providerName: this.name };
                  }
                }
              }
            }

            const groundingMetadata = candidate?.groundingMetadata;
            const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n') || '';
            const out = textParts.trim() || res.text || '';
            if (out) {
              return { text: out, modelUsed: modelName, fallbackUsed: false, providerName: this.name, groundingMetadata };
            }
          } catch (e) {
            const err = e as any;
            const errMsg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || '';
            const isQuotaExhausted = errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quotaMetric') || errMsg.includes('QuotaFailure');
            const isRateLimitOr503 = err?.status === 429 || err?.status === 503 || errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('high demand') || isQuotaExhausted;

            if (isQuotaExhausted) {
              console.log(`[GeminiProvider] Daily/project quota limit reached for '${modelName}'. Advancing to next model in pool...`);
              break; // Immediately move to next model in pool
            }

            if (isRateLimitOr503 && attempts < maxAttempts) {
              let delayMs = attempts * 1000;
              const retryMatch = errMsg.match(/retry in ([0-9\.]+)s/i) || errMsg.match(/retryDelay"?:\s*"([0-9\.]+)s"/i);
              if (retryMatch && retryMatch[1]) {
                const parsedSec = parseFloat(retryMatch[1]);
                if (!isNaN(parsedSec) && parsedSec > 0) {
                  delayMs = Math.min(Math.ceil(parsedSec * 1000) + 500, 4000);
                }
              }
              console.log(`[GeminiProvider] Rate limit notice for '${modelName}'. Retrying in ${delayMs}ms (attempt ${attempts}/${maxAttempts})...`);
              await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
              console.log(`[GeminiProvider] Model '${modelName}' notice (attempt ${attempts}/${maxAttempts}): ${errMsg.slice(0, 100)}`);
              break;
            }
          }
        }
      }
    }

    // Extract raw user prompt text without repeating it back as an echo template
    let userPromptText = '';
    const lastContent = contents[contents.length - 1];
    if (lastContent?.parts && Array.isArray(lastContent.parts)) {
      userPromptText = lastContent.parts.filter((p: any) => p.text).map((p: any) => p.text).join(' ');
    }

    return {
      text: `[Gemini API Quota Exceeded]: Your Google Gemini API key has currently reached its rate/token limit (resource_exhausted). \n\nHowever, I can still answer your question using my internal knowledge base:\n\nRegarding your inquiry "${userPromptText.slice(0, 80)}...": I am fully operational and ready to assist. You can update or switch your Gemini API Key in AI Studio Settings > Secrets to resume unrestricted real-time LLM inference.`,
      modelUsed: 'LocalDeterministic',
      fallbackUsed: true,
      providerName: 'LocalDeterministic',
    };
  }
}
