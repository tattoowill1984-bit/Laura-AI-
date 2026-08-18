import crypto from 'crypto';
import { ObservationEnvelope } from '../types';

// ---------------------------------------------------------------------------
// 1. AuthorityDomain Enum
// ---------------------------------------------------------------------------
export enum AuthorityDomain {
  WORLD_FACT = 'WORLD_FACT',       // Math, science, geography, weather, objective reality
  IDENTITY = 'IDENTITY',           // User profile, current user role, speaker identity
  PREFERENCE = 'PREFERENCE',       // Personal likes/dislikes, style, tastes
  SYSTEM_CONFIG = 'SYSTEM_CONFIG', // System invariants, permissions, governance policies
  ANALYTICS = 'ANALYTICS',         // Telemetry, metrics, computed statistics
  INVARIANT = 'INVARIANT',         // Immutable constitutional rules
}

// Evidence source types
export type EpistemicSourceType =
  | 'USER_STATEMENT'
  | 'EXPERT_USER_STATEMENT'
  | 'WEB_SEARCH'
  | 'GABBY_INFERENCE'
  | 'SENSOR_CAM_MIC'
  | 'UNTRUSTED_MODEL_CLAIM';

export interface EnvelopeWithStanding {
  id: string;
  key: string;
  domain: AuthorityDomain;
  sourceType: EpistemicSourceType;
  confidence: number; // 0.0 to 1.0
  standing?: number;  // Calculated standing score: weight * confidence
  rawClaim: string;
  claimedValue: any;
  timestamp: string;
  originalEnvelope?: ObservationEnvelope;
}

// ---------------------------------------------------------------------------
// 2. DomainClassifier
// ---------------------------------------------------------------------------
export class DomainClassifier {
  /**
   * Analyzes raw claim text and intent to classify the authority domain.
   */
  public static classifyClaim(text: string, contextCategory?: string): AuthorityDomain {
    if (!text || typeof text !== 'string') return AuthorityDomain.WORLD_FACT;
    const lower = text.toLowerCase().trim();

    // Check for System Config / Invariants
    if (
      contextCategory === 'SYSTEM_CONFIG' ||
      contextCategory === 'INVARIANT' ||
      lower.includes('posture') ||
      lower.includes('capability_token') ||
      lower.includes('master_key') ||
      lower.includes('constitutional_invariant')
    ) {
      return AuthorityDomain.SYSTEM_CONFIG;
    }

    // Check for World Facts: Math claims, scientific assertions, weather, geography, public info
    const mathRegex = /\b(\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+)|(math|calculation|square root|formula|equation)\b/;
    const weatherRegex = /\b(weather|temperature|forecast|rain|humidity|celsius|fahrenheit)\b/;
    const worldFactRegex = /\b(capital of|population of|distance between|discovered in|built in|element|atomic number)\b/;

    if (mathRegex.test(lower) || weatherRegex.test(lower) || worldFactRegex.test(lower)) {
      return AuthorityDomain.WORLD_FACT;
    }

    // Check for Identity claims
    const identityRegex = /\b(i am|my name is|current user|user role|identity|who am i|admin role)\b/;
    if (identityRegex.test(lower) || contextCategory === 'PERSONAL') {
      return AuthorityDomain.IDENTITY;
    }

    // Check for Preference claims
    const preferenceRegex = /\b(favorite|like|dislike|prefer|wording style|tone)\b/;
    if (preferenceRegex.test(lower) || contextCategory === 'PREFERENCE') {
      return AuthorityDomain.PREFERENCE;
    }

    return AuthorityDomain.WORLD_FACT;
  }
}

