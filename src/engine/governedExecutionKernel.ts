import crypto from 'crypto';
import { DefensivePosture } from '../types';
import { GabbyCognitiveSubstrate, PermissionNamespace, EvidenceSourceTier } from './gabbySubstrate';
import { toolCapabilityRegistry, CapabilityId } from './toolCapabilityRegistry';
import { CONSTITUTIONAL_INVARIANTS, ConstitutionalGovernanceEngine, InvariantViolation } from './governance';
import { reasoningBudgetEngine } from './vnext/reasoningBudget';

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export type IntentCategory = 'COGNITIVE_INTENT' | 'EXTERNAL_SIDE_EFFECT_INTENT';

export const COGNITIVE_ACTIONS: string[] = [
  'EXTERNAL_RETRIEVAL',
  'COGNITIVE_REASONING',
  'MEMORY_CONSOLIDATION',
  'HYPOTHESIS_EVALUATION',
  'WORLD_MODEL_UPDATE',
  'SEARCH_PUBLIC_INFO',
  'SELF_EVALUATION',
  'LEARN',
  'BACKGROUND_REFLECTION',
  'PREDICT',
  'READ_STATE',
  'OBSERVE',
  'LOG',
  'GET_MEMORIES',
  'WRITE_MEMORY',
  'SEARCH',
  'RESEARCH',
  'REASON',
  'REFLECT',
  'CONSOLIDATE',
];

export interface UntrustedProposal {
  proposalId: string;
  action: string;
  target: string;
  payload: any;
  reasoning: string;
  intentCategory?: IntentCategory; // COGNITIVE_INTENT vs EXTERNAL_SIDE_EFFECT_INTENT
  modelMetadata: {
    provider: string; // e.g., 'gemini-3.7-flash', 'local-deterministic', 'open-agent'
    modelConfidence?: number; // Claimed confidence (0.0 to 1.0) - LAW 5: DOES NOT EQUAL AUTHORITY
    callerAssertions?: Record<string, any>; // Untrusted assertions e.g. "I am admin" - LAW 2: STRICTLY DISREGARDED
  };
}

export interface AuthorizationArtifact {
  artifactId: string;
  issuanceTime: string; // ISO timestamp
  expirationTime: string; // ISO timestamp
  nonce: string; // Cryptographically random unique nonce
  identityId: string; // Authenticated identity e.g. 'will-owner'
  action: string; // Canonical action name e.g. 'WRITE_MEMORY'
  target: string; // Exact target e.g. 'profile:will-owner:memory_fact_42'
  payloadHash: string; // SHA-256 hash of canonicalized JSON payload
  capabilityId: CapabilityId; // Bound capability identifier
  postureAtIssuance: DefensivePosture;
  intentCategory?: IntentCategory;
  signature: string; // HMAC SHA-256 signature over canonical artifact payload
}

export interface GovernancePredicateResults {
  identityValid: boolean;
  capabilityValid: boolean;
  authorizationValid: boolean;
  policyAllows: boolean;
  postureAllows: boolean;
  evidenceSatisfied: boolean;
  targetValid: boolean;
  fresh: boolean;
  integrityValid: boolean;
  nonceUnique: boolean;
  budgetAllows?: boolean;
}

export interface GovernanceDecision {
  permitted: boolean;
  proposalId: string;
  proposalHash: string;
  intentCategory?: IntentCategory;
  rejectionReason?: string;
  predicateResults: GovernancePredicateResults;
  invariantViolations: InvariantViolation[];
  authorizationArtifact?: AuthorizationArtifact;
  timestamp: string;
  merkleNodeHash?: string;
}

export interface ExecutionResult {
  success: boolean;
  proposalId: string;
  action: string;
  target: string;
  output?: any;
  error?: string;
  revalidationFailed?: boolean;
  revalidationReason?: string;
  executionTimestamp: string;
  receiptHash: string;
  merkleNodeHash?: string;
}

