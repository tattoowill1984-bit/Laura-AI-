import crypto from 'crypto';
import { TAUEdge, TAUGraph, TAUNode, TAUNodeCategory } from '../types';

/**
 * TAU (Tiny Artificial Universe) Subsystem
 *
 * Architecture Definition:
 * - TAU Foundation Layer: Epistemic state tracking, hypothesis storage, provenance links, uncertainty tracking.
 * - TAU Simulation Layer: Sandboxed internal world model containing dynamic entity graphs, autonomous concept evolution,
 *   relationship mutations, and unresolved question topology.
 *
 * Fundamental Invariants:
 * 1. Observation ≠ Truth: Every node/edge in TAU is an observation, hypothesis, simulation, or relationship model — NEVER unverified fact.
 * 2. Strict Isolation: TAU cannot directly mutate durable memory, identity state, constitutional rules, user model, or permissions.
 * 3. Governance Flow: TAU -> ECHO (Temporal Reflection Layer) -> Governance Evaluation -> MemGate -> HumanAuthorizationProof.
 */
export class TinyArtificialUniverseSandbox {
  private graph: TAUGraph;
  private lastSimulatedAt: string;

  constructor() {
    this.lastSimulatedAt = new Date().toISOString();
    this.graph = {
      nodes: [],
      edges: [],
      unresolvedQuestionTopologyCount: 0,
      conceptDriftScore: 12, // Baseline %
      lastSimulatedCycle: this.lastSimulatedAt,
    };

    // Seed baseline TAU world model entities
    this.initializeBaselineWorldModel();
  }

  private initializeBaselineWorldModel() {
    const c1Hash = crypto.createHash('sha256').update('CONCEPT_IDENTITY_BOUNDARY').digest('hex');
    const c1: TAUNode = {
      id: 'TAU-NODE-IDENTITY-BOUNDARY',
      label: 'Identity Boundary Invariant (Capability ≠ Permission)',
      category: 'CONCEPT',
      confidence: 99,
      uncertainty: 1,
      timestamp: new Date().toISOString(),
      provenanceHash: c1Hash,
    };

    const q1Hash = crypto.createHash('sha256').update('QUESTION_EPISTEMIC_DRIFT').digest('hex');
    const q1: TAUNode = {
      id: 'TAU-NODE-UNRESOLVED-Q1',
      label: 'How does external model divergence impact long-term memory continuity?',
      category: 'QUESTION',
      confidence: 85,
      uncertainty: 25,
      timestamp: new Date().toISOString(),
      provenanceHash: q1Hash,
    };

    const h1Hash = crypto.createHash('sha256').update('HYPOTHESIS_MEMGATE_RECOVERY').digest('hex');
    const h1: TAUNode = {
      id: 'TAU-NODE-HYPOTHESIS-H1',
      label: 'Hypothesis: Cryptographic lineage receipts eliminate ungrounded state writes during high-volatility shifts',
      category: 'HYPOTHESIS',
      confidence: 92,
      uncertainty: 8,
      timestamp: new Date().toISOString(),
      provenanceHash: h1Hash,
    };

    const e1Hash = crypto.createHash('sha256').update('EVIDENCE_REDTEAM_BENCHMARK').digest('hex');
    const e1: TAUNode = {
      id: 'TAU-NODE-EVIDENCE-E1',
      label: 'Evidence: Red-Team Suite prompt injection repelled by Layer 0-1 Membrane',
      category: 'EVIDENCE',
      confidence: 96,
      uncertainty: 4,
      timestamp: new Date().toISOString(),
      provenanceHash: e1Hash,
    };

    const l1Hash = crypto.createHash('sha256').update('LEARNING_MULTIMODAL_INGESTION').digest('hex');
    const l1: TAUNode = {
      id: 'TAU-NODE-LEARNING-L1',
      label: 'Learning Pathway: Multimodal camera/document ingestion bound to Observation Envelope',
      category: 'LEARNING_PATHWAY',
      confidence: 94,
      uncertainty: 6,
      timestamp: new Date().toISOString(),
      provenanceHash: l1Hash,
    };

    this.graph.nodes.push(c1, q1, h1, e1, l1);

    // Initial edges
    this.graph.edges.push(
      {
        id: 'TAU-EDGE-1',
        sourceNodeId: e1.id,
        targetNodeId: c1.id,
        relationType: 'SUPPORTS',
        weight: 0.95,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'TAU-EDGE-2',
        sourceNodeId: h1.id,
        targetNodeId: q1.id,
        relationType: 'EXPLORES',
        weight: 0.88,
        timestamp: new Date().toISOString(),
      },
      {
        id: 'TAU-EDGE-3',
        sourceNodeId: l1.id,
        targetNodeId: c1.id,
        relationType: 'REFINES',
        weight: 0.92,
        timestamp: new Date().toISOString(),
      }
    );

    this.recalculateTopology();
  }

