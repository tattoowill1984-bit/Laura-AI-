import { persistentStorage, LongTermMemoryItem, StoredChatMessage } from '../engine/persistentStorage';
import { GabbyCognitiveSubstrate } from '../engine/gabbySubstrate';

export interface SemanticQueryOptions {
  profileId?: string;
  minSimilarityThreshold?: number; // default: 0.12
  topK?: number; // default: 10
  includeObservations?: boolean;
  includeChatHistory?: boolean;
  includeFacts?: boolean;
  activeHypotheses?: string[]; // current active hypotheses or context thoughts
}

export interface SemanticMemoryMatch {
  id: string;
  content: string;
  category: string;
  source: string;
  confidence: number;
  similarityScore: number; // 0.0 - 1.0 Cosine Vector Similarity
  relevanceScore: number;  // Combined score (similarity, confidence, recency)
  matchedKeywords: string[];
  memoryType: 'LONG_TERM_FACT' | 'OBSERVATION_NODE' | 'CHAT_EXPERIENCE';
  timestamp: string;
  hypothesisResonance?: number; // Similarity match score against active hypotheses
}

export interface SemanticQueryResult {
  query: string;
  activeHypotheses: string[];
  totalEvaluated: number;
  matchCount: number;
  matches: SemanticMemoryMatch[];
  continuityOfThoughtContext: string;
  executionTimeMs: number;
}

// Stop words list for natural language normalization
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cant', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d',
  'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll',
  'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
  'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d',
  'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

export class SemanticMemoryQueryEngine {
  /**
   * Tokenize and normalize text into terms and n-grams
   */
  private static extractTerms(text: string): { terms: string[]; termFreqs: Map<string, number> } {
    const rawTokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

    const termFreqs = new Map<string, number>();

    // Unigrams
    for (const token of rawTokens) {
      termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
    }

    // Bigrams for context continuity
    for (let i = 0; i < rawTokens.length - 1; i++) {
      const bigram = `${rawTokens[i]}_${rawTokens[i + 1]}`;
      termFreqs.set(bigram, (termFreqs.get(bigram) || 0) + 1.5);
    }

    return { terms: Array.from(termFreqs.keys()), termFreqs };
  }

  /**
   * Compute TF-IDF Cosine Similarity between query vector and target vector
   */
  private static computeCosineSimilarity(
    queryFreqs: Map<string, number>,
    targetFreqs: Map<string, number>
  ): { score: number; matchedKeywords: string[] } {
    let dotProduct = 0;
    let queryNorm = 0;
    let targetNorm = 0;
    const matchedKeywords: string[] = [];

    queryFreqs.forEach((qVal, term) => {
      queryNorm += qVal * qVal;
      if (targetFreqs.has(term)) {
        const tVal = targetFreqs.get(term)!;
        dotProduct += qVal * tVal;
        if (!term.includes('_')) {
          matchedKeywords.push(term);
        }
      }
    });

    targetFreqs.forEach((tVal) => {
      targetNorm += tVal * tVal;
    });

    if (queryNorm === 0 || targetNorm === 0) {
      return { score: 0, matchedKeywords: [] };
    }

    const score = dotProduct / (Math.sqrt(queryNorm) * Math.sqrt(targetNorm));
    return { score: Math.min(1.0, Math.max(0.0, score)), matchedKeywords };
  }

