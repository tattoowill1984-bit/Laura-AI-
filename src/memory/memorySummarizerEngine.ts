import { semanticMemoryQueryEngine, SemanticQueryOptions } from './semanticMemoryQueryEngine';
import { selfStateManager } from '../engine/selfState';
import { persistentStorage } from '../engine/persistentStorage';
import { gabbySubstrate } from '../engine/gabbySubstrate';

export interface KeyExperienceSummary {
  id: string;
  source: string;
  content: string;
  relevanceScore: number;
  similarityScore: number;
  memoryType: 'LONG_TERM_FACT' | 'OBSERVATION_NODE' | 'CHAT_EXPERIENCE';
  timestamp: string;
  matchedKeywords: string[];
}

export interface HypothesisResonanceSummary {
  hypothesisId: string;
  hypothesisTitle: string;
  plausibilityScore: number;
  supportingMemoriesCount: number;
  highestMatchScore: number;
}

export interface MemoryContextSummary {
  summaryText: string;
  keyExperiences: KeyExperienceSummary[];
  hypothesisResonances: HypothesisResonanceSummary[];
  totalMemoriesScanned: number;
  matchCount: number;
  synthesizedAt: string;
  executionTimeMs: number;
}

export class MemorySummarizerEngine {
  /**
   * Generates a contextually relevant memory retrieval summary based on current context and Self-Model active hypotheses.
   */
  public async generateMemorySummary(
    contextText: string,
    profileId?: string,
    options?: Partial<SemanticQueryOptions>
  ): Promise<MemoryContextSummary> {
    const startTime = Date.now();
    const selfState = selfStateManager.getState();
    const activeHypotheses = selfState.active_hypotheses || [];
    const hypothesisTexts = activeHypotheses.map(h => `${h.title} ${h.competingTheory}`);

    // Query Semantic Memory Query Engine
    const queryResult = semanticMemoryQueryEngine.queryMemories(contextText, gabbySubstrate, {
      profileId,
      minSimilarityThreshold: options?.minSimilarityThreshold ?? 0.08,
      topK: options?.topK ?? 8,
      includeObservations: true,
      includeChatHistory: true,
      includeFacts: true,
      activeHypotheses: hypothesisTexts,
    });

    const keyExperiences: KeyExperienceSummary[] = queryResult.matches.map(m => ({
      id: m.id,
      source: m.source,
      content: m.content,
      relevanceScore: m.relevanceScore,
      similarityScore: m.similarityScore,
      memoryType: m.memoryType,
      timestamp: m.timestamp,
      matchedKeywords: m.matchedKeywords,
    }));

    // Calculate Hypothesis Resonances
    const hypothesisResonances: HypothesisResonanceSummary[] = activeHypotheses.map(hyp => {
      const hypTokens = hyp.title.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let matchCount = 0;
      let highestScore = 0;

      for (const m of queryResult.matches) {
        const contentLower = m.content.toLowerCase();
        const matchesToken = hypTokens.some(t => contentLower.includes(t));
        if (matchesToken || (m.hypothesisResonance && m.hypothesisResonance > 0.15)) {
          matchCount++;
          if (m.relevanceScore > highestScore) {
            highestScore = m.relevanceScore;
          }
        }
      }

      return {
        hypothesisId: hyp.id,
        hypothesisTitle: hyp.title,
        plausibilityScore: hyp.plausibilityScore,
        supportingMemoriesCount: matchCount,
        highestMatchScore: Math.round(highestScore * 100) / 100,
      };
    });

    // Synthesize concise summary paragraph
    let summaryText = '';
    if (keyExperiences.length === 0) {
      summaryText = `No high-confidence historical memories matched context '${contextText.slice(0, 40)}...'. Operating under unconditioned baseline self-state.`;
    } else {
      const topFact = keyExperiences.find(k => k.memoryType === 'LONG_TERM_FACT');
      const topObs = keyExperiences.find(k => k.memoryType === 'OBSERVATION_NODE');
      const topChat = keyExperiences.find(k => k.memoryType === 'CHAT_EXPERIENCE');

      const parts: string[] = [];
      if (topFact) {
        parts.push(`Long-term Invariant: "${topFact.content}" (Confidence: ${Math.round(topFact.relevanceScore * 100)}%)`);
      }
      if (topObs) {
        parts.push(`Substrate Observation: "${topObs.content.slice(0, 100)}"`);
      }
      if (topChat) {
        parts.push(`Prior Interaction Experience: "${topChat.content.slice(0, 100)}"`);
      }

      const activeResonantCount = hypothesisResonances.filter(hr => hr.supportingMemoriesCount > 0).length;
      const hypResText = activeResonantCount > 0
        ? ` Memory store resonates with ${activeResonantCount} active hypothesis formulation(s).`
        : '';

      summaryText = `Context Memory Synthesis: ${parts.join(' | ')}.${hypResText}`;
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      summaryText,
      keyExperiences,
      hypothesisResonances,
      totalMemoriesScanned: queryResult.totalEvaluated,
      matchCount: queryResult.matchCount,
      synthesizedAt: new Date().toISOString(),
      executionTimeMs,
    };
  }
}

export const memorySummarizerEngine = new MemorySummarizerEngine();