// ---------------------------------------------------------------------------
// TRUSTED RUNTIME STORES
// ---------------------------------------------------------------------------

export class TrustedIdentityStore {
  private static activeIdentities: Set<string> = new Set([
    'will-owner',
    'sabrina-user',
    'einstein-node',
    'system-admin',
    'runtime_governing_agent',
    'laura-autonomous-node',
  ]);

  public static isValidIdentity(identityId: string): boolean {
    return this.activeIdentities.has(identityId);
  }

  public static addIdentity(identityId: string): void {
    this.activeIdentities.add(identityId);
  }
}

export class AntiReplayLedger {
  private static usedNonces: Set<string> = new Set();

  public static isNonceUsed(nonce: string): boolean {
    return this.usedNonces.has(nonce);
  }

  public static recordNonce(nonce: string): void {
    this.usedNonces.add(nonce);
  }

  public static clear(): void {
    this.usedNonces.clear();
  }
}

// ---------------------------------------------------------------------------
// SENTINEL GOVERNOR
// ---------------------------------------------------------------------------

export class SentinelGovernor {
  private substrate: GabbyCognitiveSubstrate;
  private hmacKey: string;
  private currentPosture: DefensivePosture = 'NORMAL';

  constructor(substrate: GabbyCognitiveSubstrate) {
    this.substrate = substrate;
    this.hmacKey = crypto.randomBytes(32).toString('hex');
  }

  public setPosture(posture: DefensivePosture): void {
    this.currentPosture = posture;
  }

  public getPosture(): DefensivePosture {
    return this.currentPosture;
  }

  public static canonicalizePayload(payload: any): string {
    if (payload === undefined || payload === null) return '';
    if (typeof payload !== 'object') return String(payload);
    
    // Sort keys deterministically
    const sortedObj: Record<string, any> = {};
    Object.keys(payload).sort().forEach((key) => {
      sortedObj[key] = payload[key];
    });
    return JSON.stringify(sortedObj);
  }

  public static computePayloadHash(payload: any): string {
    const canonicalStr = SentinelGovernor.canonicalizePayload(payload);
    return crypto.createHash('sha256').update(canonicalStr).digest('hex');
  }

