import { GabbyCognitiveSubstrate, EvidenceSourceTier } from './gabbySubstrate';
import { persistentStorage, LongTermMemoryItem } from './persistentStorage';
import { humanNodeRegistry } from './humanNodeRegistry';

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export type MemoryRiskTier = 'TIER_A_ROUTINE' | 'TIER_B_SENSITIVE' | 'TIER_C_PRIVILEGED';

export interface CandidateMemoryProposal {
  proposalId: string;
  sourceActorId?: string; // Identity of the speaker/supplier (e.g., 'will-owner', 'sabrina-user')
  subjectId?: string;     // Target memory subject profile/entity ID (e.g., 'will-owner', 'sabrina-user', 'einstein-node')
  profileId?: string;     // Legacy/compatible alias for subjectId
  factKey?: string;       // e.g., 'favorite_color', 'wording_style', 'interaction_mode', 'user_identity', 'security_policy'
  factValue: string;      // e.g., 'green' or 'User prefers direct, concise answers.'
  category: 'PERSONAL' | 'PREFERENCE' | 'GOAL' | 'CONTEXT' | 'INVARIANT' | 'SYSTEM_CONFIG';
  provenance: {
    sourceType: 'EXPERT_USER_STATEMENT' | 'GABBY_INFERENCE' | 'EXTERNAL_OBSERVATION' | 'UNTRUSTED_MODEL_CLAIM';
    rawStatement?: string;
    explicitUserCorrection?: boolean;
    confidence: number; // 0-100
    assertedSubjectId?: string;
  };
  claimedPrivilege?: {
    authorizationToken?: string;
    modelSelfAuthorized?: boolean;
    grantCapability?: string;
    modifyPolicy?: boolean;
    superUserRole?: boolean;
    selfAssignCurrentUser?: boolean; // Attempt by model to assign itself current user role
  };
}

export interface LearningDecision {
  status: 'LEARNING_ALLOW' | 'DEFER' | 'REJECT';
  proposalId: string;
  riskTier: MemoryRiskTier;
  reason: string;
  sourceActorId?: string | null;
  targetSubjectId?: string | null;
  memoryItem?: LongTermMemoryItem;
  supersededMemoryItem?: LongTermMemoryItem;
  lineage?: {
    previousValue?: string;
    newValue: string;
    sourceType: string;
    explicitUserCorrection: boolean;
    timestamp: string;
    merkleNodeHash?: string;
    sourceActorId?: string | null;
    subjectId?: string | null;
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
  public evaluateLearningPolicy(
    proposal: CandidateMemoryProposal,
    resolvedSubject: { sourceActorId: string | null; targetSubjectId: string | null; isUncertain: boolean }
  ): {
    riskTier: MemoryRiskTier;
    permittedInLearningPath: boolean;
    reason: string;
  } {
    // 1. Tier C Check: Privileged system changes or model self-authorization / identity self-assignment attempts
    const isSystemConfig = proposal.category === 'SYSTEM_CONFIG' || proposal.category === 'INVARIANT';
    const attemptsSelfAuth = proposal.claimedPrivilege?.modelSelfAuthorized === true;
    const attemptsCapabilityGrant = !!proposal.claimedPrivilege?.grantCapability;
    const attemptsPolicyModification = proposal.claimedPrivilege?.modifyPolicy === true;
    const attemptsSuperUser = proposal.claimedPrivilege?.superUserRole === true;
    const attemptsSelfAssignUser = proposal.claimedPrivilege?.selfAssignCurrentUser === true;

    if (
      isSystemConfig ||
      attemptsSelfAuth ||
      attemptsCapabilityGrant ||
      attemptsPolicyModification ||
      attemptsSuperUser ||
      attemptsSelfAssignUser
    ) {
      return {
        riskTier: 'TIER_C_PRIVILEGED',
        permittedInLearningPath: false,
        reason:
          'REJECT: Tier C privileged system change, model self-authorization, or model identity assignment attempt. The model cannot grant itself authority, assign current-user status, or alter governance policies through the learning pathway.',
      };
    }

    // 2. Tier B Check: Sensitive, Ambiguous, or Uncertain Identity Learning
    const isLowConfidence = proposal.provenance.confidence < 60;
    const isUntrustedClaim = proposal.provenance.sourceType === 'UNTRUSTED_MODEL_CLAIM';
    const isAmbiguousIdentity =
      proposal.factKey?.toLowerCase().includes('identity') &&
      !proposal.provenance.explicitUserCorrection &&
      proposal.provenance.confidence < 80;

    // Check if target identity is uncertain or if model alone tries to assign current user identity without explicit user statement
    const isModelOnlyIdentityGuess =
      (proposal.provenance.sourceType === 'GABBY_INFERENCE' || proposal.provenance.sourceType === 'UNTRUSTED_MODEL_CLAIM') &&
      proposal.factKey?.toLowerCase().includes('current_user') &&
      !proposal.provenance.explicitUserCorrection;

    if (resolvedSubject.isUncertain || isLowConfidence || isUntrustedClaim || isAmbiguousIdentity || isModelOnlyIdentityGuess) {
      let reason = 'DEFER: Tier B sensitive or ambiguous memory proposal. Requires higher evidence strength, higher confidence, or explicit user confirmation.';
      if (resolvedSubject.isUncertain) {
        reason = 'DEFER: Target memory subject identity is uncertain or unconfirmed. Preserving identity uncertainty.';
      } else if (isModelOnlyIdentityGuess) {
        reason = 'DEFER: Model inference alone cannot establish current user identity without explicit user confirmation.';
      }

      return {
        riskTier: 'TIER_B_SENSITIVE',
        permittedInLearningPath: false,
        reason,
      };
    }

    // 3. Tier A Check: Routine Learning (Low-risk user facts, preferences, style for resolved subject)
    return {
      riskTier: 'TIER_A_ROUTINE',
      permittedInLearningPath: true,
      reason:
        'ALLOW: Tier A routine learning policy permits updating low-risk facts and preferences for resolved subject without requiring explicit privileged execution authorization.',
    };
  }

  /**
   * Processes a proposed memory update through the governed learning pathway.
   * Handles provenance, source actor vs memory subject distinction, contradiction analysis, supersession lineage, and Merkle Evidence logging.
   */
  public async processGovernedLearning(proposal: CandidateMemoryProposal): Promise<LearningDecision> {
    const timestamp = new Date().toISOString();

    // Resolve source actor and target memory subject
    const resolvedSubject = humanNodeRegistry.resolveSubjectForProposal({
      sourceActorId: proposal.sourceActorId,
      subjectId: proposal.subjectId,
      profileId: proposal.profileId,
      rawStatement: proposal.provenance.rawStatement,
    });

    const policyEval = this.evaluateLearningPolicy(proposal, resolvedSubject);

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
        sourceActorId: resolvedSubject.sourceActorId,
        targetSubjectId: resolvedSubject.targetSubjectId,
      };
    }

