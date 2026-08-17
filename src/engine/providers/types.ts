export interface ProviderCompletionOptions {
  systemInstruction?: string;
  temperature?: number;
  tools?: any[];
}

export interface ProviderResponse {
  text: string;
  modelUsed: string;
  fallbackUsed: boolean;
  providerName: string;
}

export interface ModelProvider {
  name: string;
  isConfigured(): boolean;
  generateResponse(
    contents: any[],
    options?: ProviderCompletionOptions
  ): Promise<ProviderResponse>;
}