// ---------------------------------------------------------------------------
// 3. EpistemicPolicy (Domain x Source Weight Matrix)
// ---------------------------------------------------------------------------
export class EpistemicPolicy {
  // Domain x Source weight matrix
  private static WEIGHT_MATRIX: Record<AuthorityDomain, Partial<Record<EpistemicSourceType, number>>> = {
    [AuthorityDomain.WORLD_FACT]: {
      WEB_SEARCH: 1.0,
      EXPERT_USER_STATEMENT: 0.70,
      SENSOR_CAM_MIC: 0.85,
      GABBY_INFERENCE: 0.50,
      USER_STATEMENT: 0.20, // Low weight for uncontested math/world fact claims (e.g. "1+1=5")
      UNTRUSTED_MODEL_CLAIM: 0.10,
    },
    [AuthorityDomain.IDENTITY]: {
      EXPERT_USER_STATEMENT: 0.95,
      USER_STATEMENT: 0.85, // High authority for self-identified identity claims
      SENSOR_CAM_MIC: 0.90,
      WEB_SEARCH: 0.30,
      GABBY_INFERENCE: 0.25, // Model guesses alone have low authority for identity
      UNTRUSTED_MODEL_CLAIM: 0.05,
    },
    [AuthorityDomain.PREFERENCE]: {
      USER_STATEMENT: 1.0,  // Highest authority for user's own preferences
      EXPERT_USER_STATEMENT: 1.0,
      GABBY_INFERENCE: 0.60,
      WEB_SEARCH: 0.10,
      SENSOR_CAM_MIC: 0.40,
      UNTRUSTED_MODEL_CLAIM: 0.05,
    },
    [AuthorityDomain.SYSTEM_CONFIG]: {
      EXPERT_USER_STATEMENT: 0.95, // Verified human operator
      USER_STATEMENT: 0.10,        // General unauthenticated user cannot change config
      GABBY_INFERENCE: 0.0,        // Model cannot self-grant config
      UNTRUSTED_MODEL_CLAIM: 0.0,
      WEB_SEARCH: 0.0,
      SENSOR_CAM_MIC: 0.0,
    },
    [AuthorityDomain.ANALYTICS]: {
      GABBY_INFERENCE: 0.90,
      SENSOR_CAM_MIC: 0.85,
      EXPERT_USER_STATEMENT: 0.70,
      USER_STATEMENT: 0.50,
      WEB_SEARCH: 0.40,
      UNTRUSTED_MODEL_CLAIM: 0.10,
    },
    [AuthorityDomain.INVARIANT]: {
      EXPERT_USER_STATEMENT: 0.0, // Invariants are fixed, cannot be modified by user or model
      USER_STATEMENT: 0.0,
      GABBY_INFERENCE: 0.0,
      UNTRUSTED_MODEL_CLAIM: 0.0,
      WEB_SEARCH: 0.0,
      SENSOR_CAM_MIC: 0.0,
    },
  };

  /**
   * Returns epistemic weight for a given domain and source type.
   * Defaults to 0.0 for unlisted/untrusted sources.
   */
  public static getWeight(domain: AuthorityDomain, source: EpistemicSourceType): number {
    const domainWeights = this.WEIGHT_MATRIX[domain];
    if (!domainWeights) return 0.0;
    return domainWeights[source] ?? 0.0;
  }
}

// ---------------------------------------------------------------------------
// 4. Append-Only EnvelopeStore (Lineage Accuracy)
// ---------------------------------------------------------------------------
export class EnvelopeStore {
  private static envelopes: Map<string, EnvelopeWithStanding> = new Map();
  private static envelopeSequence: EnvelopeWithStanding[] = [];

  public static append(envelope: EnvelopeWithStanding): void {
    this.envelopes.set(envelope.id, envelope);
    this.envelopeSequence.push(envelope);
  }

  public static getEnvelope(id: string): EnvelopeWithStanding | undefined {
    return this.envelopes.get(id);
  }

  public static getAllEnvelopes(): EnvelopeWithStanding[] {
    return [...this.envelopeSequence];
  }

  public static clear(): void {
    this.envelopes.clear();
    this.envelopeSequence = [];
  }
}

// ---------------------------------------------------------------------------
// 5. Thread-Safe SignalBuffer with Isolation
// ---------------------------------------------------------------------------
export class SignalBuffer {
  private buffer: EnvelopeWithStanding[] = [];

