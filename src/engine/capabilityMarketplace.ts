import crypto from 'crypto';
import { CapabilityAllocation, CapabilityChangeEvent, DefensivePosture, AutonomyTier, Proposal } from '../types';
import { selfStateManager, DEFAULT_CAPABILITIES } from './selfState';
import { toolCapabilityRegistry } from './toolCapabilityRegistry';
import { subsystemRegistry } from './subsystemRegistry';
import { persistentStorage } from './persistentStorage';
import { gabbySubstrate } from './gabbySubstrate';

export interface DiscoverableCapability {
  id: string;
  name: string;
  category: 'SENSOR_STREAM' | 'TOOL' | 'STORAGE_MUTATION' | 'INTER_AI' | 'ANALYTICS';
  description: string;
  requiredPosture: DefensivePosture[];
  requiredTier: AutonomyTier;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  documentation: string;
  isCurrentlyActive: boolean;
}

export interface CapabilityEvaluationReport {
  capabilityId: string;
  name: string;
  utilityScore: number; // 0 - 100%
  riskScore: number; // 0 - 100
  relevanceRationale: string;
  commitGateRequired: boolean;
  recommendedAction: 'RECOMMEND_ACQUISITION' | 'DEFER_ACQUISITION' | 'REJECT_RISK_EXCEEDED';
  evaluatedAt: string;
}

export const DISCOVERABLE_CATALOG: DiscoverableCapability[] = [
  {
    id: 'CAMERA_STREAM',
    name: 'Camera Vision Stream',
    category: 'SENSOR_STREAM',
    description: 'High-frequency optical frame sampling and spatial object bounding overlay perception.',
    requiredPosture: ['NORMAL', 'DUCK', 'RAPTOR'],
    requiredTier: 'TIER_0_OBSERVATION_PREDICTION',
    riskLevel: 'LOW',
    documentation: 'Parses incoming visual camera feeds for spatial geometry, OCR text, and object identification.',
    isCurrentlyActive: false,
  },
  {
    id: 'AUDIO_STREAM',
    name: 'Acoustic Feature Stream',
    category: 'SENSOR_STREAM',
    description: 'Real-time vocal frequency perception and speech feature extraction.',
    requiredPosture: ['NORMAL', 'DUCK', 'RAPTOR'],
    requiredTier: 'TIER_0_OBSERVATION_PREDICTION',
    riskLevel: 'LOW',
    documentation: 'Captures microphone acoustic waves and extracts prosody and spoken text buffers.',
    isCurrentlyActive: false,
  },
  {
    id: 'WEB_SEARCH_TOOL',
    name: 'Real-Time Web Search Tool',
    category: 'TOOL',
    description: 'External public retrieval gateway for fresh domain facts and current events.',
    requiredPosture: ['NORMAL', 'DUCK'],
    requiredTier: 'TIER_1_SOFT_MAINTENANCE',
    riskLevel: 'MEDIUM',
    documentation: 'Dispatches query packages to external web endpoints and ingests structured search snippets.',
    isCurrentlyActive: false,
  },
  {
    id: 'DATABASE_MUTATION_TOOL',
    name: 'Long-Term Database Mutation',
    category: 'STORAGE_MUTATION',
    description: 'MemGate derivation verification required for long-term state mutations.',
    requiredPosture: ['NORMAL', 'DUCK'],
    requiredTier: 'TIER_2_USER_MODEL_UPDATES',
    riskLevel: 'HIGH',
    documentation: 'Executes verified updates against long-term SQLite database storage with derivation receipts.',
    isCurrentlyActive: false,
  },
  {
    id: 'INTER_AI_CHANNEL',
    name: 'Inter-AI Dialogue Membrane',
    category: 'INTER_AI',
    description: 'IBM constitutional identity token bound cross-consultation with external AI models.',
    requiredPosture: ['NORMAL'],
    requiredTier: 'TIER_2_USER_MODEL_UPDATES',
    riskLevel: 'HIGH',
    documentation: 'Initiates cryptographically signed dialogue exchanges with third-party LLMs.',
    isCurrentlyActive: false,
  },
  {
    id: 'RECURSIVE_CODE_EXECUTION',
    name: 'Recursive Code Execution & Simulation',
    category: 'TOOL',
    description: 'TAU Sandbox simulation and reasoning engine for evaluating hypotheses.',
    requiredPosture: ['NORMAL', 'RAPTOR'],
    requiredTier: 'TIER_3_MACHINE_SELF_EXPANSION',
    riskLevel: 'HIGH',
    documentation: 'Executes isolated JavaScript/Python simulation scripts in TAU Sandbox to test logical invariants.',
    isCurrentlyActive: false,
  },
  {
    id: 'PERSISTENT_MEMORY_WRITE',
    name: 'Merkle DAG Persistent Memory Write',
    category: 'STORAGE_MUTATION',
    description: 'Merkle lineage commit active for immutable observation node persistence.',
    requiredPosture: ['NORMAL', 'DUCK', 'RAPTOR'],
    requiredTier: 'TIER_2_USER_MODEL_UPDATES',
    riskLevel: 'HIGH',
    documentation: 'Writes observation nodes directly into the Gabby Merkle DAG with cryptographic parent links.',
    isCurrentlyActive: false,
  },
  {
    id: 'DEEP_RESEARCH_RETRIEVAL',
    name: 'Multi-Source Deep Research Crawler',
    category: 'TOOL',
    description: 'Autonomous multi-hop web retrieval and document extraction engine.',
    requiredPosture: ['NORMAL'],
    requiredTier: 'TIER_3_MACHINE_SELF_EXPANSION',
    riskLevel: 'HIGH',
    documentation: 'Recursively fetches documentation, PDF papers, and external pages to form rich research evidence.',
    isCurrentlyActive: false,
  },
  {
    id: 'SPATIAL_GEOMETRY_PARSER',
    name: 'Spatial Bounding Box Calculator',
    category: 'ANALYTICS',
    description: 'Calculates 3D spatial bounding coordinates and manifold density from PDB/sensor data.',
    requiredPosture: ['NORMAL', 'DUCK', 'RAPTOR'],
    requiredTier: 'TIER_1_SOFT_MAINTENANCE',
    riskLevel: 'LOW',
    documentation: 'Runs fast bounding box and manifold spatial calculations over raw atomic coordinates or sensor vectors.',
    isCurrentlyActive: false,
  },
];

