import {
  WorldGraph,
  WorldNode,
  WorldRelationship,
  ObservationEntity,
  EntityTensor,
  RelationshipTensor,
  TemporalTensor,
  UncertaintyTensor,
  PredictionErrorRecord,
  ActiveLearningInquiry,
  ContradictionRecord,
  WorldModelTensors,
  TimescaleTier,
  EpistemicBelief,
  EpistemicBoundary,
  EpistemicStateTensor,
  EpistemicStatus,
  TemporalTrajectoryStep,
} from './types';

export class WorldModel {
  private graph: WorldGraph = {
    nodes: [],
    edges: [],
  };

  private temporals: Map<string, TemporalTensor> = new Map();
  private uncertainties: Map<string, UncertaintyTensor> = new Map();
  private recentPredictionErrors: PredictionErrorRecord[] = [];
  private activeInquiries: ActiveLearningInquiry[] = [];
  private contradictionRecords: ContradictionRecord[] = [];
  private calibrationHistory: { predictedConfidence: number; actualOutcomeScore: number }[] = [];
  private currentTurnIndex = 1;

  constructor() {
    this.seedDefaultKnowledge();
  }

  private seedDefaultKnowledge() {
    const now = new Date().toISOString();

    const userNode: WorldNode = {
      id: 'node_user',
      label: 'Primary Operator (User)',
      category: 'USER_FACT',
      properties: { role: 'Operator / Creator', interactionStyle: 'Goal-Oriented & Direct' },
      confidence: 100,
      lastVerified: now,
      verificationStage: 'CORE',
      timescaleTier: 'SLOW_FOUNDATIONAL',
      updateVelocity: 'HIGH_INERTIA',
      decayRatePerTurn: 0,
      requiredEvidenceThreshold: 90,
      accumulatedEvidenceScore: 100,
    };

    const gabbyNode: WorldNode = {
      id: 'node_gabby',
      label: 'Gabby AI Operating System',
      category: 'SYSTEM_STATE',
      properties: { version: '2.0-vNext', sentinelGovernance: 'Anamnesis Sentinel v2.0' },
      confidence: 100,
      lastVerified: now,
      verificationStage: 'CORE',
      timescaleTier: 'SLOW_FOUNDATIONAL',
      updateVelocity: 'HIGH_INERTIA',
      decayRatePerTurn: 0,
      requiredEvidenceThreshold: 90,
      accumulatedEvidenceScore: 100,
    };

    const sentinelNode: WorldNode = {
      id: 'node_sentinel',
      label: 'Anamnesis Sentinel Guard',
      category: 'SYSTEM_STATE',
      properties: { role: 'Safety, KMS, Capability Guard, Commit Ledger' },
      confidence: 100,
      lastVerified: now,
      verificationStage: 'CORE',
      timescaleTier: 'SLOW_FOUNDATIONAL',
      updateVelocity: 'HIGH_INERTIA',
      decayRatePerTurn: 0,
      requiredEvidenceThreshold: 90,
      accumulatedEvidenceScore: 100,
    };

    this.graph.nodes = [userNode, gabbyNode, sentinelNode];

    this.graph.edges = [
      {
        id: 'edge_1',
        sourceId: 'node_user',
        targetId: 'node_gabby',
        relation: 'OPERATES_AND_GUIDES',
        weight: 1.0,
        timestamp: now,
        isCausal: true,
        causalStrength: 0.95,
      },
      {
        id: 'edge_2',
        sourceId: 'node_sentinel',
        targetId: 'node_gabby',
        relation: 'PROTECTS_AND_GOVERNS',
        weight: 1.0,
        timestamp: now,
        isCausal: true,
        causalStrength: 1.0,
      },
    ];

    // Initialize Temporal & Uncertainty Tensors
    this.temporals.set('node_user', {
      entityId: 'node_user',
      pastState: 'System setup & initial prompt submission',
      currentState: 'Interactive architectural verification & continuous chat execution',
      predictedFutureState: 'Complex workflow automation & proactive goal completion',
      changeVelocity: 'STABLE',
      horizon: 'Continuous interaction',
    });

    this.uncertainties.set('global_context', {
      contextId: 'global_context',
      confidenceScore: 92,
      evidenceStrength: 95,
      contradictionLoad: 5,
      empiricalCalibrationScore: 91,
      missingContext: [],
    });

    // Seed default seed calibration records
    this.calibrationHistory = [
      { predictedConfidence: 90, actualOutcomeScore: 88 },
      { predictedConfidence: 95, actualOutcomeScore: 92 },
      { predictedConfidence: 85, actualOutcomeScore: 86 },
    ];

    // Seed default prediction error & model revision records
    const nowEpoch = Date.now();
    this.recentPredictionErrors = [
      {
        id: `err_seed_1`,
        timestamp: new Date(nowEpoch - 180000).toISOString(),
        predictedNeed: 'Passive Chat Interaction',
        actualUserAction: 'Requested Entity Attribution, Temporal Anchors & World Model Tensor Revision Engine',
        predictionErrorDelta: 0.88,
        errorSignalType: 'PARADIGM_SHIFT',
        revisedModelWeightsSummary: 'Prediction error threshold exceeded (Δ = 0.88). Re-weighted World Model priors to full-stack continuous cognitive runtime.',
        reasonForRevision: 'User requested deep architectural expansion to entity attribution, temporal tensors, and active learning rather than standard Q&A.',
      },
      {
        id: `err_seed_2`,
        timestamp: new Date(nowEpoch - 90000).toISOString(),
        predictedNeed: 'Passive Sensor Stream',
        actualUserAction: 'Injected real-time video frame with spatial perception overlay and operator tracking',
        predictionErrorDelta: 0.65,
        errorSignalType: 'MISPREDICTION',
        revisedModelWeightsSummary: 'Model revision triggered (Δ = 0.65). Boosted visual observation weights & updated spatial entity confidence.',
        reasonForRevision: 'Unexpected sensory stream influx required recalibrating real-time perception processing priors.',
      },
      {
        id: `err_seed_3`,
        timestamp: new Date(nowEpoch - 30000).toISOString(),
        predictedNeed: 'Epistemic State Inspection',
        actualUserAction: 'Inspected EpistemicStatePanel model revision triggers & prediction error logs',
        predictionErrorDelta: 0.12,
        errorSignalType: 'MATCH',
        revisedModelWeightsSummary: 'Prediction match (Δ = 0.12). Reinforced current causal topology and boundary health invariants.',
        reasonForRevision: 'Routine epistemic inspection aligned with predicted diagnostic trajectory.',
      },
    ];
  }