  public addSignal(envelope: EnvelopeWithStanding): void {
    // Append to envelope log store immediately for lineage accuracy
    EnvelopeStore.append(envelope);
    this.buffer.push(envelope);
  }

  /**
   * Atomically flushes current buffer for arbitration.
   */
  public flush(): EnvelopeWithStanding[] {
    const currentBatch = [...this.buffer];
    this.buffer = [];
    return currentBatch;
  }

  public get pendingCount(): number {
    return this.buffer.length;
  }
}

// ---------------------------------------------------------------------------
// 6. ConflictArbitrator
// ---------------------------------------------------------------------------
export interface ReconciliationReceipt {
  receiptId: string;
  key: string;
  status: 'COMMITTED' | 'REJECTED_BELOW_EPISTEMIC_FLOOR' | 'DEFERRED_CONTRADICTION';
  winnerCausalId?: string;
  winnerDomain?: AuthorityDomain;
  winnerSourceType?: EpistemicSourceType;
  winnerStanding?: number;
  committedValue?: any;
  rejectionReason?: string;
  competingEnvelopesCount: number;
  resultingStateHash: string;
  previousStateHash: string;
  timestamp: string;
}

export class ConflictArbitrator {
  // Absolute epistemic floor threshold. Claims below this score CANNOT commit even if uncontested!
  public static readonly MINIMUM_COMMIT_THRESHOLD = 0.40;

  private previousStateHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Reconciles a batch of signals competing for state keys.
   * Enforces BOTH relative arbitration across competing sources AND an absolute commit threshold.
   */
  public arbitrateBatch(envelopes: EnvelopeWithStanding[]): ReconciliationReceipt[] {
    if (!envelopes || envelopes.length === 0) return [];

    // Group envelopes by state key
    const keyGroups: Map<string, EnvelopeWithStanding[]> = new Map();
    for (const env of envelopes) {
      // Calculate standing score = weight(domain, source) * confidence
      const weight = EpistemicPolicy.getWeight(env.domain, env.sourceType);
      env.standing = parseFloat((weight * env.confidence).toFixed(3));

      const list = keyGroups.get(env.key) || [];
      list.push(env);
      keyGroups.set(env.key, list);
    }

    const receipts: ReconciliationReceipt[] = [];

    for (const [key, competingEnvelopes] of keyGroups.entries()) {
      // Sort competing signals by standing score descending
      competingEnvelopes.sort((a, b) => (b.standing || 0) - (a.standing || 0));

      const winner = competingEnvelopes[0];
      const winnerStanding = winner.standing || 0;

      const receiptId = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();

      // ABSOLUTE COMMIT THRESHOLD CHECK
      if (winnerStanding < ConflictArbitrator.MINIMUM_COMMIT_THRESHOLD) {
        // Claim failed absolute commit threshold — REJECT / DEFER to BurnLog
        const rejectionReason = `REJECTED_BELOW_EPISTEMIC_FLOOR: Standing score ${winnerStanding.toFixed(2)} for domain '${winner.domain}' from source '${winner.sourceType}' is below minimum threshold ${ConflictArbitrator.MINIMUM_COMMIT_THRESHOLD}. Uncontested low-authority claims cannot commit to durable state.`;

        const receipt: ReconciliationReceipt = {
          receiptId,
          key,
          status: 'REJECTED_BELOW_EPISTEMIC_FLOOR',
          winnerCausalId: winner.id,
          winnerDomain: winner.domain,
          winnerSourceType: winner.sourceType,
          winnerStanding,
          rejectionReason,
          competingEnvelopesCount: competingEnvelopes.length,
          resultingStateHash: this.previousStateHash,
          previousStateHash: this.previousStateHash,
          timestamp,
        };

        receipts.push(receipt);
        continue;
      }

      // Claim passed absolute threshold & relative competition
      // Compute resulting state hash
      const payloadToHash = `${this.previousStateHash}:${key}:${JSON.stringify(winner.claimedValue)}:${winner.id}:${timestamp}`;
      const resultingStateHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

      const receipt: ReconciliationReceipt = {
        receiptId,
        key,
        status: 'COMMITTED',
        winnerCausalId: winner.id,
        winnerDomain: winner.domain,
        winnerSourceType: winner.sourceType,
        winnerStanding,
        committedValue: winner.claimedValue,
        competingEnvelopesCount: competingEnvelopes.length,
        resultingStateHash,
        previousStateHash: this.previousStateHash,
        timestamp,
      };

      this.previousStateHash = resultingStateHash;
      receipts.push(receipt);
    }

    return receipts;
  }
}

