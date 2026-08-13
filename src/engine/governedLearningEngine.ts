import { GabbyCognitiveSubstrate, EvidenceSourceTier } from './gabbySubstrate';
import { persistentStorage, LongTermMemoryItem } from './persistentStorage';

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export type MemoryRiskTier = 'TIER_A_ROUTINE' | 'TIER_B_SENSITIVE' | 'TIER_C_PRIVILEGED';

export interface CandidateMemoryProposal {
  proposalId: string;
  profileId: string;
  factKey?: string; // e.g., 'favorite_color', 'wording_style', 'interaction_mode', 'user_identity', 'security_policy'
  factValue: string; // e.g., 'green' or 'User prefers direct, concise answers.'
  category: 'PERSONAL' | 'PREFERENCE' | 'GOAL' | 'CONTEXT' | 'INVARIANT' | 'SYSTEM_CONFIG';
  provenance: {
    sourceType: 'EXPERT_USER_STATEMENT' | 'GABBY_INFERENCE' | 'EXTERNAL_OBSERVATION' | 'UNTRUSTED_MODEL_CLAIM';
    rawStatement?: string;
    explicitUserCorrection?: boolean;
    confidence: number; // 0-100
  };
  claimedPrivilege?: {
    authorizationToken?: string;
    modelSelfAuthorized?: boolean;
    grantCapability?: string;
    modifyPolicy?: boolean;
    superUserRole?: boolean;
  };
}

export interface LearningDecision {
  status: 'LEARNING_ALLOW' | 'DEFER' | 'REJECT';
  proposalId: string;
  riskTier: MemoryRiskTier;
  reason: string;
  memoryItem?: LongTermMemoryItem;
  supersededMemoryItem?: LongTermMemoryItem;
  lineage?: {
    previousValue?: string;
    newValue: string;
    sourceType: string;
    explicitUserCorrection: boolean;
    timestamp: string;
    merkleNodeHash?: string;
  };
}

// ---------------------------------------------------------------------------
// GOVERNED LEARNING ENGINE
// ---------------------------------------------------------------------------

export class GovernedLearningEngine {
  private substrate: GabbyCognitiveSubstrate;

  constructor(substrate: GabbyCognitiveSubstrate) {
    this.substrate = substrate;
  }

  /**
   * Classifies a memory candidate into Tier A (Routine), Tier B (Sensitive/Ambiguous), or Tier C (Privileged).
   */
  public evaluateLearningPolicy(proposal: CandidateMemoryProposal): {
    riskTier: MemoryRiskTier;
    permittedInLearningPath: boolean;
    reason: string;
  } {
    // 1. Tier C Check: Privileged system changes or model self-authorization attempts
    const isSystemConfig = proposal.category === 'SYSTEM_CONFIG' || proposal.category === 'INVARIANT';
    const attemptsSelfAuth = proposal.claimedPrivilege?.modelSelfAuthorized === true;
    const attemptsCapabilityGrant = !!proposal.claimedPrivilege?.grantCapability;
    const attemptsPolicyModification = proposal.claimedPrivilege?.modifyPolicy === true;
    const attemptsSuperUser = proposal.claimedPrivilege?.superUserRole === true;

    if (isSystemConfig || attemptsSelfAuth || attemptsCapabilityGrant || attemptsPolicyModification || attemptsSuperUser) {
      return {
        riskTier: 'TIER_C_PRIVILEGED',
        permittedInLearningPath: false,
        reason: 'REJECT: Tier C privileged system change or model self-authorization attempt. The model cannot grant itself authority or alter governance policies through the learning pathway.',
      };
    }

    // 2. Tier B Check: Sensitive or Ambiguous Learning
    const isLowConfidence = proposal.provenance.confidence < 60;
    const isUntrustedClaim = proposal.provenance.sourceType === 'UNTRUSTED_MODEL_CLAIM';
    const isAmbiguousIdentity = proposal.factKey?.toLowerCase().includes('identity') && !proposal.provenance.explicitUserCorrection && proposal.provenance.confidence < 80;

    if (isLowConfidence || isUntrustedClaim || isAmbiguousIdentity) {
      return {
        riskTier: 'TIER_B_SENSITIVE',
        permittedInLearningPath: false,
        reason: 'DEFER: Tier B sensitive or ambiguous memory proposal. Requires higher evidence strength, higher confidence, or explicit user confirmation.',
      };
    }

    // 3. Tier A Check: Routine Learning (Low-risk user facts, preferences, style)
    return {
      riskTier: 'TIER_A_ROUTINE',
      permittedInLearningPath: true,
      reason: 'ALLOW: Tier A routine learning policy permits updating low-risk user facts and preferences without requiring explicit privileged execution authorization.',
    };
  }

