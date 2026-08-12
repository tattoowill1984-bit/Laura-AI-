export type PerceptionModality = 'TEXT' | 'CAMERA' | 'MICROPHONE' | 'FILE' | 'WEB' | 'SENSOR' | 'SYSTEM_LOG';

export interface EntityAttribution {
  cameraOperator: {
    name: string; // Default: 'Will'
    role: string; // 'Primary Session Owner / Voice Operator'
    id: string;   // 'user_will_primary'
  };
  frameSubject: {
    primarySubject: string; // e.g. 'Will', 'Donna', 'TT', 'Environment', 'Multi-Person'
    secondarySubjects?: string[];
    confidence: number;
    disambiguationNotes?: string;
  };
}

export interface VisualObservationData {
  hasVisualContent: boolean;
  detectedObjects: Array<{ label: string; confidence: number; locationBoundingBox?: string }>;
  presentedMaterials: Array<{ type: 'DOCUMENT' | 'DIAGRAM' | 'SCREEN' | 'PHYSICAL_ITEM' | 'CODE'; summary: string }>;
  environmentalContext: string;
  entityAttribution?: EntityAttribution;
}

export interface AudioObservationData {
  hasAudioContent: boolean;
  speechPaceRatio: number; // 1.0 = normal, <0.7 = hesitant/slow, >1.3 = rapid
  pausesCount: number;
  hesitationMarkersCount: number; // "um", "uh", trailing silences
  repetitionCount: number;
  vocalEnergyLevel: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
  uncertaintyIndicatorsCount: number;
}

export interface ObservationEntity {
  id: string;
  name: string;
  type: 'PERSON' | 'PET' | 'PROJECT' | 'PREFERENCE' | 'TASK' | 'CONCEPT' | 'FILE_REF' | 'SYSTEM_EVENT';
  attributes: Record<string, any>;
  confidence: number; // 0 - 100
}

export type DiurnalContextPeriod = 'Dawn' | 'Morning' | 'Midday' | 'Afternoon' | 'Dusk' | 'Evening' | 'Midnight';

export interface TemporalAnchorHeader {
  timestamp: string; // UTC ISO-8601 string
  delta_t_ms: number; // Elapsed ms since previous turn/frame
  delta_since_last_frame_sec: number; // Elapsed seconds
  local_time: string; // e.g., "14:42"
  diurnal_context: DiurnalContextPeriod; // Diurnal Context e.g., Morning, Dusk, Midnight
  is_static_scene?: boolean;
  motion_energy_score?: number; // 0 - 100%
  temporal_gap_detected?: boolean; // True if contextual gap/break detected
  gap_duration_hours?: number;
  entityAttribution?: EntityAttribution;
}

export interface ObservationEnvelopeVNext {
  id: string;
  source: string;
  timestamp: string;
  confidence: number; // 0 - 100
  modality: PerceptionModality;
  extractedEntities: ObservationEntity[];
  emotionalCues: {
    tone: string;
    urgency: number; // 0 - 10
    frustrationLevel: number; // 0 - 10
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'CURIOUS' | 'URGENT';
  };
  intentEstimate: {
    primaryIntent: string;
    secondaryIntents: string[];
    actionable: boolean;
  };
  uncertainty: {
    score: number; // 0 - 100
    missingContext: string[];
  };
  provenance: string;
  rawContent: string;
  attachmentsCount?: number;
  visualData?: VisualObservationData;
  audioData?: AudioObservationData;
  temporalAnchor?: TemporalAnchorHeader;
  entityAttribution?: EntityAttribution;
  temporalObservation?: TemporalObservation;
  temporalWindowId?: string;
}

export type TemporalStatus = 'OPEN' | 'OBSERVED' | 'PROVISIONAL' | 'INTEGRATING' | 'UNCERTAIN' | 'STABLE' | 'REVISED' | 'COMMITTED' | 'EXPIRED';

