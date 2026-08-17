import { ModelProvider, ProviderCompletionOptions, ProviderResponse } from './types';
import personaData from '../../identity/persona.json';

export class ClaudeProvider implements ModelProvider {
  public name = 'Claude';

  public isConfigured(): boolean {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    return Boolean(apiKey && typeof apiKey === 'string' && apiKey.trim() && apiKey !== 'undefined');
  }

  public async generateResponse(
    contents: any[],
    options: ProviderCompletionOptions = {}
  ): Promise<ProviderResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    const systemPrompt = options.systemInstruction || `${personaData.systemPrompt}\n${personaData.boundaries.map(b => `- ${b}`).join('\n')}`;

    if (this.isConfigured() && apiKey) {
      const preferredModels = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'];

      // Convert Gemini/generic contents structure to Anthropic messages API format
      const messages = contents.map((c: any) => {
        const role = c.role === 'model' || c.role === 'assistant' ? 'assistant' : 'user';
        let textContent = '';
        if (Array.isArray(c.parts)) {
          textContent = c.parts.map((p: any) => p.text || '').filter(Boolean).join('\n');
        } else if (typeof c.text === 'string') {
          textContent = c.text;
        }
        return { role, content: textContent || 'Hello' };
      });

      for (const modelName of preferredModels) {
        try {
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey.trim(),
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model: modelName,
              max_tokens: 2048,
              temperature: options.temperature ?? 0.3,
              system: systemPrompt,
              messages,
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            const text = data?.content?.[0]?.text || '';
            if (text.trim()) {
              return {
                text: text.trim(),
                modelUsed: modelName,
                fallbackUsed: false,
                providerName: this.name,
              };
            }
          } else {
            const errData = await resp.text();
            console.warn(`[ClaudeProvider] Call to model '${modelName}' returned HTTP ${resp.status}: ${errData}`);
          }
        } catch (e) {
          console.warn(`[ClaudeProvider] Call to '${modelName}' failed:`, (e as Error).message);
        }
      }
    }

    const lastMsgPart = contents[contents.length - 1]?.parts?.[0]?.text || 'Hello';
    return {
      text: `Greetings. I am ${personaData.name} (via local deterministic engine). I received your query: "${lastMsgPart}". All cognitive invariants intact.`,
      modelUsed: 'LocalDeterministic',
      fallbackUsed: true,
      providerName: 'LocalDeterministic',
    };
  }
}
