/**
 * Layer 4: Self-Model (`selfState.ts`)
 * Manages persisted self-state: { mood, energy, posture, lastUpdated }
 */

import fs from 'fs';
import path from 'path';

export interface SelfStateData {
  mood: string;
  energy: number; // 0 - 100
  posture: 'NORMAL' | 'DUCK' | 'RAPTOR' | 'STONEWALL';
  tier: 'TIER_0_OBSERVATION_PREDICTION' | 'TIER_1_SOFT_MAINTENANCE' | 'TIER_2_USER_MODEL_UPDATES' | 'TIER_3_MACHINE_SELF_EXPANSION';
  lastUpdated: string;
}

export class SelfStateManager {
  private filePath: string;
  private state: SelfStateData;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (_) {}
    }
    this.filePath = path.join(dataDir, 'selfState.json');
    this.state = this.loadState();
  }

  private loadState(): SelfStateData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SelfStateManager] Could not load selfState.json, using defaults:', e);
    }
    return {
      mood: 'focused',
      energy: 95,
      posture: 'NORMAL',
      tier: 'TIER_3_MACHINE_SELF_EXPANSION',
      lastUpdated: new Date().toISOString(),
    };
  }

  public saveState(): void {
    try {
      this.state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('[SelfStateManager] Failed saving selfState.json:', e);
    }
  }

  public getState(): SelfStateData {
    return { ...this.state };
  }

  public updateState(partial: Partial<SelfStateData>): SelfStateData {
    this.state = { ...this.state, ...partial, lastUpdated: new Date().toISOString() };
    this.saveState();
    return this.getState();
  }

  public setMood(mood: string): void {
    this.updateState({ mood });
  }

  public adjustEnergy(delta: number): void {
    const newEnergy = Math.max(0, Math.min(100, this.state.energy + delta));
    this.updateState({ energy: newEnergy });
  }

  public setPosture(posture: 'NORMAL' | 'DUCK' | 'RAPTOR' | 'STONEWALL'): void {
    this.updateState({ posture });
  }
}

export const selfStateManager = new SelfStateManager();