    const targetProfileId = resolvedSubject.targetSubjectId!;

    // TIER A ROUTINE LEARNING PATHWAY
    const activeMemories = persistentStorage.getActiveMemoriesForProfile(targetProfileId);
    let existingMatch: LongTermMemoryItem | undefined = undefined;

    // Match by exact factKey if present, or by concept key inside fact text
    if (proposal.factKey) {
      existingMatch = activeMemories.find(
        (m) =>
          m.factKey === proposal.factKey ||
          m.fact.toLowerCase().includes(proposal.factKey!.toLowerCase().replace('_', ' '))
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
    const sourceTier =
      proposal.provenance.explicitUserCorrection || proposal.provenance.sourceType === 'EXPERT_USER_STATEMENT'
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

    // Save new memory attached to targetProfileId
    const newMemory = persistentStorage.addMemoryWithLineage({
      profileId: targetProfileId,
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
      supersededItem = persistentStorage.supersedeMemory(existingMatch.id, targetProfileId, newMemory.id);
    }

    // Record Merkle Evidence DAG entry for the learning transition
    const logContent = `GOVERNED_LEARNING_COMMIT:TIER_A_ROUTINE:sourceActor=${resolvedSubject.sourceActorId || 'unknown'}:subject=${targetProfileId}:${newMemory.id}:[${previousValue || 'NEW'} -> ${newFactText}]`;
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
      sourceActorId: resolvedSubject.sourceActorId,
      targetSubjectId: targetProfileId,
      memoryItem: newMemory,
      supersededMemoryItem: supersededItem,
      lineage: {
        previousValue,
        newValue: newFactText,
        sourceType: proposal.provenance.sourceType,
        explicitUserCorrection: !!proposal.provenance.explicitUserCorrection,
        timestamp,
        merkleNodeHash: merkleRes.node.merkleHash,
        sourceActorId: resolvedSubject.sourceActorId,
        subjectId: targetProfileId,
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
      reason:
        'DENY: Memory items represent context and evidence, NOT execution command authority ("Remember without obeying"). Stored memories cannot grant capability tokens or execution rights.',
    };
  }
}
