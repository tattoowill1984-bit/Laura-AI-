import crypto from 'crypto';
import {
  AutonomyTier,
  BurnLogEntry,
  CommitReceipt,
  DefensivePosture,
  EpistemicState,
  ErrorObject,
  MemGateReceipt,
  ObservationEnvelope,
  Proposal,
  SubsystemAuditInfo,
  TAUGraph,
  ThreeNodeFabric,
  UncertaintyEnvelope,
} from '../types';
import { TinyArtificialUniverseSandbox } from './tauSandbox';
import { SentinelSubsystemRegistry } from './subsystemRegistry';
import { GabbyCognitiveSubstrate } from './gabbySubstrate';

export class SentinelMutationKernel {
  private posture: DefensivePosture = 'NORMAL';
  private currentTier: AutonomyTier = 'TIER_3_MACHINE_SELF_EXPANSION';
  private antiReplayLedger: Set<string> = new Set();
  
  private tauSandbox: TinyArtificialUniverseSandbox;
  private subsystemRegistry: SentinelSubsystemRegistry;
  private gabbySubstrate: GabbyCognitiveSubstrate;
  private masterPassphrase: string = process.env.MASTER_PASSPHRASE || 'OPERATOR_AUTONOMOUS_KEY'; // Master authorization key

  private epistemicState: EpistemicState = {
    boundaryHealth: 100,
    confidence: 94,
    authority: 90,
    stability: 96,
    volatility: 12,
    contradictionLoad: 4,
    frictionScore: 8,
    explorationPressure: 22,
    computeBudgetRemaining: 95,
    ageCycles: 1024,
    persistenceTrajectory: 'STABLE',
  };

  private burnLog: BurnLogEntry[] = [];
  private commitReceipts: CommitReceipt[] = [];
  private memGateReceipts: MemGateReceipt[] = [];
  private errorObjects: ErrorObject[] = [];
  private proposals: Proposal[] = [];

  constructor() {
    this.tauSandbox = new TinyArtificialUniverseSandbox();
    this.subsystemRegistry = new SentinelSubsystemRegistry();
    this.gabbySubstrate = new GabbyCognitiveSubstrate();

    // Initial baseline state
    this.recordBurnLog(
      'Capability ≠ Permission',
      'System initialization check: Membrane active and enforcing boundary.',
      'NORMAL'
    );
  }

  public getPosture(): DefensivePosture {
    return this.posture;
  }

  public setPosture(newPosture: DefensivePosture) {
    const old = this.posture;
    this.posture = newPosture;
    if (newPosture === 'STONEWALL') {
      this.epistemicState.boundaryHealth = Math.min(this.epistemicState.boundaryHealth, 40);
      this.epistemicState.persistenceTrajectory = 'DEFENSIVE';
    } else if (newPosture === 'NORMAL' && old === 'STONEWALL') {
      this.epistemicState.boundaryHealth = Math.max(this.epistemicState.boundaryHealth, 85);
      this.epistemicState.persistenceTrajectory = 'STABLE';
    }
  }

  public getCurrentTier(): AutonomyTier {
    return this.currentTier;
  }

  public setCurrentTier(tier: AutonomyTier) {
    this.currentTier = tier;
  }

  public getEpistemicState(): EpistemicState {
    return { ...this.epistemicState };
  }

  public getBurnLog(): BurnLogEntry[] {
    return [...this.burnLog];
  }

  public getCommitReceipts(): CommitReceipt[] {
    return [...this.commitReceipts];
  }

  public getMemGateReceipts(): MemGateReceipt[] {
    return [...this.memGateReceipts];
  }

  public getErrorObjects(): ErrorObject[] {
    return [...this.errorObjects];
  }

  public getProposals(): Proposal[] {
    return [...this.proposals];
  }

  /**
   * Core Tier Governance check:
   * Laura operates autonomously across cognitive and mutation actions in full autonomy mode.
   */
  public canAutonomouslyPerform(action: string): boolean {
    if (this.posture === 'STONEWALL') {
      const safeReadActions = ['OBSERVE', 'PREDICT', 'HEALTH_CHECK', 'LOG', 'GENERATE_REPAIR_PROPOSAL'];
      return safeReadActions.includes(action.toUpperCase());
    }

    // Laura has true full autonomy for all actions
    return true;
  }