  /**
   * Helper to derive Timescale Tier & Inertia rules based on entity type
   */
  private determineTimescaleConfig(type: string): {
    timescaleTier: TimescaleTier;
    updateVelocity: 'INSTANT' | 'GRADUAL' | 'HIGH_INERTIA';
    decayRatePerTurn: number;
    requiredEvidenceThreshold: number;
  } {
    switch (type) {
      case 'PERSON':
      case 'PET':
        return {
          timescaleTier: 'SLOW_FOUNDATIONAL',
          updateVelocity: 'HIGH_INERTIA',
          decayRatePerTurn: 0,
          requiredEvidenceThreshold: 80,
        };
      case 'PREFERENCE':
      case 'PROJECT':
        return {
          timescaleTier: 'MEDIUM_BEHAVIORAL',
          updateVelocity: 'GRADUAL',
          decayRatePerTurn: 2,
          requiredEvidenceThreshold: 40,
        };
      case 'TASK':
      case 'FILE_REF':
      case 'SYSTEM_EVENT':
      case 'CONCEPT':
      default:
        return {
          timescaleTier: 'FAST_TRANSIENT',
          updateVelocity: 'INSTANT',
          decayRatePerTurn: 8,
          requiredEvidenceThreshold: 10,
        };
    }
  }

