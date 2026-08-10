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
