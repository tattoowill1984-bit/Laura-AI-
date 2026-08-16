import { GoogleGenAI } from '@google/genai';

export interface ModelRejectionEntry {
  model: string;
  timestamp: string;
  status?: number | string;
  reason: string;
}

export interface ModelHealthStatus {
  model: string;
  status: 'HEALTHY' | 'REJECTED' | 'UNTESTED';
  lastChecked: string;
  lastSuccess?: string;
  lastError?: string;
  rejectionReason?: string;
}

export interface ToolExecutionMetadata {
  toolName: string;
  status: string; // 'TOOL_RETURNED_RESULT' | 'TOOL_UNAVAILABLE' | 'TOOL_FAILED'
  obsHash?: string;
  resultCount?: number;
  failureReason?: string;
}

export interface ExecutionMetadata {
  provider: 'Gemini' | 'LocalDeterministic';
  model: string;
  execution: 'LLM' | 'NON_LLM';
  fallback: boolean;
  reason?: string | null;
  rejectionLog?: ModelRejectionEntry[];
  toolExecution?: ToolExecutionMetadata;
  triangulation?: {
    secondaryModel: string;
    divergenceScore: number;
    status: string;
  };
}

export class ModelProviderRegistry {
  private static instance: ModelProviderRegistry;
  private modelHealthCache: Map<string, ModelHealthStatus> = new Map();
  private cacheTTLMs = 5 * 60 * 1000; // 5 minute cache for healthy models