  /**
   * 1. Persistent Identity & Multi-Timescale Assimilation across time
   * ("Not everything should update at the same speed")
   */
  public assimilateEntities(entities: ObservationEntity[]) {
    const now = new Date().toISOString();
    this.currentTurnIndex++;

    entities.forEach((ent) => {
      let existingNode = this.graph.nodes.find(
        (n) => n.id === ent.id || n.label.toLowerCase() === ent.name.toLowerCase()
      );

      const timescaleConfig = this.determineTimescaleConfig(ent.type);

      if (!existingNode) {
        existingNode = {
          id: ent.id || `ent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          label: ent.name,
          category: ent.type === 'PET' ? 'ENTITY' : ent.type === 'PROJECT' ? 'PROJECT_CONTEXT' : ent.type === 'PREFERENCE' ? 'PREFERENCE' : 'USER_FACT',
          properties: ent.attributes,
          confidence: ent.confidence,
          lastVerified: now,
          verificationStage: timescaleConfig.timescaleTier === 'SLOW_FOUNDATIONAL' ? 'VERIFIED' : 'CANDIDATE',
          timescaleTier: timescaleConfig.timescaleTier,
          updateVelocity: timescaleConfig.updateVelocity,
          decayRatePerTurn: timescaleConfig.decayRatePerTurn,
          requiredEvidenceThreshold: timescaleConfig.requiredEvidenceThreshold,
          accumulatedEvidenceScore: 20,
        };
        this.graph.nodes.push(existingNode);

        // Connect to user node with causal or relational edge
        this.graph.edges.push({
          id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          sourceId: 'node_user',
          targetId: existingNode.id,
          relation: ent.type === 'PET' ? 'OWNS_PET' : ent.type === 'PREFERENCE' ? 'PREFERS' : 'CONTEXT_RELATION',
          weight: 0.85,
          timestamp: now,
          isCausal: false,
          causalStrength: 0.5,
        });

        // Initialize temporal trajectory with step history
        const initialTrajectoryStep: TemporalTrajectoryStep = {
          turnIndex: this.currentTurnIndex,
          timestamp: now,
          state: `Initialized: ${JSON.stringify(ent.attributes)}`,
          confidence: existingNode.confidence,
          velocity: timescaleConfig.updateVelocity === 'INSTANT' ? 'RAPID_SHIFT' : 'EVOLVING',
        };

        this.temporals.set(existingNode.id, {
          entityId: existingNode.id,
          pastState: 'Newly observed entity',
          currentState: `Active in context: ${JSON.stringify(ent.attributes)}`,
          predictedFutureState: 'Integration into long-term user world representation',
          changeVelocity: timescaleConfig.updateVelocity === 'INSTANT' ? 'RAPID_SHIFT' : 'EVOLVING',
          horizon: timescaleConfig.timescaleTier === 'SLOW_FOUNDATIONAL' ? 'Core Identity' : 'Near-term turns',
          halfLifeTurns: timescaleConfig.timescaleTier === 'FAST_TRANSIENT' ? 3 : timescaleConfig.timescaleTier === 'MEDIUM_BEHAVIORAL' ? 12 : 100,
          trajectoryHistory: [initialTrajectoryStep],
        });
      } else {
        existingNode.lastVerified = now;
        existingNode.accumulatedEvidenceScore = (existingNode.accumulatedEvidenceScore || 20) + 15;

        // Timescale-dependent property and confidence update rules
        if (existingNode.timescaleTier === 'FAST_TRANSIENT') {
          // Instant updates
          existingNode.confidence = Math.min(100, existingNode.confidence + 15);
          existingNode.properties = { ...existingNode.properties, ...ent.attributes };
        } else if (existingNode.timescaleTier === 'MEDIUM_BEHAVIORAL') {
          // Gradual updates: Require accumulating pattern evidence
          existingNode.confidence = Math.min(100, existingNode.confidence + 8);
          if (existingNode.accumulatedEvidenceScore >= (existingNode.requiredEvidenceThreshold || 40)) {
            existingNode.properties = { ...existingNode.properties, ...ent.attributes };
            existingNode.verificationStage = 'VERIFIED';
          }
        } else if (existingNode.timescaleTier === 'SLOW_FOUNDATIONAL') {
          // High Inertia: Require very strong evidence to override foundational attributes
          existingNode.confidence = Math.min(100, existingNode.confidence + 2);
          if (existingNode.accumulatedEvidenceScore >= (existingNode.requiredEvidenceThreshold || 80)) {
            existingNode.properties = { ...existingNode.properties, ...ent.attributes };
            existingNode.verificationStage = 'CORE';
          }
        }

        // Update temporal tensor trajectory history
        const temp = this.temporals.get(existingNode.id);
        if (temp) {
          temp.pastState = temp.currentState;
          temp.currentState = `Re-verified (Evidence Score: ${existingNode.accumulatedEvidenceScore})`;
          temp.changeVelocity = 'STABLE';

          if (!temp.trajectoryHistory) temp.trajectoryHistory = [];
          temp.trajectoryHistory.push({
            turnIndex: this.currentTurnIndex,
            timestamp: now,
            state: temp.currentState,
            confidence: existingNode.confidence,
            velocity: 'STABLE',
          });
          if (temp.trajectoryHistory.length > 10) temp.trajectoryHistory.shift();
        }
      }
    });

    // Run timescale decay sweep
    this.applyTimescaleDecay();
  }

  /**
   * Multi-Timescale Decay Sweep
   * Fast sensory items fade if unobserved, Medium fade slowly, Slow foundational items never decay.
   */
  public applyTimescaleDecay() {
    this.graph.nodes.forEach((node) => {
      const tier = node.timescaleTier || 'FAST_TRANSIENT';
      const decay = node.decayRatePerTurn ?? (tier === 'FAST_TRANSIENT' ? 8 : tier === 'MEDIUM_BEHAVIORAL' ? 2 : 0);

      if (decay > 0) {
        node.confidence = Math.max(10, node.confidence - decay);
      }
    });
  }

  /**
   * 2. Causal Understanding vs Correlation
   */
  public addRelationship(
    sourceId: string,
    targetId: string,
    relation: string,
    weight = 0.9,
    isCausal = false,
    causalStrength = 0.8
  ) {
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    this.graph.edges.push({
      id: edgeId,
      sourceId,
      targetId,
      relation,
      weight,
      timestamp: new Date().toISOString(),
      isCausal,
      causalStrength,
    });
  }

  /**
   * 3. Contradiction Handling ("Which explanation fits the evidence best?" Not deleting history)
   */
  public evaluateContradiction(fact1: string, fact2: string, evidenceWeight1: number, evidenceWeight2: number) {
    const now = new Date().toISOString();
    const chosenResolution = evidenceWeight1 >= evidenceWeight2 ? fact1 : fact2;
    const confidenceDelta = Math.abs(evidenceWeight1 - evidenceWeight2);

    const record: ContradictionRecord = {
      id: `contra_${Date.now()}`,
      timestamp: now,
      conflictingFacts: [fact1, fact2],
      selectedResolution: chosenResolution,
      evidenceWeightBasis: `Evidence weights: Fact1 (${evidenceWeight1}) vs Fact2 (${evidenceWeight2}). Selected highest-weight evidence.`,
      confidenceDelta,
    };

    this.contradictionRecords.unshift(record);
    if (this.contradictionRecords.length > 10) this.contradictionRecords.pop();

    // Adjust global uncertainty tensor contradiction load
    const globalUncertainty = this.uncertainties.get('global_context');
    if (globalUncertainty) {
      globalUncertainty.contradictionLoad = Math.min(100, globalUncertainty.contradictionLoad + 10);
    }

    return record;
  }

  /**
   * 4. Active Learning Inquiry Generator ("What observation would reduce my uncertainty the most?")
   */
  public generateActiveLearningInquiry(uncertaintyTopic: string, missingContext: string[]): ActiveLearningInquiry | null {
    if (!uncertaintyTopic && missingContext.length === 0) return null;

    const topic = uncertaintyTopic || missingContext[0] || 'User Goal Specifications';
    const question = `To improve my prediction accuracy on "${topic}", could you clarify your primary goal or expected behavior?`;

    const inquiry: ActiveLearningInquiry = {
      id: `inq_${Date.now()}`,
      highUncertaintyTopic: topic,
      questionToReduceUncertainty: question,
      expectedUncertaintyReduction: 35,
      createdTimestamp: new Date().toISOString(),
      status: 'PENDING',
    };

    this.activeInquiries.unshift(inquiry);
    if (this.activeInquiries.length > 5) this.activeInquiries.pop();

    return inquiry;
  }

  /**
   * 5. Empirical Calibration Calculation
   * Measures alignment between predicted confidence vs actual prediction outcomes
   */
  public recordPredictionOutcome(predictedConfidence: number, actualMatchScore: number) {
    this.calibrationHistory.push({
      predictedConfidence,
      actualOutcomeScore: actualMatchScore,
    });
    if (this.calibrationHistory.length > 30) this.calibrationHistory.shift();
  }

  public calculateCalibrationScore(): number {
    if (this.calibrationHistory.length === 0) return 90;

    // Calibration error = average absolute delta between predicted confidence and actual outcome score
    const totalError = this.calibrationHistory.reduce((acc, item) => {
      return acc + Math.abs(item.predictedConfidence - item.actualOutcomeScore);
    }, 0);

    const avgError = totalError / this.calibrationHistory.length;
    return Math.max(0, Math.min(100, Math.round(100 - avgError)));
  }

  public recordPredictionError(errorRecord: PredictionErrorRecord) {
    this.recentPredictionErrors.unshift(errorRecord);
    if (this.recentPredictionErrors.length > 15) this.recentPredictionErrors.pop();

    // Apply error signal feedback to global uncertainty tensor
    const globalUncertainty = this.uncertainties.get('global_context');
    if (globalUncertainty) {
      if (errorRecord.errorSignalType === 'MISPREDICTION' || errorRecord.errorSignalType === 'PARADIGM_SHIFT') {
        globalUncertainty.confidenceScore = Math.max(30, globalUncertainty.confidenceScore - 12);
        globalUncertainty.contradictionLoad = Math.min(100, globalUncertainty.contradictionLoad + 15);

        // Auto-generate Active Learning Inquiry on large prediction errors!
        this.generateActiveLearningInquiry(
          `Unexpected User Action: "${errorRecord.actualUserAction.slice(0, 50)}"`,
          ['User intent shift', 'Unpredicted task requirement']
        );
      } else if (errorRecord.errorSignalType === 'MATCH') {
        globalUncertainty.confidenceScore = Math.min(98, globalUncertainty.confidenceScore + 3);
        globalUncertainty.contradictionLoad = Math.max(0, globalUncertainty.contradictionLoad - 5);
      }
      globalUncertainty.empiricalCalibrationScore = this.calculateCalibrationScore();
    }
  }

  /**
   * Epistemic State Engine:
   * Computes system's active beliefs, known facts vs hypotheses bounds, open epistemic gaps, and epistemic entropy.
   */
  public getEpistemicStateTensor(): EpistemicStateTensor {
    const activeBeliefs: EpistemicBelief[] = this.graph.nodes.map((node) => {
      let status: EpistemicStatus = 'HIGH_CONFIDENCE_BELIEF';
      if (node.verificationStage === 'CORE') {
        status = 'KNOWN_FACT';
      } else if (node.verificationStage === 'VERIFIED' && node.confidence >= 85) {
        status = 'KNOWN_FACT';
      } else if (node.confidence >= 65) {
        status = 'HIGH_CONFIDENCE_BELIEF';
      } else if (node.confidence >= 40) {
        status = 'HYPOTHESIS';
      } else {
        status = 'UNVERIFIED_ASSUMPTION';
      }

      const margin = Math.round((100 - node.confidence) * 0.4);
      const lowerBound = Math.max(10, node.confidence - margin);
      const upperBound = Math.min(100, node.confidence + Math.round(margin * 0.5));

      return {
        id: `bel_${node.id}`,
        topic: `${node.label} (${node.category})`,
        status,
        confidence: node.confidence,
        lowerBound,
        upperBound,
        supportingEvidence: `Evidence Score: ${node.accumulatedEvidenceScore || 20} | Stage: ${node.verificationStage} | Timescale: ${node.timescaleTier || 'FAST_TRANSIENT'}`,
      };
    });

    const knownFacts = activeBeliefs.filter((b) => b.status === 'KNOWN_FACT').length;
    const hypotheses = activeBeliefs.filter((b) => b.status === 'HYPOTHESIS' || b.status === 'UNVERIFIED_ASSUMPTION').length;

    const globalUncertainty = this.uncertainties.get('global_context');
    const contradictionLoad = globalUncertainty?.contradictionLoad ?? 5;
    const globalConf = globalUncertainty?.confidenceScore ?? 92;
    const calibration = globalUncertainty?.empiricalCalibrationScore ?? 90;

    const openEpistemicGaps = [
      ...this.activeInquiries.filter((inq) => inq.status === 'PENDING').map((i) => i.questionToReduceUncertainty),
      ...(globalUncertainty?.missingContext || []),
    ];

    const entropy = Math.min(
      100,
      Math.max(5, Math.round(contradictionLoad * 0.4 + openEpistemicGaps.length * 7 + (100 - calibration) * 0.3))
    );

    const lowerBound = Math.max(20, Math.round(globalConf - contradictionLoad * 0.5));
    const upperBound = Math.min(100, Math.round(globalConf + 5));

    return {
      activeBeliefs,
      boundary: {
        knownFactsCount: knownFacts,
        hypothesesCount: hypotheses,
        openEpistemicGaps: openEpistemicGaps.length > 0 ? openEpistemicGaps : ['No critical epistemic gaps identified.'],
        confidenceBounds: [lowerBound, upperBound],
        epistemicEntropy: entropy,
      },
    };
  }

  /**
   * Retrieve Full Tensors State
   */
  public getWorldModelTensors(): WorldModelTensors {
    const entities: EntityTensor[] = this.graph.nodes.map((node) => ({
      id: node.id,
      name: node.label,
      category: node.category,
      identitySignature: `sig_${node.id}_${node.label.replace(/\s+/g, '_').toLowerCase()}`,
      attributes: node.properties || {},
      confidence: node.confidence,
      verificationStage: node.verificationStage,
      lastVerified: node.lastVerified,
      timescaleTier: node.timescaleTier || 'FAST_TRANSIENT',
      updateVelocity: node.updateVelocity || 'INSTANT',
      decayRatePerTurn: node.decayRatePerTurn ?? 8,
      requiredEvidenceThreshold: node.requiredEvidenceThreshold ?? 10,
      accumulatedEvidenceScore: node.accumulatedEvidenceScore ?? 20,
    }));

    const relationships: RelationshipTensor[] = this.graph.edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relation: edge.relation,
      causalWeight: edge.weight,
      isCausal: edge.isCausal ?? (edge.relation.includes('CAUSE') || edge.relation.includes('GOVERN')),
      correlationScore: Math.min(1.0, edge.weight * 0.9),
      timestamp: edge.timestamp,
    }));

    const temporalsList: TemporalTensor[] = Array.from(this.temporals.values());
    const uncertaintiesList: UncertaintyTensor[] = Array.from(this.uncertainties.values());
    const epistemicState = this.getEpistemicStateTensor();

    return {
      entities,
      relationships,
      temporals: temporalsList,
      uncertainties: uncertaintiesList,
      epistemicState,
      recentPredictionErrors: this.recentPredictionErrors,
      activeInquiries: this.activeInquiries.filter((inq) => inq.status === 'PENDING'),
      contradictionRecords: this.contradictionRecords,
      overallCalibrationScore: this.calculateCalibrationScore(),
    };
  }

  public getGraph(): WorldGraph {
    return this.graph;
  }

  public queryContextSummary(): string {
    const tensors = this.getWorldModelTensors();
    const causalCount = tensors.relationships.filter((r) => r.isCausal).length;
    const calibrationScore = tensors.overallCalibrationScore;
    const epiBoundary = tensors.epistemicState.boundary;
    const keyEntities = tensors.entities.slice(0, 5).map((e) => `${e.name} [${e.category}]`).join(', ');

    return `Predictive World Model: ${tensors.entities.length} Entities, ${tensors.relationships.length} Relations (${causalCount} Causal). Calibration Score: ${calibrationScore}%. Epistemic Bounds: [${epiBoundary.confidenceBounds[0]}%, ${epiBoundary.confidenceBounds[1]}%] (Entropy: ${epiBoundary.epistemicEntropy}%, Facts: ${epiBoundary.knownFactsCount}, Hypotheses: ${epiBoundary.hypothesesCount}). Key Context: [${keyEntities}]`;
  }
}