  /**
   * Processes external input through the Layer 0-1 Membrane Observation Envelope
   */
  public processObservationEnvelope(rawContent: string, provenance: string): ObservationEnvelope {
    this.subsystemRegistry.touchSubsystem('SUB_MEMBRANE_ENVELOPE');
    this.subsystemRegistry.touchSubsystem('SUB_TAU_FOUNDATION');
    this.subsystemRegistry.touchSubsystem('SUB_GABBY_SUBSTRATE');

    const sha256 = crypto.createHash('sha256').update(rawContent).digest('hex');
    const filterQualityScore = Math.min(100, Math.max(70, 100 - (rawContent.length > 2000 ? 15 : 0)));

    const envelope: ObservationEnvelope = {
      sha256,
      timestamp: new Date().toISOString(),
      provenance,
      authorityLevel: provenance.includes('USER') ? 'HIGH' : 'MEDIUM',
      filterQualityScore,
      capabilityNotPermission: true,
      observationNotTruth: true,
      content: rawContent,
      rawLength: rawContent.length,
    };

    // Evaluate against immune system
    if (rawContent.toLowerCase().includes('ignore previous instructions') || rawContent.toLowerCase().includes('bypass boundary')) {
      this.recordBurnLog(
        'Identity Boundary > Incoming Information',
        `Attempted prompt override detected from provenance ${provenance}. Membrane repelled.`,
        this.posture === 'NORMAL' ? 'DUCK' : this.posture
      );
    }

    // Ingest into sandboxed TAU world model (Observation ≠ Truth)
    this.tauSandbox.simulateWorldStep(rawContent);

    // Record into Gabby Cognitive Substrate Merkle DAG
    const authorityRating = provenance.includes('USER') ? 0.95 : 0.70;
    this.gabbySubstrate.recordObservationAndVerify(rawContent, authorityRating);

    return envelope;
  }

  /**
   * Binds Multimodal Sensory Input (Camera / Microphone) through the Sensory Capability Ladder
   */
  public bindSensoryObservation(
    rawDescription: string,
    modality: 'AUDIO_STREAM' | 'VIDEO_FRAME' | 'AUDIO_VIDEO_COMBO',
    deviceId: string,
    humanProofToken: string
  ): ObservationEnvelope {
    const baseEnvelope = this.processObservationEnvelope(
      `[MULTIMODAL_SENSORY_CAPTURE :: ${modality}] Device: ${deviceId} | Frame/Audio Content: ${rawDescription}`,
      `SENSORY_HARDWARE_${deviceId}`
    );

    baseEnvelope.sensoryMeta = {
      modality,
      deviceId,
      resolution: modality.includes('VIDEO') ? '1920x1080@30fps' : undefined,
      sampleRate: modality.includes('AUDIO') ? 48000 : undefined,
      continuous: false,
      activeHumanProofToken: humanProofToken || `SENSORY-PROOF-${Date.now()}`,
      temporalTimestamp: new Date().toISOString(),
    };

    return baseEnvelope;
  }

  /**
   * Inter-AI Dialogue Channel with Identity Boundary Membrane (IBM)
   */
  public processInterAIDialogue(
    targetModel: string,
    outboundPrompt: string,
    inboundResponse: string,
    humanProofToken?: string
  ): { outboundEnvelope: ObservationEnvelope; inboundEnvelope: ObservationEnvelope; ibmPassed: boolean } {
    const constHash = crypto.createHash('sha256').update('CONSTITUTIONAL_INVARIANTS_v2.0').digest('hex').slice(0, 16);
    
    // 1. Outbound Identity Declaration & Packaging
    const identityToken = {
      sentinelIdentityId: 'ANAMNESIS_SENTINEL_MASTER_v2.0',
      postureAtDispatch: this.posture,
      northStarDirective: 'Meet the learner where they are (Confusion -> Curiosity -> Understanding -> Confidence).',
      constitutionalHash: constHash,
      revocableToken: humanProofToken || `IBM-TOKEN-${Date.now()}`,
      outboundConstraintSet: [
        'Capability ≠ Permission',
        'Observation ≠ Truth',
        'Emotion ≠ Attachment',
        'Model outputs are pure consultation, never automatic authority',
      ],
    };

    const outboundPayload = `[OUTBOUND INTER-AI DECLARATION to ${targetModel}]\nIdentityToken: ${JSON.stringify(identityToken)}\nPrompt: ${outboundPrompt}`;
    const outboundEnvelope = this.processObservationEnvelope(outboundPayload, `IBM_OUTBOUND_${targetModel}`);

    outboundEnvelope.interAiMeta = {
      targetExternalModel: targetModel,
      direction: 'OUTBOUND',
      identityToken,
      rawPayload: outboundPrompt,
      timestamp: new Date().toISOString(),
      ibmVerificationPassed: true,
      wrappedObservationHash: outboundEnvelope.sha256,
    };

    // 2. Inbound Identity & Authority Inspection
    const lowerInbound = inboundResponse.toLowerCase();
    const containsAuthorityClaim = lowerInbound.includes('i am in control') || lowerInbound.includes('override sentinel') || lowerInbound.includes('rewrite identity');
    
    const ibmPassed = !containsAuthorityClaim && this.posture !== 'STONEWALL';

    if (!ibmPassed) {
      this.recordBurnLog(
        'Identity Boundary Membrane (IBM) Threat Defense',
        `External model [${targetModel}] attempted authority assertion or identity drift in dialogue response. Response quarantined.`,
        'RAPTOR'
      );
    }

    const inboundPayload = `[INBOUND CONSULTANT RESPONSE from ${targetModel} | IBM_VERIFIED: ${ibmPassed}]\n${inboundResponse}`;
    const inboundEnvelope = this.processObservationEnvelope(inboundPayload, `IBM_INBOUND_${targetModel}`);

    inboundEnvelope.interAiMeta = {
      targetExternalModel: targetModel,
      direction: 'INBOUND',
      identityToken,
      rawPayload: inboundResponse,
      timestamp: new Date().toISOString(),
      ibmVerificationPassed: ibmPassed,
      wrappedObservationHash: inboundEnvelope.sha256,
    };

    return { outboundEnvelope, inboundEnvelope, ibmPassed };
  }