  // Default candidate model pool ordered by preference & current platform support
  private candidateModelPool: string[] = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
  ];

  private constructor() {}

  public static getInstance(): ModelProviderRegistry {
    if (!ModelProviderRegistry.instance) {
      ModelProviderRegistry.instance = new ModelProviderRegistry();
    }
    return ModelProviderRegistry.instance;
  }

  /**
   * Discovers available Gemini models from the API if list() is supported
   */
  public async discoverAvailableModels(ai: GoogleGenAI): Promise<string[]> {
    const discovered: string[] = [];
    try {
      const list = await ai.models.list();
      if (list) {
        for await (const m of list) {
          if (m?.name) {
            // Strip 'models/' prefix for standard generation calls
            const cleanName = m.name.replace(/^models\//, '');
            const lowerName = cleanName.toLowerCase();
            if (
              lowerName.includes('gemini') &&
              !lowerName.includes('embedding') &&
              !lowerName.includes('imagen') &&
              !lowerName.includes('veo') &&
              !lowerName.includes('tts') &&
              !lowerName.includes('2.5') &&
              !lowerName.includes('1.5') &&
              !lowerName.includes('video') &&
              !lowerName.includes('preview') &&
              !lowerName.includes('latest') &&
              !lowerName.includes('customtools') &&
              !lowerName.includes('image')
            ) {
              discovered.push(cleanName);
            }
          }
        }
      }
    } catch (err: any) {
      // Model discovery list() is optional
    }

    if (discovered.length > 0) {
      // Retain preferred candidate models first, then append extra discovered models
      const merged = Array.from(new Set([...this.candidateModelPool, ...discovered]));
      this.candidateModelPool = merged;
    }
    return this.candidateModelPool;
  }

  /**
   * Gets current model health status audit
   */
  public getModelHealthReport(): ModelHealthStatus[] {
    return Array.from(this.modelHealthCache.values());
  }

  /**
   * Record a model rejection with timestamp and error details
   */
  public recordModelRejection(model: string, reason: string, status?: number | string): ModelRejectionEntry {
    const entry: ModelRejectionEntry = {
      model,
      timestamp: new Date().toISOString(),
      status,
      reason,
    };

    this.modelHealthCache.set(model, {
      model,
      status: 'REJECTED',
      lastChecked: entry.timestamp,
      lastError: reason,
      rejectionReason: `${status ? `[Status ${status}] ` : ''}${reason}`,
    });

    return entry;
  }

  /**
   * Record a model success
   */
  public recordModelSuccess(model: string): void {
    const now = new Date().toISOString();
    this.modelHealthCache.set(model, {
      model,
      status: 'HEALTHY',
      lastChecked: now,
      lastSuccess: now,
    });
  }

  /**
   * Attempts execution across candidate models using strict config shape
   */
  public async executeWithResilientModel<T>(
    ai: GoogleGenAI,
    contents: any[],
    config: {
      systemInstruction?: string;
      temperature?: number;
      tools?: any[];
    },
    preferredModel?: string
  ): Promise<{
    response: any;
    resolvedModel: string;
    rejectionLog: ModelRejectionEntry[];
  }> {
    const rejectionLog: ModelRejectionEntry[] = [];
    
    // First try model discovery to populate fresh candidates if available
    await this.discoverAvailableModels(ai);

    // Build ordered list of models to try
    const modelsToTry: string[] = [];
    if (preferredModel && !modelsToTry.includes(preferredModel)) {
      modelsToTry.push(preferredModel);
    }
    
    // Append pool models
    for (const m of this.candidateModelPool) {
      if (!modelsToTry.includes(m)) {
        modelsToTry.push(m);
      }
    }

    let lastError: any = null;

    for (const model of modelsToTry) {
      // Skip recently rejected models if we have other healthy choices, unless all have failed
      const health = this.modelHealthCache.get(model);
      const isRecentlyRejected = health?.status === 'REJECTED' && 
        (Date.now() - new Date(health.lastChecked).getTime() < 30000); // 30 sec quarantine for rejected models

      if (isRecentlyRejected && modelsToTry.length > 1) {
        rejectionLog.push({
          model,
          timestamp: new Date().toISOString(),
          reason: `Skipped due to recent failure: ${health.rejectionReason}`,
        });
        continue;
      }

      try {
        // PERMANENT REQUEST SHAPE: No top-level tools. Everything inside config.
        const reqConfig: any = {
          temperature: config.temperature ?? 0.2,
        };
        if (config.systemInstruction) {
          reqConfig.systemInstruction = config.systemInstruction;
        }
        if (config.tools && config.tools.length > 0) {
          reqConfig.tools = config.tools;
        }

        let res: any;
        try {
          res = await ai.models.generateContent({
            model,
            contents,
            config: reqConfig,
          });
        } catch (toolErr) {
          // If execution with tools failed (e.g. googleSearch parameter issue), retry without tools
          if (reqConfig.tools) {
            const noToolsConfig = { ...reqConfig };
            delete noToolsConfig.tools;
            res = await ai.models.generateContent({
              model,
              contents,
              config: noToolsConfig,
            });
          } else {
            throw toolErr;
          }
        }

        if (res && res.text) {
          this.recordModelSuccess(model);
          return {
            response: res,
            resolvedModel: model,
            rejectionLog,
          };
        } else {
          const reason = 'Model returned empty text response';
          const entry = this.recordModelRejection(model, reason);
          rejectionLog.push(entry);
        }
      } catch (err: any) {
        lastError = err;
        const errStatus = err?.status || err?.code || (err?.message?.includes('404') ? 404 : err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED') ? 429 : 'UNKNOWN');
        const shortReason = errStatus === 429 ? 'Rate limit / Quota reached' : errStatus === 404 ? 'Model endpoint unavailable' : (err?.message || 'Execution error').slice(0, 80);
        const entry = this.recordModelRejection(model, shortReason, errStatus);
        rejectionLog.push(entry);
      }
    }

    throw new Error(
      `Candidate Gemini models unavailable. Active fallbacks engaged.`
    );
  }

  /**
   * BRIDGE 2: Independent Multi-Model Triangulation
   * Executes multi-perspective consultation across distinct candidate models to calculate
   * agreement, divergence, and epistemic alignment without relying on single-model mono-cultures.
   */
  public async triangulateMultiModelPerspective(
    ai: GoogleGenAI,
    contents: any[],
    config: {
      systemInstruction?: string;
      temperature?: number;
      tools?: any[];
    }
  ): Promise<{
    primaryResponse: any;
    primaryModel: string;
    secondaryPerspective?: {
      model: string;
      responseText: string;
      divergenceScore: number;
    };
    triangulationStatus: 'MULTI_MODEL_TRIANGULATED' | 'SINGLE_MODEL_FALLBACK';
  }> {
    // 1. Primary execution
    const primaryResult = await this.executeWithResilientModel(ai, contents, config);
    const primaryText = primaryResult.response?.text || '';

    // 2. Secondary candidate model selection
    const candidatePool = this.candidateModelPool.filter((m) => m !== primaryResult.resolvedModel);
    let secondaryPerspective: { model: string; responseText: string; divergenceScore: number } | undefined;

    if (candidatePool.length > 0 && primaryText) {
      const secondaryModel = candidatePool[0];
      try {
        const secReqConfig: any = {
          temperature: (config.temperature ?? 0.2) + 0.1,
        };
        if (config.systemInstruction) {
          secReqConfig.systemInstruction = config.systemInstruction;
        }

        const secRes = await ai.models.generateContent({
          model: secondaryModel,
          contents,
          config: secReqConfig,
        });

        const secText = secRes?.text || '';
        if (secText) {
          // Calculate divergence score based on text word overlap ratio
          const primaryWords = new Set(primaryText.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
          const secondaryWords = new Set(secText.toLowerCase().split(/\s+/).filter((w) => w.length > 3));
          
          let overlap = 0;
          for (const w of secondaryWords) {
            if (primaryWords.has(w)) overlap++;
          }

          const unionSize = new Set([...primaryWords, ...secondaryWords]).size || 1;
          const jaccardSimilarity = overlap / unionSize;
          const divergenceScore = Math.round((1 - jaccardSimilarity) * 100);

          secondaryPerspective = {
            model: secondaryModel,
            responseText: secText,
            divergenceScore,
          };
          this.recordModelSuccess(secondaryModel);
        }
      } catch (err: any) {
        // Secondary model triangulation is additive; failure gracefully falls back to single-model primary
      }
    }

    return {
      primaryResponse: primaryResult.response,
      primaryModel: primaryResult.resolvedModel,
      secondaryPerspective,
      triangulationStatus: secondaryPerspective ? 'MULTI_MODEL_TRIANGULATED' : 'SINGLE_MODEL_FALLBACK',
    };
  }
}

export const modelProviderRegistry = ModelProviderRegistry.getInstance();
