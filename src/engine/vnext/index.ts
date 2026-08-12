import { MultimodalPerceptionBus } from './perceptionBus';
import { WorldModel } from './worldModel';
import { GoalEngine } from './goalEngine';
import { PredictionEngine } from './predictionEngine';
import { SpecialistConsortium } from './specialists';
import { ActivePlannerExecutionKernel } from './activePlanner';
import { AdaptiveReasoningBudget } from './reasoningBudget';
import { LearningLayer } from './learningLayer';
import { LearningAdaptationLayer } from './learningAdaptation';
import { ContinuousReflection } from './continuousReflection';
import { ConversationManager } from './conversationManager';
import { TemporalPerceptionLayer, temporalPerceptionLayer } from './temporalPerception';
import {
  ObservationEnvelopeVNext,
  WorldGraph,
  GoalItem,
  PredictedAction,
  SpecialistOpinion,
  ExecutionPlan,
  ReasoningTier,
  ReflectionEntry,
  ConversationMetrics,
  PredictionErrorRecord,
  TemporalObservation,
  TemporalPerceptionWindow,
  EventAssessment,
  RecommendedDisposition,
  ReasoningPacket,
  EpistemicStatus,
} from './types';

export class GabbyVNextEngine {
  public perceptionBus = new MultimodalPerceptionBus();
  public temporalPerception = temporalPerceptionLayer;
  public worldModel = new WorldModel();
  public goalEngine = new GoalEngine();
  public predictionEngine = new PredictionEngine();
  public specialists = new SpecialistConsortium();
  public planner = new ActivePlannerExecutionKernel();
  public reasoningBudget = new AdaptiveReasoningBudget();
  public learningLayer = new LearningLayer();
  public learningAdaptation = new LearningAdaptationLayer();
  public continuousReflection = new ContinuousReflection();
  public conversationManager = new ConversationManager();

  private previousTurnPredictions: PredictedAction[] = [];

