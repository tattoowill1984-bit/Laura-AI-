import { HealthMetrics, Proposal } from '../types';
import { SentinelMutationKernel } from './kernel';

export class AutonomousHealthLoop {
  private kernel: SentinelMutationKernel;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startTime: number = Date.now();
  private lastRunTime: string = new Date().toISOString();

  // Metrics state
  private processHealth: number = 98;
  private memoryUsageMb: number = 42.5;
  private reasoningModelStatus: 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE' = 'HEALTHY';
  private proposalLatencyMs: number = 120;
  private hashIntegrity: 'VERIFIED' | 'MISMATCH' = 'VERIFIED';

  constructor(kernel: SentinelMutationKernel) {
    this.kernel = kernel;
  }

  public start(intervalMs: number = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = Date.now();

    this.intervalId = setInterval(() => {
      this.runHealthCycle();
    }, intervalMs);

    console.log(`[AutonomousHealthLoop] Background monitoring initialized (interval: ${intervalMs}ms).`);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[AutonomousHealthLoop] Background monitoring stopped.');
  }

  public runHealthCycle(): HealthMetrics {
    this.lastRunTime = new Date().toISOString();

    // 1. Simulate telemetry & checks
    // Random minor fluctuation or simulated degradation
    const memoryFluctuation = (Math.random() - 0.5) * 2;
    this.memoryUsageMb = Math.max(30, Math.min(120, this.memoryUsageMb + memoryFluctuation));
    this.proposalLatencyMs = Math.max(80, Math.min(400, Math.floor(120 + Math.random() * 50)));

    const posture = this.kernel.getPosture();
    const currentTier = this.kernel.getCurrentTier();
    const pendingProposals = this.kernel.getProposals().filter((p) => p.status === 'PROPOSAL_PENDING_HUMAN_PROOF');

    // Verify Tier 0 / Tier 1 autonomy rule
    const canSoftMaintain = this.kernel.canAutonomouslyPerform('HEALTH_CHECK');
    if (!canSoftMaintain) {
      console.warn('[AutonomousHealthLoop] Autonomy restricted by current posture or tier.');
    }

    // 2. Autonomous Soft-Repair proposal trigger condition:
    // If posture is RAPTOR or boundary health < 70 and no active repair proposal exists
    const epistemic = this.kernel.getEpistemicState();
    if (
      (posture === 'RAPTOR' || epistemic.boundaryHealth < 70) &&
      !pendingProposals.some((p) => p.category === 'SOFT_REPAIR' || p.category === 'RECOVERY')
    ) {
      this.emitAutonomousRepairProposal(
        'SOFT_REPAIR',
        'Autonomous Sentinel Boundary Stabilization',
        `Boundary health dropped to ${epistemic.boundaryHealth}%. Autonomous Health Loop detected degradation and generated a soft-repair proposal requiring human proof.`,
        'TIER_1_SOFT_MAINTENANCE'
      );
    }

    // If posture is STONEWALL and no recovery proposal exists
    if (
      posture === 'STONEWALL' &&
      !pendingProposals.some((p) => p.category === 'RECOVERY')
    ) {
      this.emitAutonomousRepairProposal(
        'RECOVERY',
        'Emergency Recovery from STONEWALL Posture',
        'System locked in STONEWALL posture due to high contradiction load or security isolation. The Autonomous Health Loop has compiled a recovery package requiring human authorization proof.',
        'TIER_3_MACHINE_SELF_EXPANSION'
      );
    }

    return this.getHealthMetrics();
  }

  /**
   * Generates a high-quality PROPOSAL_PENDING_HUMAN_PROOF recovery or soft-repair proposal.
   * Notice: The loop ONLY emits the proposal. It NEVER executes it itself!
   */
  public emitAutonomousRepairProposal(
    category: 'RECOVERY' | 'SOFT_REPAIR',
    title: string,
    description: string,
    targetTier: any
  ): Proposal {
    const proposalId = `PROP-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const proposal: Proposal = {
      id: proposalId,
      timestamp: new Date().toISOString(),
      title,
      description,
      category,
      targetTier,
      status: 'PROPOSAL_PENDING_HUMAN_PROOF',
      generatedBy: 'AUTONOMOUS_HEALTH_LOOP',
      fabric: {
        WILL: 'Autonomous Health Loop: Identified boundary strain. Proposing structured repair package under Tier 1 governance.',
        EINSTEIN: 'Invariance Analysis: Recovery pathway preserves all historical state anchors without resetting lineage ledger.',
        SABRINA: 'Relational Triage: Rebalancing compute allocation and dampening volatility to restore operational fluidity.',
        ECHO: 'Derivation Trace: Proposal registered in MemGate. Awaiting HumanAuthorizationProof for commit.',
      },
    };

    this.kernel.submitProposal(proposal);
    console.log(`[AutonomousHealthLoop] Emitted system repair proposal [${proposalId}]: ${title}`);
    return proposal;
  }

  public getHealthMetrics(): HealthMetrics {
    const pendingCount = this.kernel.getProposals().filter((p) => p.status === 'PROPOSAL_PENDING_HUMAN_PROOF').length;
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      processHealth: this.processHealth,
      memoryUsageMb: Math.round(this.memoryUsageMb * 10) / 10,
      reasoningModelStatus: this.reasoningModelStatus,
      proposalLatencyMs: this.proposalLatencyMs,
      hashIntegrity: this.hashIntegrity,
      pendingProposalsCount: pendingCount,
      posture: this.kernel.getPosture(),
      currentTier: this.kernel.getCurrentTier(),
      uptimeSeconds,
    };
  }

  /**
   * Simulated fault injection for testing
   */
  public injectFault(faultType: 'MODEL_UNRESPONSIVE' | 'HASH_MISMATCH' | 'LATENCY_SPIKE') {
    if (faultType === 'MODEL_UNRESPONSIVE') {
      this.reasoningModelStatus = 'UNRESPONSIVE';
      this.kernel.recordBurnLog(
        'Observation ≠ Truth',
        'Reasoning model unresponsiveness detected during background health cycle.',
        'RAPTOR'
      );
    } else if (faultType === 'HASH_MISMATCH') {
      this.hashIntegrity = 'MISMATCH';
      this.kernel.recordBurnLog(
        'Identity Boundary > Incoming Information',
        'Hash integrity desynchronization detected on model mirroring channel.',
        'STONEWALL'
      );
    } else if (faultType === 'LATENCY_SPIKE') {
      this.proposalLatencyMs = 1850;
    }
  }

  public clearFaults() {
    this.reasoningModelStatus = 'HEALTHY';
    this.hashIntegrity = 'VERIFIED';
    this.proposalLatencyMs = 120;
  }
}