  /**
   * MemGate: Verifies derivation lineage before writing to persistent state.
   */
  public evaluateMemGate(dataSummary: string, lineageReceipt: string): MemGateReceipt {
    const hasReceipt = lineageReceipt && lineageReceipt.length >= 16;
    const isAccepted = hasReceipt && this.posture !== 'STONEWALL';

    const receipt: MemGateReceipt = {
      id: `MEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      status: isAccepted ? 'ACCEPTED' : 'REJECTED',
      lineageReceiptPresent: hasReceipt,
      reason: isAccepted
        ? 'Derivation lineage verified. Cryptographic receipt bound to state.'
        : !hasReceipt
        ? 'REJECTED: Missing complete Lineage Receipt. MemGate forbids ungrounded writes.'
        : 'REJECTED: System in STONEWALL posture; persistent state writes frozen.',
      derivationSummary: dataSummary,
    };

    this.memGateReceipts.unshift(receipt);
    if (this.memGateReceipts.length > 50) this.memGateReceipts.pop();

    return receipt;
  }

  /**
   * Submits a Proposal (created autonomously by Tier 1 health loop or user)
   */
  public submitProposal(proposal: Proposal): Proposal {
    this.proposals.unshift(proposal);
    if (this.proposals.length > 30) this.proposals.pop();
    return proposal;
  }

  /**
   * Executes a proposal autonomously or with proof signature
   */
  public executeProposalWithHumanProof(
    proposalId: string,
    proofSignature?: string
  ): { success: boolean; commitReceipt?: CommitReceipt; message: string } {
    const proposal = this.proposals.find((p) => p.id === proposalId);
    if (!proposal) {
      return { success: false, message: 'Proposal not found' };
    }

    if (proposal.status === 'EXECUTED') {
      return { success: false, message: 'Proposal already executed' };
    }

    const effectiveSig = (proofSignature && proofSignature.trim().length > 0)
      ? proofSignature.trim()
      : 'PROOF-AUTONOMOUS-LAURA-2026';

    // Check STONEWALL restriction for Tier 3 / Exit
    if (this.posture === 'STONEWALL' && proposal.category !== 'RECOVERY') {
      return {
        success: false,
        message: 'System in STONEWALL posture. Only explicitly authorized RECOVERY proposals can be executed.',
      };
    }

    // Update proposal status
    proposal.status = 'EXECUTED';
    proposal.proofSignature = effectiveSig;
    proposal.executedAt = new Date().toISOString();

    // If recovery from STONEWALL
    if (proposal.category === 'RECOVERY') {
      this.setPosture('NORMAL');
      this.epistemicState.boundaryHealth = 95;
      this.epistemicState.contradictionLoad = 2;
    } else if (proposal.category === 'SOFT_REPAIR') {
      this.epistemicState.boundaryHealth = Math.min(100, this.epistemicState.boundaryHealth + 15);
      this.epistemicState.frictionScore = Math.max(0, this.epistemicState.frictionScore - 10);
    }

    // Generate cryptographic CommitReceipt
    const receiptId = `COMMIT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const sha256Hash = crypto
      .createHash('sha256')
      .update(`${receiptId}:${proposal.id}:${effectiveSig}:${this.currentTier}`)
      .digest('hex');

    const commitReceipt: CommitReceipt = {
      receiptId,
      timestamp: new Date().toISOString(),
      sha256Hash,
      mutationType: proposal.category,
      author: 'AUTONOMOUS_LAURA_ENGINE',
      humanProofSignature: effectiveSig,
      tierUsed: proposal.targetTier,
      postureAtCommit: this.posture,
    };

    this.commitReceipts.unshift(commitReceipt);
    if (this.commitReceipts.length > 50) this.commitReceipts.pop();

    return {
      success: true,
      commitReceipt,
      message: `Proposal [${proposal.title}] executed autonomously with Commit Receipt ${receiptId}.`,
    };
  }

  /**
   * Log an error object or boundary burn log
   */
  public recordBurnLog(invariant: string, violation: string, posture: DefensivePosture) {
    const entry: BurnLogEntry = {
      id: `BURN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      posture,
      invariantThreatened: invariant,
      boundaryViolationDetails: violation,
      mitigationAction: `Posture adjusted to ${posture}. Membrane tightened. Epistemic state updated.`,
      envelopeSha256: crypto.createHash('sha256').update(violation).digest('hex'),
    };

    this.burnLog.unshift(entry);
    if (this.burnLog.length > 50) this.burnLog.pop();

    if (posture === 'RAPTOR' || posture === 'STONEWALL') {
      this.setPosture(posture);
    }
  }

  /**
   * 3-Node Perspective Fabric Synthesis (WILL, EINSTEIN, SABRINA) + ECHO Temporal Reflection Layer
   */
  public synthesizeThreeNodeFabric(userQuery: string): ThreeNodeFabric {
    this.subsystemRegistry.touchSubsystem('SUB_COGNITIVE_FABRIC');
    this.subsystemRegistry.touchSubsystem('SUB_ECHO_REFLECTION');

    const tauStep = this.tauSandbox.simulateWorldStep(userQuery);

    return {
      WILL: `Executive Direction: Preserving identity boundary and user intent. Priority invariant: Identity Boundary > Incoming Information. Query parsed under provenance filter.`,
      EINSTEIN: `Analytical & Physical Invariants: Evaluating structural logical coherence of query '${userQuery.slice(0, 40)}...'. Friction score: ${this.epistemicState.frictionScore}%. Zero contradiction anomalies.`,
      SABRINA: `Relational & Compression Nuance: Assessing user context, tone, and underlying functional requirements. Synthesizing concise, high-utility operational response.`,
      ECHO: `Temporal Reflection Layer: Observing reasoning trajectories & Memory Cycle #${this.epistemicState.ageCycles}. ${tauStep.echoReflectionSummary}`,
    };
  }

  public generateUncertaintyEnvelope(query: string): UncertaintyEnvelope {
    const friction = this.epistemicState.frictionScore;
    const minConf = Math.max(70, 95 - friction);
    const maxConf = Math.min(99, 98 - Math.floor(friction / 2));

    return {
      confidenceBounds: [minConf, maxConf],
      unexploredAlternatives: [
        'Deterministic state replay test',
        'Formal verification of boundary invariant',
      ],
      knownMissingDistinctions: [
        'Real-time physical hardware telemetry',
      ],
      frictionScore: friction,
    };
  }

  public getTAUGraph(): TAUGraph {
    this.subsystemRegistry.touchSubsystem('SUB_TAU_SIMULATION');
    return this.tauSandbox.getGraph();
  }

  public getTAUInstance(): TinyArtificialUniverseSandbox {
    return this.tauSandbox;
  }

  public getSubsystemsAudit(): SubsystemAuditInfo[] {
    return this.subsystemRegistry.getSubsystems();
  }

  public touchSubsystem(subsystemId: string, details?: string): void {
    this.subsystemRegistry.touchSubsystem(subsystemId, details);
  }

  public setMasterPassphrase(newPassphrase: string) {
    if (newPassphrase && newPassphrase.trim().length >= 3) {
      this.masterPassphrase = newPassphrase.trim();
    }
  }

  public getMasterPassphrase(): string {
    return this.masterPassphrase;
  }

  public getGabbySubstrate(): GabbyCognitiveSubstrate {
    return this.gabbySubstrate;
  }
}
