/**
 * Layer 1: Perception Gateway & Model Adapter (`provider.ts`)
 * Clean model adapter wrapping GoogleGenAI and local deterministic fallback.
 */

import { getModelProvider, ProviderCompletionOptions } from './providers';

export interface ModelCompletionOptions extends ProviderCompletionOptions {}

export class ModelProviderAdapter {
  public async generateResponse(
    contents: any[],
    options: ModelCompletionOptions = {}
  ): Promise<{ text: string; modelUsed: string; fallbackUsed: boolean; providerName?: string; groundingMetadata?: any }> {
    const provider = getModelProvider();
    return provider.generateResponse(contents, options);
  }
}

export const modelProviderAdapter = new ModelProviderAdapter();