export type AttentionLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'HIGH_UNCERTAINTY' | 'SAFETY_RELEVANT';

export interface InterpretationRevisionRecord {
  timestamp: string;
  previousInterpretation: string;
  revisedInterpretation: string;
  reasonForRevision: string;
  supportingEvidenceIds: string[];
  confidence: number;
}

export interface TemporalObservation {
  id: string;
  timestamp: string;
  modality: PerceptionModality | 'SPEECH' | 'TOOL_RESULT';
  source: string;
  provenance: string;
  rawObservationRef: string; // The original raw content, immutable
  extractedFeatures: Record<string, any>;
  preliminaryInterpretation: string;
  revisedInterpretation?: string;
  finalUnderstanding?: string;
  confidence: number; // 0 - 100
  uncertainty: number; // 0 - 100
  windowId: string;
  relatedObservationIds: string[];
  interpretationStatus: TemporalStatus;
  revisionHistory: InterpretationRevisionRecord[];
  isProvisional: boolean; // Initial: true
  safetyRelevant: boolean;
  attentionLevel: AttentionLevel;
  compressed?: boolean;
}

export interface TemporalPerceptionWindow {
  windowId: string;
  startTime: string;
  lastUpdateTime: string;
  modalityContext: string;
  observationIds: string[];
  status: TemporalStatus;
  integratedUnderstanding?: string;
  plausibleInterpretations: Array<{
    interpretation: string;
    confidence: number;
    supportingObservationIds: string[];
  }>;
  expirationTimeoutMs: number;
  attentionLevel: AttentionLevel;
}

export type TimescaleTier = 'FAST_TRANSIENT' | 'MEDIUM_BEHAVIORAL' | 'SLOW_FOUNDATIONAL';

export interface WorldNode {
  id: string;
  label: string;
  category: 'USER_FACT' | 'PREFERENCE' | 'PROJECT_CONTEXT' | 'ENTITY' | 'SYSTEM_STATE' | 'GOAL_REF';
  properties: Record<string, any>;
  confidence: number;
  lastVerified: string;
  verificationStage: 'TEMPORARY' | 'CANDIDATE' | 'VERIFIED' | 'CORE';
  timescaleTier?: TimescaleTier;
  updateVelocity?: 'INSTANT' | 'GRADUAL' | 'HIGH_INERTIA';
  decayRatePerTurn?: number; // % confidence loss if not reinforced
  requiredEvidenceThreshold?: number; // Minimum evidence weight needed to overwrite
  accumulatedEvidenceScore?: number;
}

export interface WorldRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string; // e.g. "OWNS", "LIKES", "WORKING_ON", "BLOCKED_BY", "REQUIRES", "CAUSES", "INFLUENCES"
  weight: number;
  timestamp: string;
  isCausal?: boolean;
  causalStrength?: number; // 0 - 1.0
}

export interface WorldGraph {
  nodes: WorldNode[];
  edges: WorldRelationship[];
}

export interface EntityTensor {
  id: string;
  name: string;
  category: string;
  identitySignature: string;
  attributes: Record<string, any>;
  confidence: number; // 0 - 100
  verificationStage: string;
  lastVerified: string;
  timescaleTier: TimescaleTier;
  updateVelocity: 'INSTANT' | 'GRADUAL' | 'HIGH_INERTIA';
  decayRatePerTurn: number;
  requiredEvidenceThreshold: number;
  accumulatedEvidenceScore: number;
}

export interface RelationshipTensor {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
  causalWeight: number; // 0 - 1.0
  isCausal: boolean; // True for causal, False for mere correlation
  correlationScore: number; // 0 - 1.0
  timestamp: string;
}

export type EpistemicStatus = 'KNOWN_FACT' | 'HIGH_CONFIDENCE_BELIEF' | 'HYPOTHESIS' | 'UNVERIFIED_ASSUMPTION' | 'OPEN_UNKNOWN';