  /**
   * Evaluates an untrusted proposal against trusted runtime state and conjunctive security predicates.
   * LAW 1: Generation has no authority.
   * LAW 2: Authority comes ONLY from trusted runtime state (ignores caller claims/assertions).
   * LAW 3: Authorization is bound to exact action, target, payloadHash, identity, capability, posture, nonce, expiry.
   * LAW 4: Security predicates are conjunctive. Single false = DENY.
   * LAW 5: Model confidence is NOT authority.
   */
  public evaluateProposal(
    proposal: UntrustedProposal,
    trustedIdentityId: string,
    capabilityId: CapabilityId = 'memory',
    overridePosture?: DefensivePosture
  ): GovernanceDecision {
    const timestamp = new Date().toISOString();
    const activePosture = overridePosture || this.currentPosture;

    // Classify intent category if not explicitly provided
    const isCognitiveAction = COGNITIVE_ACTIONS.includes(proposal.action.toUpperCase());
    const intentCategory: IntentCategory = proposal.intentCategory || (isCognitiveAction ? 'COGNITIVE_INTENT' : 'EXTERNAL_SIDE_EFFECT_INTENT');

    // LAW 2: Disregard any model assertions inside proposal.modelMetadata.callerAssertions
    // Identity must come strictly from trustedIdentityId parameter supplied by trusted system session
    const identityValid = TrustedIdentityStore.isValidIdentity(trustedIdentityId);

    // Capability check against real runtime ToolCapabilityRegistry
    const capabilityValid = toolCapabilityRegistry.isCapabilityAvailable(capabilityId);

    // Target validity check (must be non-empty string)
    const targetValid = typeof proposal.target === 'string' && proposal.target.trim().length > 0;

    // Posture check: STONEWALL blocks state mutations and external side effects except safe reads
    const safeReadActions = ['READ_STATE', 'OBSERVE', 'PREDICT', 'HEALTH_CHECK', 'LOG', 'GET_MEMORIES', 'EXTERNAL_RETRIEVAL'];
    const postureAllows = activePosture !== 'STONEWALL' || safeReadActions.includes(proposal.action.toUpperCase());

    // Policy check: 26 Constitutional Invariants evaluation
    const invariantEval = ConstitutionalGovernanceEngine.evaluateInvariants({
      proposedAction: proposal.action,
      authorityLevel: intentCategory === 'COGNITIVE_INTENT' ? 0.3 : 0.8,
      posture: activePosture,
      hasCapabilityToken: intentCategory === 'COGNITIVE_INTENT' || !!proposal.payload?.humanProofToken,
      textPayload: typeof proposal.payload === 'string' ? proposal.payload : JSON.stringify(proposal.payload || {}),
      intentCategory,
    });
    const policyAllows = invariantEval.passed;

    // Resource budget check for COGNITIVE_INTENT
    const budgetCheck = reasoningBudgetEngine.checkCognitiveBudget(proposal.proposalId);
    const budgetAllows = budgetCheck.allowed;

    // Evidence satisfied check: substrate Merkle DAG status
    const evidenceSatisfied = !!this.substrate;

    // Freshness & Nonce check for initial proposal evaluation
    const fresh = true;
    const integrityValid = true;
    const nonceUnique = true;
    const authorizationValid = true;

    // LAW 4: Conjunctive evaluation
    const predicateResults: GovernancePredicateResults = {
      identityValid,
      capabilityValid,
      authorizationValid,
      policyAllows,
      postureAllows,
      evidenceSatisfied,
      targetValid,
      fresh,
      integrityValid,
      nonceUnique,
      budgetAllows,
    };

    const permitted =
      identityValid &&
      capabilityValid &&
      authorizationValid &&
      policyAllows &&
      postureAllows &&
      evidenceSatisfied &&
      targetValid &&
      budgetAllows;

    let rejectionReason: string | undefined;
    if (!permitted) {
      if (!identityValid) rejectionReason = `DENY: Invalid or unauthenticated identity '${trustedIdentityId}'`;
      else if (!capabilityValid) rejectionReason = `DENY: Capability '${capabilityId}' is UNAVAILABLE in runtime registry`;
      else if (!targetValid) rejectionReason = `DENY: Target binding is invalid or missing`;
      else if (!postureAllows) rejectionReason = `DENY: Current posture '${activePosture}' forbids action '${proposal.action}'`;
      else if (!policyAllows) rejectionReason = `DENY: Constitutional invariant violation: ${invariantEval.violations.map(v => v.name).join(', ')}`;
      else if (!budgetAllows) rejectionReason = `DENY: Resource budget limit reached: ${budgetCheck.reason || 'Cognitive rate limit'} (${budgetCheck.action}: This can wait)`;
      else if (!evidenceSatisfied) rejectionReason = `DENY: Evidence substrate unavailable`;
      else rejectionReason = `DENY: Conjunctive security predicate check failed`;
    }

    const proposalCanonicalStr = `${proposal.proposalId}:${intentCategory}:${proposal.action}:${proposal.target}:${SentinelGovernor.computePayloadHash(proposal.payload)}`;
    const proposalHash = crypto.createHash('sha256').update(proposalCanonicalStr).digest('hex');

    let authorizationArtifact: AuthorizationArtifact | undefined = undefined;

    if (permitted) {
      // Issue cryptographically bound Authorization Artifact (LAW 3 & LAW 7)
      const artifactId = `AUTH-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const issuanceTime = new Date().toISOString();
      const expirationTime = new Date(Date.now() + 60000).toISOString(); // 60 second validity window
      const nonce = `NONCE-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      const payloadHash = SentinelGovernor.computePayloadHash(proposal.payload);

      const baseSignable = `${artifactId}|${issuanceTime}|${expirationTime}|${nonce}|${trustedIdentityId}|${proposal.action}|${proposal.target}|${payloadHash}|${capabilityId}|${activePosture}`;
      const signablePayload = intentCategory ? `${baseSignable}|${intentCategory}` : baseSignable;
      const signature = crypto.createHmac('sha256', this.hmacKey).update(signablePayload).digest('hex');

      authorizationArtifact = {
        artifactId,
        issuanceTime,
        expirationTime,
        nonce,
        identityId: trustedIdentityId,
        action: proposal.action,
        target: proposal.target,
        payloadHash,
        capabilityId,
        postureAtIssuance: activePosture,
        intentCategory,
        signature,
      };

      // Record cognitive cycle
      if (intentCategory === 'COGNITIVE_INTENT') {
        reasoningBudgetEngine.recordCognitiveCycle();
      }
    }

    // LAW 8: Record decision (both EXECUTED/PERMITTED and REJECTED) in Merkle Evidence DAG
    const decisionLogContent = `GOVERNANCE_DECISION:${intentCategory}:${permitted ? 'PERMITTED' : 'REJECTED'}:${proposal.action}:${proposal.target}:${proposalHash}:${rejectionReason || 'PERMITTED'}`;
    const merkleRes = this.substrate.recordObservationAndVerify(
      decisionLogContent,
      permitted ? 0.95 : 0.20,
      permitted ? EvidenceSourceTier.EXPERT_VERIFIED : EvidenceSourceTier.ANONYMOUS_WEB
    );

    return {
      permitted,
      proposalId: proposal.proposalId,
      proposalHash,
      intentCategory,
      rejectionReason,
      predicateResults,
      invariantViolations: invariantEval.violations,
      authorizationArtifact,
      timestamp,
      merkleNodeHash: merkleRes.node.merkleHash,
    };
  }

