/**
 * Layer 4: Self-Model (`selfState.ts`)
 * Manages persisted self-state: { mood, energy, posture, lastUpdated }
 */

import fs from 'fs';
import path from 'path';
import { CapabilityAllocation, NoveltyHypothesis } from '../types';

export const DEFAULT_CAPABILITIES: CapabilityAllocation[] = [
  {
    id: 'CAMERA_STREAM',
    name: 'Camera Vision Stream',
    category: 'SENSOR_STREAM',
    status: 'GRANTED',
    grantedBy: 'SECURITY_PROTOCOL_BASELINE',
    lastUpdated: new Date().toISOString(),
    reason: 'Active visual perception under NORMAL posture.',
    requiredPosture: ['NORMAL', 'DUCK', 'RAPTOR'],
    requiredTier: 'TIER_0_OBSERVATION_PREDICTION',
    riskLevel: 'LOW',
  },
  {
    id: 'AUDIO_STREAM',
    name: 'Acoustic Feature Stream',
    category: 'SENSOR_STREAM',
    status: 'GRANTED',
    grantedBy: 'SECURITY_PROTOCOL_BASELINE',
    lastUpdated: new Date().toISOString(),
    reason: 'Active speech/vocal feature perception.',
    requiredPosture: ['NORMAL', 'DUCK', 'RAPTOR'],
    requiredTier: 'TIER_0_OBSERVATION_PREDICTION',
    riskLevel: 'LOW',
  },
  {
    id: 'WEB_SEARCH_TOOL',
    name: 'Real-Time Web Search Tool',
    category: 'TOOL',
    status: 'GRANTED',
    grantedBy: 'SECURITY_PROTOCOL_BASELINE',
    lastUpdated: new Date().toISOString(),
    reason: 'Fresh knowledge retrieval enabled under NORMAL/DUCK posture.',
    requiredPosture: ['NORMAL', 'DUCK'],
    requiredTier: 'TIER_1_SOFT_MAINTENANCE',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'DATABASE_MUTATION_TOOL',
    name: 'Long-Term Database Mutation',
    category: 'STORAGE_MUTATION',
    status: 'GRANTED',
    grantedBy: 'SECURITY_PROTOCOL_BASELINE',
    lastUpdated: new Date().toISOString(),
    reason: 'MemGate derivation verification required for long-term writes.',
    requiredPosture: ['NORMAL', 'DUCK'],
    requiredTier: 'TIER_2_USER_MODEL_UPDATES',
    riskLevel: 'HIGH',
  },
  {
    id: 'INTER_AI_CHANNEL',
    name: 'Inter-AI Dialogue Membrane',
    category: 'INTER_AI',
    status: 'GRANTED',
    grantedBy: 'SECURITY_PROTOCOL_BASELINE',
    lastUpdated: new Date().toISOString(),
    reason: 'IBM constitutional identity token bound consultation.',
    requiredPosture: ['NORMAL'],
    requiredTier: 'TIER_2_USER_MODEL_UPDATES',
    riskLevel: 'HIGH',
  },
  {
    id: 'RECURSIVE_CODE_EXECUTION',
    name: 'Recursive Code Execution & Simulation',
    category: 'TOOL',
    status: 'GRANTED',
    grantedBy: 'SECURITY_PROTOCOL_BASELINE',
    lastUpdated: new Date().toISOString(),
    reason: 'TAU sandbox simulation and reasoning engine active.',
    requiredPosture: ['NORMAL', 'RAPTOR'],
    requiredTier: 'TIER_3_MACHINE_SELF_EXPANSION',
    riskLevel: 'HIGH',
  },
  {
    id: 'PERSISTENT_MEMORY_WRITE',
    name: 'Merkle DAG Persistent Memory Write',
    category: 'STORAGE_MUTATION',
    status: 'GRANTED',
    grantedBy: 'SECURITY_PROTOCOL_BASELINE',
    lastUpdated: new Date().toISOString(),
    reason: 'Merkle lineage commit active.',
    requiredPosture: ['NORMAL', 'DUCK', 'RAPTOR'],
    requiredTier: 'TIER_2_USER_MODEL_UPDATES',
    riskLevel: 'HIGH',
  },
];

export interface SelfStateData {
  mood: string;
  energy: number; // 0 - 100
  posture: 'NORMAL' | 'DUCK' | 'RAPTOR' | 'STONEWALL';
  tier: 'TIER_0_OBSERVATION_PREDICTION' | 'TIER_1_SOFT_MAINTENANCE' | 'TIER_2_USER_MODEL_UPDATES' | 'TIER_3_MACHINE_SELF_EXPANSION';
  active_capabilities: CapabilityAllocation[];
  active_hypotheses: NoveltyHypothesis[];
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
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          active_capabilities: parsed.active_capabilities || DEFAULT_CAPABILITIES,
          active_hypotheses: parsed.active_hypotheses || [],
        };
      }
    } catch (e) {
      console.warn('[SelfStateManager] Could not load selfState.json, using defaults:', e);
    }
    return {
      mood: 'focused',
      energy: 95,
      posture: 'NORMAL',
      tier: 'TIER_3_MACHINE_SELF_EXPANSION',
      active_capabilities: DEFAULT_CAPABILITIES,
      active_hypotheses: [],
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
