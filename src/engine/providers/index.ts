import { ModelProvider } from './types';
import { GeminiProvider } from './GeminiProvider';
import { ClaudeProvider } from './ClaudeProvider';

export * from './types';
export * from './GeminiProvider';
export * from './ClaudeProvider';

const gemini = new GeminiProvider();
const claude = new ClaudeProvider();

export function getModelProvider(): ModelProvider {
  const selected = (process.env.LAURA_MODEL_PROVIDER || process.env.MODEL_PROVIDER || 'gemini').toLowerCase().trim();

  if (selected === 'claude' || selected === 'anthropic') {
    if (claude.isConfigured()) {
      return claude;
    }
    console.warn('[ModelProvider] LAURA_MODEL_PROVIDER is set to claude, but ANTHROPIC_API_KEY is not configured. Falling back to GeminiProvider.');
  }

  return gemini;
}