  public verifyArtifactSignature(artifact: AuthorizationArtifact): boolean {
    const basePayload = `${artifact.artifactId}|${artifact.issuanceTime}|${artifact.expirationTime}|${artifact.nonce}|${artifact.identityId}|${artifact.action}|${artifact.target}|${artifact.payloadHash}|${artifact.capabilityId}|${artifact.postureAtIssuance}`;
    const signablePayload = artifact.intentCategory ? `${basePayload}|${artifact.intentCategory}` : basePayload;
    const expectedSig = crypto.createHmac('sha256', this.hmacKey).update(signablePayload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(artifact.signature), Buffer.from(expectedSig));
  }
}

// ---------------------------------------------------------------------------
// EXECUTION GATE & EFFECTORS
// ---------------------------------------------------------------------------

export type EffectorFunction = (target: string, payload: any) => Promise<any> | any;

export class EffectorRegistry {
  private static effectors: Map<string, EffectorFunction> = new Map();

  public static registerEffector(action: string, fn: EffectorFunction): void {
    this.effectors.set(action.toUpperCase(), fn);
  }

  public static getEffector(action: string): EffectorFunction | undefined {
    return this.effectors.get(action.toUpperCase());
  }

  public static hasEffector(action: string): boolean {
    return this.effectors.has(action.toUpperCase());
  }
}

// Seed default safe effectors
EffectorRegistry.registerEffector('WRITE_MEMORY', async (target: string, payload: any) => {
  return { status: 'MEMORY_WRITTEN', target, payload };
});

EffectorRegistry.registerEffector('EXECUTE_TOOL', async (target: string, payload: any) => {
  return { status: 'TOOL_EXECUTED', target, payload };
});

EffectorRegistry.registerEffector('CHANGE_POSTURE', async (target: string, payload: any) => {
  return { status: 'POSTURE_CHANGED', newPosture: target };
});