export interface EpistemicBoundary {
  knownFactsCount: number;
  hypothesesCount: number;
  openEpistemicGaps: string[];
  confidenceBounds: [number, number]; // [lowerBound %, upperBound %]
  epistemicEntropy: number; // 0 - 100 (cognitive uncertainty/entropy)
}

export interface EpistemicBelief {
  id: string;
  topic: string;
  status: EpistemicStatus;
  confidence: number;
  lowerBound: number;
  upperBound: number;
  supportingEvidence: string;
}

export interface EpistemicStateTensor {
  activeBeliefs: EpistemicBelief[];
  boundary: EpistemicBoundary;
}

export interface TemporalTrajectoryStep {
  turnIndex: number;
  timestamp: string;
  state: string;
  confidence: number;
  velocity: 'STABLE' | 'EVOLVING' | 'RAPID_SHIFT' | 'DECAYING';
}

export interface TemporalTensor {
  entityId: string;
  pastState: string;
  currentState: string;
  predictedFutureState: string;
  changeVelocity: 'STABLE' | 'EVOLVING' | 'RAPID_SHIFT' | 'DECAYING';
  horizon: string;
  halfLifeTurns?: number;
  trajectoryHistory?: TemporalTrajectoryStep[];
}

export interface UncertaintyTensor {
  contextId: string;
  confidenceScore: number; // 0 - 100
  evidenceStrength: number; // 0 - 100
  contradictionLoad: number; // 0 - 100
  empiricalCalibrationScore: number; // 0 - 100 (Accuracy vs confidence alignment)
  missingContext: string[];
}

export interface PredictionErrorRecord {
  id: string;
  timestamp: string;
  predictedNeed: string;
  actualUserAction: string;
  predictionErrorDelta: number; // 0.0 (exact match) to 1.0 (total prediction error)
  errorSignalType: 'MATCH' | 'MINOR_DEVIATION' | 'MISPREDICTION' | 'PARADIGM_SHIFT';
  revisedModelWeightsSummary: string;
  reasonForRevision?: string;
}

export interface ActiveLearningInquiry {
  id: string;
  highUncertaintyTopic: string;
  questionToReduceUncertainty: string;
  expectedUncertaintyReduction: number; // 0 - 100
  createdTimestamp: string;
  status: 'PENDING' | 'ANSWERED' | 'DISCARDED';
}

export interface ContradictionRecord {
  id: string;
  timestamp: string;
  conflictingFacts: [string, string];
  selectedResolution: string;
  evidenceWeightBasis: string;
  confidenceDelta: number;
}

export interface WorldModelTensors {
  entities: EntityTensor[];
  relationships: RelationshipTensor[];
  temporals: TemporalTensor[];
  uncertainties: UncertaintyTensor[];
  epistemicState: EpistemicStateTensor;
  recentPredictionErrors: PredictionErrorRecord[];
  activeInquiries: ActiveLearningInquiry[];
  contradictionRecords: ContradictionRecord[];
  overallCalibrationScore: number; // 0 - 100
}

export type GoalStatus = 'ACTIVE' | 'SUBGOAL' | 'COMPLETED' | 'BLOCKED' | 'DEFERRED' | 'WAITING';

export interface GoalItem {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  parentId?: string; // for subgoals
  progressPercent: number; // 0 - 100
  createdTimestamp: string;
  updatedTimestamp: string;
  tags: string[];
}

export type ExecutionStepPhase =
  | 'OBSERVE'
  | 'UNDERSTAND'
  | 'PLAN'
  | 'SIMULATE'
  | 'EXECUTE'
  | 'EVALUATE'
  | 'REFLECT';

export interface ExecutionPlanStep {
  stepNumber: number;
  phase: ExecutionStepPhase;
  actionTitle: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REWRITTEN' | 'FAILED';
  specialistAssigned?: string;
  resultSummary?: string;
}