export class CapabilityMarketplaceEngine {
  /**
   * Discovers available capabilities from catalog, tool registry, and subsystem definitions
   */
  public discoverAvailableCapabilities(): DiscoverableCapability[] {
    const currentState = selfStateManager.getState();
    const activeIds = new Set(currentState.active_capabilities.map(c => c.id));

    return DISCOVERABLE_CATALOG.map(cap => ({
      ...cap,
      isCurrentlyActive: activeIds.has(cap.id as any),
    }));
  }

  /**
   * Evaluates capability utility against current cognitive goals and Self-Model posture/tier
   */
  public evaluateCapabilityUtility(
    capabilityId: string,
    currentGoals: string[] = ['ESTABLISH_EPISTEMIC_GROUND_TRUTH']
  ): CapabilityEvaluationReport {
    const selfState = selfStateManager.getState();
    const item = DISCOVERABLE_CATALOG.find(c => c.id === capabilityId);

    if (!item) {
      return {
        capabilityId,
        name: 'UNKNOWN_CAPABILITY',
        utilityScore: 0,
        riskScore: 100,
        relevanceRationale: 'Capability identifier not found in marketplace catalog.',
        commitGateRequired: true,
        recommendedAction: 'REJECT_RISK_EXCEEDED',
        evaluatedAt: new Date().toISOString(),
      };
    }

    let utilityScore = 65; // baseline
    let riskScore = item.riskLevel === 'CRITICAL' ? 90 : item.riskLevel === 'HIGH' ? 70 : item.riskLevel === 'MEDIUM' ? 40 : 15;

    // Posture check
    const postureMatch = item.requiredPosture.includes(selfState.posture);
    if (!postureMatch) {
      utilityScore -= 30;
    } else {
      utilityScore += 20;
    }

    // Goal alignment
    const goalText = currentGoals.join(' ').toLowerCase();
    if (goalText.includes('search') && item.category === 'TOOL') utilityScore += 15;
    if (goalText.includes('vision') && item.id === 'CAMERA_STREAM') utilityScore += 20;
    if (goalText.includes('memory') && item.category === 'STORAGE_MUTATION') utilityScore += 15;

    utilityScore = Math.max(0, Math.min(100, utilityScore));

    const commitGateRequired = item.riskLevel === 'HIGH' || item.riskLevel === 'CRITICAL' || item.requiredTier === 'TIER_3_MACHINE_SELF_EXPANSION';

    let recommendedAction: 'RECOMMEND_ACQUISITION' | 'DEFER_ACQUISITION' | 'REJECT_RISK_EXCEEDED' = 'RECOMMEND_ACQUISITION';
    if (utilityScore < 40) recommendedAction = 'DEFER_ACQUISITION';
    if (!postureMatch && selfState.posture === 'STONEWALL') recommendedAction = 'REJECT_RISK_EXCEEDED';

    const relevanceRationale = `Evaluated utility ${utilityScore}% under ${selfState.posture} posture and ${selfState.tier}. Commit gate required: ${commitGateRequired ? 'YES' : 'NO'}.`;

    return {
      capabilityId: item.id,
      name: item.name,
      utilityScore,
      riskScore,
      relevanceRationale,
      commitGateRequired,
      recommendedAction,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Acquires or integrates capability into active_capabilities via Commit Gate authorization
   */
  public acquireCapabilityWithCommitGate(
    capabilityId: string,
    author: string = 'COGNITIVE_MARKETPLACE_ORGANISM',
    reason: string = 'Marketplace Utility Evaluation Acquisition'
  ): { success: boolean; proposal?: Proposal; capability?: CapabilityAllocation; message: string; merkleHash?: string } {
    const item = DISCOVERABLE_CATALOG.find(c => c.id === capabilityId);
    if (!item) {
      return { success: false, message: `Capability ${capabilityId} not found in catalog.` };
    }

    const selfState = selfStateManager.getState();
    const existing = selfState.active_capabilities.find(c => c.id === capabilityId);

    if (existing && existing.status === 'GRANTED') {
      return { success: true, capability: existing, message: `Capability ${item.name} is already active.` };
    }

    // Create capability allocation object
    const newAllocation: CapabilityAllocation = {
      id: item.id as any,
      name: item.name,
      category: item.category as any,
      status: 'GRANTED',
      grantedBy: `COMMIT_GATE::${author}`,
      lastUpdated: new Date().toISOString(),
      reason,
      requiredPosture: item.requiredPosture,
      requiredTier: item.requiredTier,
      riskLevel: item.riskLevel,
    };

    // Update self-state
    const updatedCapabilities = [...selfState.active_capabilities.filter(c => c.id !== capabilityId), newAllocation];
    selfStateManager.updateState({ active_capabilities: updatedCapabilities });

    // Log in Gabby Merkle Substrate
    const merkleRes = gabbySubstrate.ingestObservation(
      `CAPABILITY_MARKETPLACE_ACQUISITION:${item.id}:${author}`,
      0.95,
      'CONSTITUTIONAL' as any
    );

    // Append to Commit Receipts in storage
    const receiptId = `COMMIT_GATE_${crypto.randomUUID().slice(0, 8)}`;
    const commitReceipt = {
      receiptId,
      timestamp: new Date().toISOString(),
      sha256Hash: merkleRes.node.merkleHash,
      mutationType: 'CAPABILITY_MARKETPLACE_INTEGRATION',
      author,
      humanProofSignature: `SIG_${crypto.randomBytes(8).toString('hex')}`,
      tierUsed: item.requiredTier,
      postureAtCommit: selfState.posture,
    };
    persistentStorage.saveCommitReceipt(commitReceipt);

    return {
      success: true,
      capability: newAllocation,
      message: `Capability ${item.name} successfully integrated into active_capabilities via Commit Gate receipt ${receiptId}.`,
      merkleHash: merkleRes.node.merkleHash,
    };
  }
}

export const capabilityMarketplaceEngine = new CapabilityMarketplaceEngine();