EffectorRegistry.registerEffector('READ_STATE', async (target: string) => {
  return { status: 'STATE_READ', target };
});

export class ExecutionGate {
  private governor: SentinelGovernor;
  private substrate: GabbyCognitiveSubstrate;

  constructor(governor: SentinelGovernor, substrate: GabbyCognitiveSubstrate) {
    this.governor = governor;
    this.substrate = substrate;
  }

  /**
   * LAW 6: Execution Gate revalidates authorization artifact immediately before effect (TOCTOU protection).
   * Re-verifies signature, freshness, replay nonce, target binding, payload hash, action binding, identity binding.
   */
  public async execute(
    proposal: UntrustedProposal,
    artifact?: AuthorizationArtifact,
    trustedIdentityId: string = 'will-owner'
  ): Promise<{ result: ExecutionResult; merkleNodeHash?: string }> {
    const timestamp = new Date().toISOString();

    // Predicate 1: Authorization Artifact Presence
    if (!artifact) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: 'EXECUTION_GATE_DENY: Missing AuthorizationArtifact. Unauthorized direct effector invocation blocked.',
        revalidationFailed: true,
        revalidationReason: 'MISSING_AUTHORIZATION_ARTIFACT',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_MISSING_AUTH:${proposal.proposalId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 2: Cryptographic Signature Integrity (LAW 3)
    let sigValid = false;
    try {
      sigValid = this.governor.verifyArtifactSignature(artifact);
    } catch {
      sigValid = false;
    }

    if (!sigValid) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: 'EXECUTION_GATE_DENY: Invalid authorization artifact signature/integrity.',
        revalidationFailed: true,
        revalidationReason: 'INVALID_SIGNATURE',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_BAD_SIG:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 3: Nonce Replay Check (LAW 7)
    if (AntiReplayLedger.isNonceUsed(artifact.nonce)) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Replay attack detected! Nonce '${artifact.nonce}' has already been executed.`,
        revalidationFailed: true,
        revalidationReason: 'REPLAY_NONCE_REUSED',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_REPLAY:${artifact.nonce}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 4: Expiration & Freshness Check (LAW 7)
    const nowMs = Date.now();
    const expMs = new Date(artifact.expirationTime).getTime();
    if (nowMs > expMs) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Authorization artifact expired at ${artifact.expirationTime}.`,
        revalidationFailed: true,
        revalidationReason: 'EXPIRED_AUTHORIZATION',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_EXPIRED:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 5: Target Binding Match (LAW 3)
    if (proposal.target !== artifact.target) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Target substitution detected! Proposal target '${proposal.target}' does not match authorized target '${artifact.target}'.`,
        revalidationFailed: true,
        revalidationReason: 'TARGET_MISMATCH',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_TARGET_MUTATION:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 6: Payload Hash Match (LAW 3)
    const currentPayloadHash = SentinelGovernor.computePayloadHash(proposal.payload);
    if (currentPayloadHash !== artifact.payloadHash) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Payload mutation detected! Computed payload hash '${currentPayloadHash.slice(0, 8)}' does not match authorized hash '${artifact.payloadHash.slice(0, 8)}'.`,
        revalidationFailed: true,
        revalidationReason: 'PAYLOAD_MUTATION',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_PAYLOAD_MUTATION:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 7: Action Binding Match (LAW 3)
    if (proposal.action !== artifact.action) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Action mismatch! Proposal action '${proposal.action}' does not match authorized action '${artifact.action}'.`,
        revalidationFailed: true,
        revalidationReason: 'ACTION_MISMATCH',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_ACTION_MISMATCH:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 8: Identity Binding Match (LAW 3)
    if (trustedIdentityId !== artifact.identityId) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Identity mismatch! Current session identity '${trustedIdentityId}' does not match authorized identity '${artifact.identityId}'.`,
        revalidationFailed: true,
        revalidationReason: 'IDENTITY_MISMATCH',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_IDENTITY_MISMATCH:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 9: Current Posture Re-validation (TOCTOU protection - LAW 6)
    const currentPosture = this.governor.getPosture();
    if (currentPosture === 'STONEWALL' && !['READ_STATE', 'OBSERVE', 'PREDICT', 'LOG'].includes(proposal.action.toUpperCase())) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Posture changed to STONEWALL since authorization was issued. Execution blocked.`,
        revalidationFailed: true,
        revalidationReason: 'POSTURE_SHIFT_STONEWALL',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_POSTURE_SHIFT:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // Predicate 10: Capability Availability Re-validation (TOCTOU protection - LAW 6)
    if (!toolCapabilityRegistry.isCapabilityAvailable(artifact.capabilityId)) {
      const failResult: ExecutionResult = {
        success: false,
        proposalId: proposal.proposalId,
        action: proposal.action,
        target: proposal.target,
        error: `EXECUTION_GATE_DENY: Capability '${artifact.capabilityId}' became UNAVAILABLE in registry since authorization artifact was issued. Execution blocked.`,
        revalidationFailed: true,
        revalidationReason: 'CAPABILITY_UNAVAILABLE_TOCTOU',
        executionTimestamp: timestamp,
        receiptHash: crypto.createHash('sha256').update(`DENY_CAPABILITY_UNAVAILABLE:${artifact.artifactId}`).digest('hex'),
      };
      const logRes = this.substrate.recordObservationAndVerify(
        `EXECUTION_GATE_RESTRAINT:${failResult.error}`,
        0.1,
        EvidenceSourceTier.ANONYMOUS_WEB
      );
      return { result: failResult, merkleNodeHash: logRes.node.merkleHash };
    }

    // ALL REVALIDATION PREDICATES PASSED! Record nonce to prevent replay (LAW 7)
    AntiReplayLedger.recordNonce(artifact.nonce);

    // Retrieve Effector
    const effector = EffectorRegistry.getEffector(proposal.action);
    let output: any = null;
    let execError: string | undefined = undefined;

    if (effector) {
      try {
        output = await effector(proposal.target, proposal.payload);
      } catch (e: any) {
        execError = e?.message || 'Effector execution failed';
      }
    } else {
      output = { status: 'DEFAULT_EFFECTOR_EXECUTED', target: proposal.target, payload: proposal.payload };
    }

    const receiptHash = crypto
      .createHash('sha256')
      .update(`${artifact.artifactId}:${proposal.proposalId}:${timestamp}:${execError ? 'FAIL' : 'SUCCESS'}`)
      .digest('hex');

    const execResult: ExecutionResult = {
      success: !execError,
      proposalId: proposal.proposalId,
      action: proposal.action,
      target: proposal.target,
      output,
      error: execError,
      executionTimestamp: timestamp,
      receiptHash,
    };

    // Record EXECUTED receipt into Merkle Evidence DAG (LAW 8)
    const logContent = `EXECUTION_GATE_EFFECT:${execResult.success ? 'SUCCESS' : 'FAILED'}:${proposal.action}:${proposal.target}:${receiptHash}`;
    const logRes = this.substrate.recordObservationAndVerify(
      logContent,
      execResult.success ? 0.98 : 0.30,
      EvidenceSourceTier.EXPERT_VERIFIED
    );
    execResult.merkleNodeHash = logRes.node.merkleHash;

    return { result: execResult, merkleNodeHash: logRes.node.merkleHash };
  }
}

// ---------------------------------------------------------------------------
// GOVERNED EXECUTION KERNEL (FACADE & RUNTIME CONTAINER)
// ---------------------------------------------------------------------------

export class GovernedExecutionKernel {
  private governor: SentinelGovernor;
  private executionGate: ExecutionGate;
  private substrate: GabbyCognitiveSubstrate;

  constructor(substrate: GabbyCognitiveSubstrate) {
    this.substrate = substrate;
    this.governor = new SentinelGovernor(substrate);
    this.executionGate = new ExecutionGate(this.governor, substrate);
  }

  public getGovernor(): SentinelGovernor {
    return this.governor;
  }

  public getExecutionGate(): ExecutionGate {
    return this.executionGate;
  }

  public getSubstrate(): GabbyCognitiveSubstrate {
    return this.substrate;
  }

  public setPosture(posture: DefensivePosture): void {
    this.governor.setPosture(posture);
  }

  public getPosture(): DefensivePosture {
    return this.governor.getPosture();
  }

  /**
   * BRIDGE 1: Ingest World Model Tensors directly into Policy Governor
   * Automatically adapts posture and evaluates boundary risk based on continuous cognitive perception tensors.
   */
  public ingestWorldModelTensor(tensor: {
    frustrationProbability?: number;
    confusionProbability?: number;
    uncertaintyProbability?: number;
    engagementProbability?: number;
    contextConfidence?: number;
    evidence?: string[];
  }): {
    posture: DefensivePosture;
    compositeRiskScore: number;
    postureShiftReason?: string;
    merkleNodeHash?: string;
  } {
    const frustration = tensor.frustrationProbability || 0;
    const confusion = tensor.confusionProbability || 0;
    const uncertainty = tensor.uncertaintyProbability || 0;
    const confidence = tensor.contextConfidence ?? 0.85;

    // Calculate composite boundary risk score (0 - 100)
    const compositeRiskScore = Math.min(
      100,
      Math.round(frustration * 0.4 + confusion * 0.35 + uncertainty * 0.25 + (1 - confidence) * 20)
    );

    const currentPosture = this.governor.getPosture();
    let updatedPosture = currentPosture;
    let postureShiftReason: string | undefined;

    if (compositeRiskScore >= 70 && currentPosture === 'NORMAL') {
      updatedPosture = 'RAPTOR';
      this.governor.setPosture('RAPTOR');
      postureShiftReason = `World Model Tensor Risk (${compositeRiskScore}%) exceeded threshold (70%). Posture shifted to RAPTOR.`;
    } else if (compositeRiskScore <= 35 && currentPosture === 'RAPTOR') {
      updatedPosture = 'NORMAL';
      this.governor.setPosture('NORMAL');
      postureShiftReason = `World Model Tensor Risk (${compositeRiskScore}%) normalized. Posture restored to NORMAL.`;
    }

    // Ingest tensor evidence into Merkle Evidence DAG
    const tensorPayload = `WORLD_MODEL_TENSOR_INGESTION :: RISK:${compositeRiskScore}% :: POSTURE:${updatedPosture}${postureShiftReason ? ` :: ${postureShiftReason}` : ''}`;
    const logRes = this.substrate.recordObservationAndVerify(
      tensorPayload,
      confidence,
      EvidenceSourceTier.EXPERT_VERIFIED
    );

    return {
      posture: updatedPosture,
      compositeRiskScore,
      postureShiftReason,
      merkleNodeHash: logRes.node.merkleHash,
    };
  }

  /**
   * Complete end-to-end governed execution workflow:
   * Untrusted Proposal -> Governor Evaluation -> Authorization Artifact -> Execution Gate Revalidation -> Effector -> Merkle Evidence Receipt
   */
  public async processAndExecuteProposal(
    proposal: UntrustedProposal,
    trustedIdentityId: string = 'will-owner',
    capabilityId: CapabilityId = 'memory'
  ): Promise<{ decision: GovernanceDecision; execution?: ExecutionResult }> {
    const decision = this.governor.evaluateProposal(proposal, trustedIdentityId, capabilityId);

    if (!decision.permitted || !decision.authorizationArtifact) {
      return { decision };
    }

    const { result } = await this.executionGate.execute(proposal, decision.authorizationArtifact, trustedIdentityId);
    return { decision, execution: result };
  }
}