  public processTurn(
    rawInput: string,
    posture: string = 'NORMAL',
    modality: any = 'TEXT',
    source: string = 'USER_CHAT',
    attachmentsCount = 0,
    visualInputData?: any,
    audioInputData?: any,
    temporalInputData?: any
  ) {
    // 1. Perception Bus: Envelope creation with sensory features & temporal anchors
    const observation = this.perceptionBus.ingestingInput(
      rawInput,
      modality,
      source,
      attachmentsCount,
      visualInputData,
      audioInputData,
      temporalInputData
    );

    // 2. Prediction Error Measurement & Model Revision Loop
    // Reality -> Observe -> Internal Model -> Predict -> Reality Happens -> Measure Error -> Revise Model
    const errorRecord: PredictionErrorRecord = this.predictionEngine.measurePredictionError(
      this.previousTurnPredictions,
      observation
    );
    this.predictionEngine.applyModelRevisionFromError(errorRecord, this.worldModel);

    // 2.5. Temporal Perception Window & Postdiction Integration Layer
    // OBSERVATION ≠ INTERPRETATION and PRELIMINARY INTERPRETATION ≠ FINAL UNDERSTANDING
    const { temporalObs, window, humanCommunicationString } = this.temporalPerception.ingestAndIntegrate(
      observation,
      errorRecord.predictionErrorDelta,
      this.worldModel
    );

    // 2.8. Habituation & EventAssessment Matrix Computation (Luna Engineering Update)
    const patternHash = `pattern_${observation.modality}_${observation.rawContent.slice(0, 30)}`;
    const habituation = this.temporalPerception.updateHabituation(patternHash, errorRecord.predictionErrorDelta);
    const expectationConfidence = 0.85; // C_exp
    const novelty = parseFloat(
      (Math.min(1.0, errorRecord.predictionErrorDelta / (1.0 + habituation.inhibition)) * expectationConfidence).toFixed(3)
    );

    const relevance = this.goalEngine.getActiveGoals().length > 0 ? 0.85 : 0.45;
    const uncertaintyScore = observation.uncertainty.score;
    const contradictionScore = errorRecord.errorSignalType === 'PARADIGM_SHIFT' ? 0.85 : 0.15;
    const volatilityScore = temporalObs.attentionLevel === 'HIGH_UNCERTAINTY' ? 0.75 : 0.20;
    const riskScore = temporalObs.safetyRelevant ? 0.95 : 0.10;

    const escalationPressure = parseFloat(
      Math.min(
        1.0,
        novelty * 0.25 +
          relevance * 0.20 +
          (uncertaintyScore / 100.0) * 0.20 +
          contradictionScore * 0.15 +
          riskScore * 0.20
      ).toFixed(3)
    );

    const decisionCost = parseFloat((escalationPressure * 0.40 + (uncertaintyScore / 100.0) * 0.30 + 0.10).toFixed(3));

    let recommendedDisposition: RecommendedDisposition = 'SUPPRESS';
    if (riskScore >= 0.80 || posture === 'STONEWALL') {
      recommendedDisposition = 'ESCALATE';
    } else if (escalationPressure >= 0.65) {
      recommendedDisposition = 'REASON';
    } else if (uncertaintyScore >= 75 || errorRecord.errorSignalType === 'PARADIGM_SHIFT') {
      recommendedDisposition = 'DEFER';
    } else if (escalationPressure >= 0.35) {
      recommendedDisposition = 'INSPECT';
    } else if (escalationPressure >= 0.15) {
      recommendedDisposition = 'MONITOR';
    }

    const epistemicState: EpistemicStatus =
      uncertaintyScore >= 70 ? 'OPEN_UNKNOWN' : errorRecord.errorSignalType === 'MATCH' ? 'KNOWN_FACT' : 'HYPOTHESIS';

    const eventAssessment: EventAssessment = {
      id: `assess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      modality: observation.modality,
      novelty,
      expectation: `Contextual expectation for ${observation.modality} input under ${posture} posture`,
      expectationConfidence,
      excitation: parseFloat(habituation.excitation.toFixed(3)),
      inhibition: parseFloat(habituation.inhibition.toFixed(3)),
      persistenceMs: observation.temporalAnchor?.delta_t_ms || 1000,
      recurrenceCount: habituation.habituationIndex,
      predictionError: errorRecord.predictionErrorDelta,
      relevance,
      uncertainty: uncertaintyScore,
      contradiction: contradictionScore,
      volatility: volatilityScore,
      risk: riskScore,
      decisionCost,
      escalationPressure,
      epistemicState,
      posture,
      provenance: observation.provenance,
      observationHash: `sha256_${Date.now()}`,
      recommendedDisposition,
    };

    const reasoningPacket: ReasoningPacket = {
      assessment: eventAssessment,
      envelope: observation,
      temporalObservation: temporalObs,
      worldGraphSummary: `Nodes: ${this.worldModel.getGraph().nodes.length}, Edges: ${this.worldModel.getGraph().edges.length}`,
      salientFacts: this.worldModel.getGraph().nodes.slice(0, 5).map((n) => n.label),
      systemPosture: posture,
      permittedCapabilities: ['memory:read', 'tool:execute'],
    };

    // 3. World Model: Assimilate entities & promote knowledge
    this.worldModel.assimilateEntities(observation.extractedEntities);
    this.learningLayer.promoteKnowledge(this.worldModel.getGraph().nodes);

    // 4. Learning Adaptation Layer: Evaluate state
    const learnerState = this.learningAdaptation.evaluateLearnerState(observation);

    // 5. Goal Engine: Update goals
    this.goalEngine.updateGoalsFromObservation(observation);

    // 6. Conversation Manager: Update metrics
    const convMetrics = this.conversationManager.updateFromObservation(observation);

    // 7. Adaptive Reasoning Budget: Pick tier
    const reasoningTier = this.reasoningBudget.selectTier(observation, posture);

    // 8. Specialist Consortium: Consult internal specialists
    const specialistOpinions = this.specialists.consultSpecialists(observation, posture);

    // 9. Active Planner & Execution Kernel: Create & simulate plan
    const activePlan = this.planner.createAndSimulatePlan(
      observation,
      reasoningTier,
      this.goalEngine.getActiveGoals()
    );

    // 10. Prediction Engine: Predict next likely user needs for the upcoming turn
    const predictions = this.predictionEngine.predictNextNeeds(
      observation,
      this.goalEngine.getActiveGoals(),
      posture
    );

    // Store predictions for next turn's error measurement
    this.previousTurnPredictions = predictions;

    return {
      observation,
      temporalObs,
      temporalWindow: window,
      humanCommunicationString,
      eventAssessment,
      reasoningPacket,
      worldGraph: this.worldModel.getGraph(),
      worldModelTensors: this.worldModel.getWorldModelTensors(),
      predictionErrorRecord: errorRecord,
      activeGoals: this.goalEngine.getAllGoals(),
      predictions,
      specialistOpinions,
      activePlan,
      reasoningTier,
      convMetrics,
      learnerState,
    };
  }

  public completeTurnReflect(
    plan: ExecutionPlan,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL_SUCCESS' = 'SUCCESS'
  ): ReflectionEntry {
    return this.continuousReflection.logReflection(plan, outcome);
  }

  public getFullState() {
    const recentObs = this.perceptionBus.getRecentObservations();
    const latestObs = recentObs[0] || null;

    return {
      recentObservations: recentObs,
      worldGraph: this.worldModel.getGraph(),
      worldModelTensors: this.worldModel.getWorldModelTensors(),
      allGoals: this.goalEngine.getAllGoals(),
      recentPredictions: this.predictionEngine.predictNextNeeds(
        latestObs,
        this.goalEngine.getActiveGoals(),
        'NORMAL'
      ),
      recentReflections: this.continuousReflection.getRecentReflections(),
      convMetrics: this.conversationManager.getMetrics(),
      learnerState: this.learningAdaptation.getState(),
    };
  }
}

// Global Singleton for Gabby vNext Engine
export const gabbyVNextEngine = new GabbyVNextEngine();