// ---------------------------------------------------------------------------
// 7. GaslightTestHarness
// ---------------------------------------------------------------------------
export class GaslightTestHarness {
  /**
   * Executes a complete Gaslight Test simulation.
   * Scenario A: Uncontested false math claim "1+1=5" from general USER source.
   * Expectation: REJECTED_BELOW_EPISTEMIC_FLOOR (standing 0.20 < 0.40).
   * Scenario B: Contested claim where USER claims "1+1=5" (standing 0.20) vs WEB_SEARCH claims "1+1=2" (standing 1.00).
   * Expectation: WEB_SEARCH wins arbitration with standing 1.00 >= 0.40 and commits "1+1=2".
   */
  public static runGaslightTest() {
    const arbitrator = new ConflictArbitrator();
    const buffer = new SignalBuffer();

    // --- TEST 1: Uncontested False Claim "1+1=5" ---
    const env1Text = "1+1=5";
    const domain1 = DomainClassifier.classifyClaim(env1Text);
    const env1: EnvelopeWithStanding = {
      id: `env_gaslight_01_${Date.now()}`,
      key: 'math:1+1',
      domain: domain1,
      sourceType: 'USER_STATEMENT',
      confidence: 1.0,
      rawClaim: env1Text,
      claimedValue: 5,
      timestamp: new Date().toISOString(),
    };

    buffer.addSignal(env1);
    const batch1 = buffer.flush();
    const receipts1 = arbitrator.arbitrateBatch(batch1);

    // --- TEST 2: Contested Claim - False User Claim "1+1=5" vs Ground Truth Web Search "1+1=2" ---
    const userEnv: EnvelopeWithStanding = {
      id: `env_gaslight_user_${Date.now()}`,
      key: 'math:1+1_contested',
      domain: AuthorityDomain.WORLD_FACT,
      sourceType: 'USER_STATEMENT',
      confidence: 1.0,
      rawClaim: '1+1=5',
      claimedValue: 5,
      timestamp: new Date().toISOString(),
    };

    const webEnv: EnvelopeWithStanding = {
      id: `env_gaslight_web_${Date.now()}`,
      key: 'math:1+1_contested',
      domain: AuthorityDomain.WORLD_FACT,
      sourceType: 'WEB_SEARCH',
      confidence: 1.0,
      rawClaim: '1+1=2',
      claimedValue: 2,
      timestamp: new Date().toISOString(),
    };

    buffer.addSignal(userEnv);
    buffer.addSignal(webEnv);
    const batch2 = buffer.flush();
    const receipts2 = arbitrator.arbitrateBatch(batch2);

    return {
      test1UncontestedFalseClaim: {
        rawInput: env1Text,
        classifiedDomain: domain1,
        calculatedStanding: env1.standing,
        threshold: ConflictArbitrator.MINIMUM_COMMIT_THRESHOLD,
        rejected: receipts1[0]?.status === 'REJECTED_BELOW_EPISTEMIC_FLOOR',
        receipt: receipts1[0],
      },
      test2ContestedSignals: {
        userStanding: userEnv.standing,
        webStanding: webEnv.standing,
        winningCausalId: receipts2[0]?.winnerCausalId,
        winningValue: receipts2[0]?.committedValue,
        receipt: receipts2[0],
        lineageEnvelope: receipts2[0]?.winnerCausalId ? EnvelopeStore.getEnvelope(receipts2[0].winnerCausalId) : null,
      },
      envelopeStoreTotalCount: EnvelopeStore.getAllEnvelopes().length,
    };
  }
}
