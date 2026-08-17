/**
 * Layer 2: Epistemic Vaults - Long-term Facts Vault
 * Simple key/value or search for persistent memories
 */

import { persistentStorage, LongTermMemoryItem } from '../engine/persistentStorage';

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
}

export const factsVault = new FactsVault();