export interface ExecutionPlan {
  id: string;
  goalId?: string;
  title: string;
  steps: ExecutionPlanStep[];
  currentStepIndex: number;
  adaptiveReasoningTier: ReasoningTier;
  simulatedRiskScore: number; // 0 - 100
  status: 'PLANNING' | 'EXECUTING' | 'COMPLETED' | 'REPLANNING' | 'FAILED';
}

export type ReasoningTier = 'SIMPLE' | 'MEDIUM' | 'DEEP' | 'RESEARCH' | 'MULTI_AGENT';

export interface SpecialistOpinion {
  specialistName: 'ResearchAgent' | 'SecurityAgent' | 'MemoryAgent' | 'PlanningAgent' | 'TeachingAgent' | 'Critic' | 'Optimizer';
  perspective: string;
  recommendation: string;
  confidence: number;
  concerns: string[];
}

export interface PredictedAction {
  id: string;
  title: string;
  reasoning: string;
  likelihoodScore: number; // 0 - 100
  suggestedPrompt: string;
  category: 'LOG_INSPECTION' | 'EXPORT_REVISION' | 'TEST_RUN' | 'NEXT_STEP' | 'DOCUMENTATION';
}

export interface ReflectionEntry {
  id: string;
  timestamp: string;
  taskTitle: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL_SUCCESS';
  surprises: string[];
  missingKnowledgeIdentified: string[];
  newPatternsDiscovered: string[];
  confidenceAdjustment: number;
  strategyLesson: string;
}

export interface ConversationMetrics {
  emotionalTemperature: number; // 0 - 100
  verbosityPreference: 'CONCISE' | 'BALANCED' | 'DETAILED' | 'EXHAUSTIVE';
  unansweredQuestions: string[];
  followUpOpportunities: string[];
  interruptionDetected: boolean;
  contextSwitchFrequency: number;
}

export type RecommendedDisposition =
  | 'SUPPRESS'
  | 'MONITOR'
  | 'INSPECT'
  | 'REASON'
  | 'ESCALATE'
  | 'DEFER';

export interface EventAssessment {
  id: string;
  timestamp: string;
  modality: PerceptionModality;
  
  // Novelty & Expectation
  novelty: number;                  // 0.0 - 1.0
  expectation: string;              // Contextual pattern summary
  expectationConfidence: number;    // 0.0 - 1.0 (C_exp)
  
  // Competing Dynamics
  excitation: number;               // 0.0 - 1.0
  inhibition: number;               // 0.0 - 1.0
  
  // Persistence & Recurrence
  persistenceMs: number;
  recurrenceCount: number;
  predictionError: number;          // 0.0 - 1.0
  
  // Multi-Factor Risk Matrix
  relevance: number;                // 0.0 - 1.0
  uncertainty: number;              // 0 - 100
  contradiction: number;            // 0.0 - 1.0
  volatility: number;               // 0.0 - 1.0
  risk: number;                     // 0.0 - 1.0
  
  // Bounded Decision Cost
  decisionCost: number;             // J_decision metric (0.0 - 1.0)
  
  // Computed Escalation Pressure
  escalationPressure: number;       // 0.0 - 1.0
  
  // Epistemic State & Posture
  epistemicState: EpistemicStatus;
  posture: string;
  
  // Provenance & Security
  provenance: string;
  observationHash: string;
  
  // Action Routing
  recommendedDisposition: RecommendedDisposition;
}

export interface ContextualExpectation {
  patternSummary: string;
  expectationConfidence: number; // 0.0 - 1.0
  lastUpdated: string;
  sampleCount: number;
}

export interface ReasoningPacket {
  assessment: EventAssessment;
  envelope: ObservationEnvelopeVNext;
  temporalObservation?: TemporalObservation;
  worldGraphSummary: string;
  salientFacts: string[];
  systemPosture: string;
  permittedCapabilities: string[];
}