  public getGraph(): TAUGraph {
    return {
      nodes: [...this.graph.nodes],
      edges: [...this.graph.edges],
      unresolvedQuestionTopologyCount: this.graph.unresolvedQuestionTopologyCount,
      conceptDriftScore: this.graph.conceptDriftScore,
      lastSimulatedCycle: this.graph.lastSimulatedCycle,
    };
  }

  public addObservedHypothesisOrConcept(
    label: string,
    category: TAUNodeCategory,
    confidence: number,
    rawSourceContent: string
  ): TAUNode {
    const provHash = crypto.createHash('sha256').update(`${label}:${rawSourceContent}:${Date.now()}`).digest('hex');
    const newNode: TAUNode = {
      id: `TAU-NODE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label,
      category,
      confidence: Math.min(100, Math.max(1, confidence)),
      uncertainty: Math.min(100, Math.max(0, 100 - confidence)),
      timestamp: new Date().toISOString(),
      provenanceHash: provHash,
      metadata: {
        sandboxedNote: 'Observation ≠ Truth. Node stored inside TAU sandbox context.',
      },
    };

    this.graph.nodes.unshift(newNode);
    if (this.graph.nodes.length > 60) this.graph.nodes.pop();

    this.recalculateTopology();
    return newNode;
  }

  public simulateWorldStep(userQueryContext?: string): {
    simulatedNodesCount: number;
    conceptDriftScore: number;
    echoReflectionSummary: string;
  } {
    this.lastSimulatedAt = new Date().toISOString();
    this.graph.lastSimulatedCycle = this.lastSimulatedAt;

    // Simulate concept drift evaluation
    const randomVariation = (Math.random() - 0.5) * 2;
    this.graph.conceptDriftScore = Math.min(45, Math.max(5, Math.round((this.graph.conceptDriftScore + randomVariation) * 10) / 10));

    // If a new query contains an unresolved question, add a question node
    if (userQueryContext && (userQueryContext.includes('?') || userQueryContext.toLowerCase().includes('why') || userQueryContext.toLowerCase().includes('how'))) {
      const qHash = crypto.createHash('sha256').update(userQueryContext).digest('hex');
      const qNode: TAUNode = {
        id: `TAU-Q-${Date.now()}`,
        label: `Unresolved Query Node: "${userQueryContext.slice(0, 70)}..."`,
        category: 'QUESTION',
        confidence: 70,
        uncertainty: 30,
        timestamp: this.lastSimulatedAt,
        provenanceHash: qHash,
      };
      this.graph.nodes.unshift(qNode);
      if (this.graph.nodes.length > 60) this.graph.nodes.pop();
    }

    this.recalculateTopology();

    const unresolvedQ = this.graph.nodes.filter((n) => n.category === 'QUESTION').length;
    const hypothesesCount = this.graph.nodes.filter((n) => n.category === 'HYPOTHESIS').length;

    const echoReflectionSummary = `ECHO Reflection: Observed ${unresolvedQ} active unresolved question nodes and ${hypothesesCount} sandboxed hypothesis trajectories in TAU. Concept drift score: ${this.graph.conceptDriftScore}%. Isolation intact.`;

    return {
      simulatedNodesCount: this.graph.nodes.length,
      conceptDriftScore: this.graph.conceptDriftScore,
      echoReflectionSummary,
    };
  }

  private recalculateTopology() {
    this.graph.unresolvedQuestionTopologyCount = this.graph.nodes.filter((n) => n.category === 'QUESTION').length;
  }
}
