import { ModelProvider } from './types';
import { GeminiProvider } from './GeminiProvider';

export * from './types';
export * from './GeminiProvider';

const gemini = new GeminiProvider();

export function getModelProvider(): ModelProvider {
  return gemini;
}
