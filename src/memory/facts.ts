/**
 * Layer 2: Epistemic Vaults - Long-term Facts Vault
 * Simple key/value or search for persistent memories
 */

import { persistentStorage, LongTermMemoryItem } from '../engine/persistentStorage';
import { semanticMemoryQueryEngine, SemanticQueryOptions, SemanticQueryResult } from './semanticMemoryQueryEngine';
import { GabbyCognitiveSubstrate } from '../engine/gabbySubstrate';

export class FactsVault {
  public getFactsForProfile(profileId = 'will-owner'): LongTermMemoryItem[] {
    return persistentStorage.getMemoriesForProfile(profileId);
  }

  public addFact(profileId: string, fact: string, category = 'PERSONAL', confidence = 95): LongTermMemoryItem {
    return persistentStorage.addMemory(profileId, fact, category as any, 'EXPERT_USER_STATEMENT', confidence);
  }

  public deleteFact(memoryId: string, profileId = 'will-owner'): boolean {
    return persistentStorage.deleteMemory(memoryId, profileId);
  }

  public searchFacts(query: string, profileId = 'will-owner'): LongTermMemoryItem[] {
    const memories = this.getFactsForProfile(profileId);
    const q = query.toLowerCase();
    return memories.filter(m => m.fact.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
  }

  /**
   * Performs semantic similarity querying against memory store (long-term facts, past chat experiences, substrate nodes)
   */
  public querySemanticMemories(
    queryInput: string,
    gabbySubstrate?: GabbyCognitiveSubstrate,
    options?: SemanticQueryOptions
  ): SemanticQueryResult {
    return semanticMemoryQueryEngine.queryMemories(queryInput, gabbySubstrate, options);
  }
}

export const factsVault = new FactsVault();