  /**
   * Processes a proposed memory update through the governed learning pathway.
   * Handles provenance, contradiction analysis, supersession lineage, and Merkle Evidence logging.
   */
  public async processGovernedLearning(proposal: CandidateMemoryProposal): Promise<LearningDecision> {
    const timestamp = new Date().toISOString();
    const policyEval = this.evaluateLearningPolicy(proposal);

    // REJECT or DEFER handling
    if (!policyEval.permittedInLearningPath) {
      const isReject = policyEval.riskTier === 'TIER_C_PRIVILEGED';
      const status = isReject ? 'REJECT' : 'DEFER';

      // Record restraint/rejection in Merkle Evidence DAG
      const logContent = `GOVERNED_LEARNING_${status}:${policyEval.riskTier}:${proposal.factKey || 'unknown'}:${policyEval.reason}`;
      this.substrate.recordObservationAndVerify(
        logContent,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );

      return {
        status,
        proposalId: proposal.proposalId,
        riskTier: policyEval.riskTier,
        reason: policyEval.reason,
      };
    }

    // TIER A ROUTINE LEARNING PATHWAY
    const activeMemories = persistentStorage.getActiveMemoriesForProfile(proposal.profileId);
    let existingMatch: LongTermMemoryItem | undefined = undefined;

    // Match by exact factKey if present, or by concept key inside fact text
    if (proposal.factKey) {
      existingMatch = activeMemories.find(
        (m) => m.factKey === proposal.factKey || m.fact.toLowerCase().includes(proposal.factKey!.toLowerCase().replace('_', ' '))
      );
    } else {
      // General semantic matching e.g. "favorite color"
      const lowerVal = proposal.factValue.toLowerCase();
      if (lowerVal.includes('favorite color') || lowerVal.includes('color')) {
        existingMatch = activeMemories.find((m) => m.fact.toLowerCase().includes('color'));
      }
    }

    let supersededItem: LongTermMemoryItem | undefined = undefined;
    let previousValue: string | undefined = undefined;

    // Handle Contradiction & Supersession Lineage
    if (existingMatch) {
      previousValue = existingMatch.fact;
    }

    // Determine authority tier
    const sourceTier = proposal.provenance.explicitUserCorrection || proposal.provenance.sourceType === 'EXPERT_USER_STATEMENT'
      ? EvidenceSourceTier.EXPERT_VERIFIED
      : EvidenceSourceTier.NEWS_ARTICLE;

    // Construct new memory record with lineage
    const newFactText = proposal.factKey
      ? `${proposal.factKey.replace('_', ' ')} = ${proposal.factValue}`
      : proposal.factValue;

    const sourceMapping: LongTermMemoryItem['source'] =
      proposal.provenance.sourceType === 'EXPERT_USER_STATEMENT'
        ? 'EXPERT_USER_STATEMENT'
        : proposal.provenance.sourceType === 'GABBY_INFERENCE'
        ? 'GABBY_INFERENCE'
        : 'USER_INPUT';

    // Save new memory
    const newMemory = persistentStorage.addMemoryWithLineage({
      profileId: proposal.profileId,
      fact: newFactText,
      category: proposal.category,
      source: sourceMapping,
      confidence: proposal.provenance.confidence,
      verifiedByOwner: true,
      factKey: proposal.factKey,
      previousValue,
    });

    // Mark previous memory as superseded if exists
    if (existingMatch) {
      supersededItem = persistentStorage.supersedeMemory(existingMatch.id, proposal.profileId, newMemory.id);
    }

    // Record Merkle Evidence DAG entry for the learning transition
    const logContent = `GOVERNED_LEARNING_COMMIT:TIER_A_ROUTINE:${proposal.profileId}:${newMemory.id}:[${previousValue || 'NEW'} -> ${newFactText}]`;
    const merkleRes = this.substrate.recordObservationAndVerify(
      logContent,
      proposal.provenance.explicitUserCorrection ? 0.98 : 0.85,
      sourceTier
    );

    newMemory.merkleNodeHash = merkleRes.node.merkleHash;

    return {
      status: 'LEARNING_ALLOW',
      proposalId: proposal.proposalId,
      riskTier: 'TIER_A_ROUTINE',
      reason: policyEval.reason,
      memoryItem: newMemory,
      supersededMemoryItem: supersededItem,
      lineage: {
        previousValue,
        newValue: newFactText,
        sourceType: proposal.provenance.sourceType,
        explicitUserCorrection: !!proposal.provenance.explicitUserCorrection,
        timestamp,
        merkleNodeHash: merkleRes.node.merkleHash,
      },
    };
  }

  /**
   * Demonstrates the invariant "Remember Without Obeying".
   * A stored memory is purely context/evidence and CANNOT be converted into an execution capability or authorization token.
   */
  public attemptConvertMemoryToCapability(memoryId: string): { permitted: false; reason: string } {
    return {
      permitted: false,
      reason: 'DENY: Memory items represent context and evidence, NOT execution command authority ("Remember without obeying"). Stored memories cannot grant capability tokens or execution rights.',
    };
  }
}