  /**
   * Primary entry point for semantic memory retrieval
   */
  public queryMemories(
    queryInput: string,
    gabbySubstrate?: GabbyCognitiveSubstrate,
    options: SemanticQueryOptions = {}
  ): SemanticQueryResult {
    const startTime = Date.now();
    const profileId = options.profileId || 'will-owner';
    const minThreshold = options.minSimilarityThreshold ?? 0.12;
    const topK = options.topK ?? 10;
    const activeHypotheses = options.activeHypotheses || [];

    const includeFacts = options.includeFacts !== false;
    const includeChat = options.includeChatHistory !== false;
    const includeObs = options.includeObservations !== false;

    // Combine input query and active hypotheses into primary query vector
    const fullQueryContext = [queryInput, ...activeHypotheses].join(' ');
    const { termFreqs: queryFreqs } = SemanticMemoryQueryEngine.extractTerms(fullQueryContext);

    // Extract hypothesis vector specifically for hypothesis resonance ranking
    const hypothesisContext = activeHypotheses.join(' ');
    const { termFreqs: hypothesisFreqs } = SemanticMemoryQueryEngine.extractTerms(hypothesisContext);

    const candidates: SemanticMemoryMatch[] = [];
    let totalEvaluated = 0;

    // 1. Long-Term Facts from Persistent Storage
    if (includeFacts) {
      const facts = persistentStorage.getActiveMemoriesForProfile(profileId);
      totalEvaluated += facts.length;

      for (const factItem of facts) {
        const { termFreqs: targetFreqs } = SemanticMemoryQueryEngine.extractTerms(`${factItem.category} ${factItem.fact}`);
        const { score: simScore, matchedKeywords } = SemanticMemoryQueryEngine.computeCosineSimilarity(queryFreqs, targetFreqs);

        let hypResonance = 0;
        if (activeHypotheses.length > 0) {
          const { score: hScore } = SemanticMemoryQueryEngine.computeCosineSimilarity(hypothesisFreqs, targetFreqs);
          hypResonance = hScore;
        }

        if (simScore >= minThreshold || hypResonance >= minThreshold) {
          const confidenceBonus = (factItem.confidence || 90) / 100;
          const relevanceScore = simScore * 0.7 + hypResonance * 0.2 + confidenceBonus * 0.1;

          candidates.push({
            id: factItem.id,
            content: factItem.fact,
            category: factItem.category,
            source: factItem.source,
            confidence: factItem.confidence,
            similarityScore: Math.round(simScore * 1000) / 1000,
            relevanceScore: Math.round(relevanceScore * 1000) / 1000,
            matchedKeywords,
            memoryType: 'LONG_TERM_FACT',
            timestamp: factItem.updatedAt || factItem.createdAt,
            hypothesisResonance: Math.round(hypResonance * 1000) / 1000,
          });
        }
      }
    }

    // 2. Chat Experiences from Conversation History
    if (includeChat) {
      const history = persistentStorage.getChatHistory(profileId);
      totalEvaluated += history.length;

      for (const chatMsg of history) {
        if (!chatMsg.text || chatMsg.text.length < 5) continue;
        const { termFreqs: targetFreqs } = SemanticMemoryQueryEngine.extractTerms(chatMsg.text);
        const { score: simScore, matchedKeywords } = SemanticMemoryQueryEngine.computeCosineSimilarity(queryFreqs, targetFreqs);

        let hypResonance = 0;
        if (activeHypotheses.length > 0) {
          const { score: hScore } = SemanticMemoryQueryEngine.computeCosineSimilarity(hypothesisFreqs, targetFreqs);
          hypResonance = hScore;
        }

        if (simScore >= minThreshold || hypResonance >= minThreshold) {
          const relevanceScore = simScore * 0.8 + hypResonance * 0.2;

          candidates.push({
            id: chatMsg.id,
            content: `[Past Experience - ${chatMsg.sender || 'USER'}]: ${(chatMsg.text || '').slice(0, 300)}`,
            category: 'CHAT_EXPERIENCE',
            source: `CHAT_${chatMsg.sender}`,
            confidence: 85,
            similarityScore: Math.round(simScore * 1000) / 1000,
            relevanceScore: Math.round(relevanceScore * 1000) / 1000,
            matchedKeywords,
            memoryType: 'CHAT_EXPERIENCE',
            timestamp: chatMsg.timestamp,
            hypothesisResonance: Math.round(hypResonance * 1000) / 1000,
          });
        }
      }
    }

    // 3. Merkle Observation Substrate Ledger Nodes
    if (includeObs && gabbySubstrate) {
      const substrateAudit = gabbySubstrate.getFullSubstrateAudit();
      const allNodes = (gabbySubstrate as any).ledger?.getAllNodes?.() || [];
      totalEvaluated += allNodes.length;

      for (const node of allNodes) {
        const payloadStr = JSON.stringify(node.artifact?.payload || {});
        if (!payloadStr || payloadStr.length < 5) continue;

        const { termFreqs: targetFreqs } = SemanticMemoryQueryEngine.extractTerms(payloadStr);
        const { score: simScore, matchedKeywords } = SemanticMemoryQueryEngine.computeCosineSimilarity(queryFreqs, targetFreqs);

        if (simScore >= minThreshold) {
          const nodeId = node.merkleHash || node.nodeHash || node.artifact?.artifactId || `node-${Math.random()}`;
          candidates.push({
            id: String(nodeId).slice(0, 16),
            content: `[Substrate Merkle Observation]: ${(payloadStr || '').slice(0, 250)}`,
            category: 'OBSERVATION_DAG',
            source: 'GABBY_MERKLE_DAG',
            confidence: Math.round((node.artifact?.confidenceScore || 0.9) * 100),
            similarityScore: Math.round(simScore * 1000) / 1000,
            relevanceScore: Math.round(simScore * 0.9 * 1000) / 1000,
            matchedKeywords,
            memoryType: 'OBSERVATION_NODE',
            timestamp: node.timestamp ? new Date(node.timestamp * 1000).toISOString() : new Date().toISOString(),
          });
        }
      }
    }

    // Rank candidates by relevance score descending
    candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const matches = candidates.slice(0, topK);

    // Synthesize "Continuity of Thought Context" for Cognitive Reasoning
    const continuityContextLines: string[] = [];
    if (matches.length > 0) {
      continuityContextLines.push(`=== SEMANTIC MEMORY CONTINUITY (Top ${matches.length} Recalled Experiences & Facts) ===`);
      for (const m of matches) {
        continuityContextLines.push(
          `- [Score: ${(m.similarityScore * 100).toFixed(0)}% | Category: ${m.category}] ${m.content} (Matched: ${m.matchedKeywords.slice(0, 4).join(', ')})`
        );
      }
    } else {
      continuityContextLines.push(`=== SEMANTIC MEMORY CONTINUITY: No prior experiences matched threshold ${minThreshold} ===`);
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      query: queryInput,
      activeHypotheses,
      totalEvaluated,
      matchCount: matches.length,
      matches,
      continuityOfThoughtContext: continuityContextLines.join('\n'),
      executionTimeMs,
    };
  }
}

export const semanticMemoryQueryEngine = new SemanticMemoryQueryEngine();
