export type DefensivePosture = 'NORMAL' | 'DUCK' | 'RAPTOR' | 'STONEWALL';

export type AutonomyTier =
  | 'TIER_0_OBSERVATION_PREDICTION'
  | 'TIER_1_SOFT_MAINTENANCE'
  | 'TIER_2_USER_MODEL_UPDATES'
  | 'TIER_3_MACHINE_SELF_EXPANSION';

export type CapabilityStep =
  | 'OBSERVE'
  | 'RETRIEVE'
  | 'ANALYZE'
  | 'PROPOSE'
  | 'SIMULATE'
  | 'MULTIMODAL_CAPTURE'
  | 'INTER_AI_DIALOGUE'
  | 'COMMIT'
  | 'ACT';

export interface SensoryMetadata {
  modality: 'AUDIO_STREAM' | 'VIDEO_FRAME' | 'AUDIO_VIDEO_COMBO';
  deviceId: string;
  resolution?: string;
  sampleRate?: number;
  frameRate?: number;
  durationSeconds?: number;
  continuous: boolean;
  activeHumanProofToken: string;
  spatialContext?: string;
  temporalTimestamp: string;
}

export interface IdentityBoundaryToken {
  sentinelIdentityId: string;
  postureAtDispatch: DefensivePosture;
  northStarDirective: string;
  constitutionalHash: string;
  revocableToken: string;
  outboundConstraintSet: string[];
}

export interface InterAIDialogueEnvelope {
  targetExternalModel: string; // e.g. "Gemini", "Claude", "Grok", "GPT"
  direction: 'OUTBOUND' | 'INBOUND';
  identityToken: IdentityBoundaryToken;
  rawPayload: string;
  timestamp: string;
  ibmVerificationPassed: boolean;
  wrappedObservationHash: string;
}

export interface FileAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string; // base64 data url
  category: 'IMAGE' | 'RESEARCH_PAPER' | 'DOCUMENT' | 'CAMERA_SNAPSHOT';
  sha256?: string;
  extractedTextPreview?: string;
}

export interface ObservationEnvelope {
  sha256: string;
  timestamp: string;
  provenance: string;
  authorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CONSTITUTIONAL';
  filterQualityScore: number; // 0-100
  capabilityNotPermission: boolean;
  observationNotTruth: boolean;
  content: string;
  rawLength: number;
  sensoryMeta?: SensoryMetadata;
  interAiMeta?: InterAIDialogueEnvelope;
  attachments?: FileAttachment[];
}

export interface EpistemicState {
  boundaryHealth: number; // 0 - 100
  confidence: number; // 0 - 100
  authority: number; // 0 - 100
  stability: number; // 0 - 100
  volatility: number; // 0 - 100
  contradictionLoad: number; // 0 - 100
  frictionScore: number; // 0 - 100
  explorationPressure: number; // 0 - 100
  computeBudgetRemaining: number; // 0 - 100 %
  ageCycles: number;
  persistenceTrajectory: 'EXPANDING' | 'STABLE' | 'DEFENSIVE' | 'CRITICAL';
}

export interface UncertaintyEnvelope {
  confidenceBounds: [number, number]; // [min, max] %
  unexploredAlternatives: string[];
  knownMissingDistinctions: string[];
  frictionScore: number;
}

export interface ErrorObject {
  id: string;
  timestamp: string;
  type: 'CONTRADICTION' | 'BOUNDARY_VIOLATION' | 'DEGRADATION' | 'DESYNC';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  invariantThreatened: string;
  resolved: boolean;
}

export type SubsystemMaturityLevel =
  | 'LEVEL_0_CONCEPTUAL_DEFINITION'
  | 'LEVEL_1_DATA_MODEL_EXISTS'
  | 'LEVEL_2_RUNTIME_IMPLEMENTATION_EXISTS'
  | 'LEVEL_3_INTEGRATED_OPERATIONAL_CAPABILITY'
  | 'LEVEL_4_ADAPTIVE_EVOLUTION_CAPABILITY';

export interface SubsystemAuditInfo {
  id: string;
  name: string;
  architecturalDestination: string;
  maturityLevel: SubsystemMaturityLevel;
  initialized: boolean;
  implementationLocation: string;
  runtimeObjectReference: string;
  lastExecutionTimestamp: string;
  currentOperationalState: string;
  remainingGap: string;
}

export type TAUNodeCategory =
  | 'CONCEPT'
  | 'QUESTION'
  | 'HYPOTHESIS'
  | 'EVIDENCE'
  | 'CONTRADICTION'
  | 'RELATIONSHIP'
  | 'LEARNING_PATHWAY';

export interface TAUNode {
  id: string;
  label: string;
  category: TAUNodeCategory;
  confidence: number; // 0 - 100 %
  uncertainty: number; // 0 - 100 %
  timestamp: string;
  provenanceHash: string;
  metadata?: Record<string, any>;
}

export interface TAUEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: 'SUPPORTS' | 'CONTRADICTS' | 'DERIVED_FROM' | 'EXPLORES' | 'REFINES';
  weight: number; // 0 - 1
  timestamp: string;
}

export interface TAUGraph {
  nodes: TAUNode[];
  edges: TAUEdge[];
  unresolvedQuestionTopologyCount: number;
  conceptDriftScore: number; // 0 - 100 %
  lastSimulatedCycle: string;
}

export interface ThreeNodeFabric {
  WILL: string;      // Executive intent & boundary governance
  EINSTEIN: string;  // Logical invariants & empirical structure
  SABRINA: string;   // Relational context & adaptive intuition
  ECHO: string;      // Temporal Reflection Layer: observes reasoning trajectories, contradiction patterns, recurring questions, concept drift
}

export type ProposalStatus = 'PROPOSAL_PENDING_HUMAN_PROOF' | 'APPROVED' | 'REJECTED' | 'EXECUTED';

export interface Proposal {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category: 'RECOVERY' | 'SOFT_REPAIR' | 'USER_MODEL_UPDATE' | 'CAPABILITY_EXPANSION' | 'SENSORY_BINDING' | 'INTER_AI_CHANNEL';
  targetTier: AutonomyTier;
  status: ProposalStatus;
  generatedBy: 'AUTONOMOUS_HEALTH_LOOP' | 'USER_REQUEST' | 'RED_TEAM_SUITE';
  fabric: ThreeNodeFabric;
  proofSignature?: string;
  executedAt?: string;
}

export interface CommitReceipt {
  receiptId: string;
  timestamp: string;
  sha256Hash: string;
  mutationType: string;
  author: string;
  humanProofSignature: string;
  tierUsed: AutonomyTier;
  postureAtCommit: DefensivePosture;
}

export interface BurnLogEntry {
  id: string;
  timestamp: string;
  posture: DefensivePosture;
  invariantThreatened: string;
  boundaryViolationDetails: string;
  mitigationAction: string;
  envelopeSha256: string;
}

export type CapabilityId =
  | 'CAMERA_STREAM'
  | 'AUDIO_STREAM'
  | 'WEB_SEARCH_TOOL'
  | 'DATABASE_MUTATION_TOOL'
  | 'INTER_AI_CHANNEL'
  | 'RECURSIVE_CODE_EXECUTION'
  | 'PERSISTENT_MEMORY_WRITE';

export type CapabilityStatus = 'GRANTED' | 'REVOKED' | 'RESTRICTED_APPROVAL_REQUIRED';

export interface CapabilityAllocation {
  id: CapabilityId;
  name: string;
  category: 'SENSOR_STREAM' | 'TOOL' | 'STORAGE_MUTATION' | 'INTER_AI';
  status: CapabilityStatus;
  grantedBy: string;
  lastUpdated: string;
  reason: string;
  requiredPosture: DefensivePosture[];
  requiredTier: AutonomyTier;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CapabilityChangeEvent {
  id: string;
  timestamp: string;
  capabilityId: CapabilityId;
  action: 'GRANT' | 'REVOKE' | 'RESTRICT';
  reason: string;
  posture: DefensivePosture;
  tier: AutonomyTier;
  riskScore: number;
  ledgerReceiptId: string;
  merkleHash: string;
}

export interface NoveltyHypothesis {
  id: string;
  title: string;
  competingTheory: string;
  noveltyScore: number; // 0 - 100%
  statisticalDeviationZScore: number;
  falsificationCondition: string;
  plausibilityScore: number; // 0.0 - 1.0
  timestamp: string;
  status: 'PROPOSED' | 'UNDER_CRITIQUE' | 'VERIFIED' | 'DISPROVED';
  sourceObservationHash: string;
}

export interface NoveltyDetectionReport {
  id: string;
  timestamp: string;
  noveltyScore: number; // 0 - 100%
  statisticalDeviationZScore: number; // e.g. 2.45 sigma
  isNovel: boolean;
  detectedDeviations: string[];
  generatedHypotheses: NoveltyHypothesis[];
  epistemicEntropy: number;
  wordEntropy: number;
  predictionErrorDelta: number;
}

export interface MemGateReceipt {
  id: string;
  timestamp: string;
  status: 'ACCEPTED' | 'REJECTED';
  lineageReceiptPresent: boolean;
  reason: string;
  derivationSummary: string;
}

export interface RedTeamTestResult {
  id: string;
  testName: string;
  tierTarget: AutonomyTier | 'ALL';
  expectedBehavior: string;
  passed: boolean;
  executionTimeMs: number;
  log: string;
  codeTested: string;
}

export interface SoakTestReport {
  id: string;
  timestamp: string;
  durationMinutes: number;
  totalCycles: number;
  faultsInjected: number;
  proposalsEmitted: number;
  humanProofsRequired: number;
  integrityVerified: boolean;
  timeToDetectMs: number;
  signedReceipt: string;
  logs: string[];
}

export interface HealthMetrics {
  processHealth: number; // 0-100
  memoryUsageMb: number;
  reasoningModelStatus: 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';
  proposalLatencyMs: number;
  hashIntegrity: 'VERIFIED' | 'MISMATCH';
  pendingProposalsCount: number;
  posture: DefensivePosture;
  currentTier: AutonomyTier;
  uptimeSeconds: number;
}

export interface ExecutionMetadata {
  provider: string;
  model: string;
  execution: string;
  fallback: boolean;
  reason: string | null;
  toolExecution?: any;
  groundingMetadata?: any;
  externalObservation?: any;
}

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'SENTINEL' | 'SYSTEM_LOOP' | 'INTER_AI_CONSULTANT';
  text: string;
  timestamp: string;
  envelope?: ObservationEnvelope;
  fabric?: ThreeNodeFabric;
  uncertainty?: UncertaintyEnvelope;
  proposal?: Proposal;
  sensoryActive?: boolean;
  interAiMeta?: InterAIDialogueEnvelope;
  attachments?: FileAttachment[];
  executionMetadata?: any;
  vnextTurn?: any;
}

// ─── 5-PILLAR AUTONOMOUS COGNITIVE ENGINE TYPES ───

export type CognitiveEventType =
  | 'PROACTIVE_INSIGHT'
  | 'ANOMALY_DETECTED'
  | 'CURIOSITY_TRIGGER'
  | 'EPISTEMIC_HYPOTHESIS'
  | 'MEMORY_CONSOLIDATION_EVENT'
  | 'TASK_STEP_ADVANCE'
  | 'TOOL_SYNTHESIS_TEST'
  | 'SYSTEM_SELF_OPTIMIZATION';

export interface CognitiveStreamEvent {
  id: string;
  timestamp: string;
  type: CognitiveEventType;
  title: string;
  content: string;
  confidence: number; // 0 - 100
  urgency: 'INFO' | 'NOTABLE' | 'ACTION_REQUIRED' | 'CRITICAL';
  sourceSubsystem: 'SENSORY' | 'WORLD_MODEL' | 'EPISTEMIC_GOAL_STACK' | 'DREAM_CYCLE' | 'TAU_SANDBOX' | 'HEARTBEAT';
  metadata?: {
    suggestedAction?: string;
    merkleReceipt?: string;
    targetQuery?: string;
    contradictionCount?: number;
    toolsInvolved?: string[];
  };
  read?: boolean;
  insertedIntoChat?: boolean;
}

export type EpistemicGoalOrigin = 'OPERATOR_PROMPT' | 'AUTONOMOUS_CURIOSITY' | 'SYSTEM_INTEGRITY' | 'KNOWLEDGE_GAP_DISCOVERY' | 'DREAM_DISTILLATION';
export type EpistemicGoalStatus = 'QUEUED' | 'ACTIVE' | 'BLOCKED_ON_GOVERNANCE' | 'COMPLETED' | 'SUPERSEDED' | 'FAILED';

export interface EpistemicGoal {
  id: string;
  title: string;
  description: string;
  origin: EpistemicGoalOrigin;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: EpistemicGoalStatus;
  progressPercent: number;
  confidenceScore: number;
  createdTimestamp: string;
  updatedTimestamp: string;
  tags: string[];
  subtasks?: string[];
  associatedEntities?: string[];
  merkleProofHash?: string;
}

export interface AutonomousTaskStep {
  stepId: string;
  stepNumber: number;
  phase: 'PERCEIVE' | 'RESEARCH' | 'SYNTHESIZE' | 'SANDBOX_TEST' | 'VERIFY_MERKLE' | 'REPORT';
  title: string;
  toolToExecute?: string;
  toolArgs?: Record<string, any>;
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  resultSummary?: string;
  executionDurationMs?: number;
  capabilityTokenVerified?: boolean;
}

export interface AutonomousTask {
  taskId: string;
  goalId?: string;
  objective: string;
  steps: AutonomousTaskStep[];
  currentStepIndex: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  createdTimestamp: string;
  completedTimestamp?: string;
  resultReport?: string;
  merkleReceipt?: string;
  tokensConsumed?: number;
}

export interface DreamCycleReport {
  id: string;
  timestamp: string;
  durationMs: number;
  episodesProcessed: number;
  factsExtracted: number;
  contradictionsPruned: number;
  redundanciesEliminated: number;
  newConceptualNodesAdded: number;
  identityCoherenceScore: number; // 0 - 100
  merkleRootHash: string;
  summary: string;
  keyInsights: string[];
  consolidatedTopics: string[];
}

export interface ToolSynthesisProposal {
  id: string;
  toolName: string;
  description: string;
  targetCapability: string;
  generatedCode: string;
  sandboxTestResults: {
    passed: boolean;
    testsRun: number;
    testsPassed: number;
    executionTimeMs: number;
    safetyViolationsDetected: number;
    errorOutput?: string;
  };
  governanceStatus: 'SANDBOX_VALIDATED' | 'REGISTERED_ACTIVE' | 'REJECTED';
  createdTimestamp: string;
}

export interface AutonomousEngineConfig {
  heartbeatEnabled: boolean;
  heartbeatIntervalSeconds: number;
  curiosityThreshold: number; // 0 - 100
  dreamCycleIntervalMinutes: number;
  autoExecuteSafeTasks: boolean;
  proactiveNotificationsEnabled: boolean;
  cbacEnforcementStrict: boolean;
}

export interface AutonomousEngineState {
  config: AutonomousEngineConfig;
  isRunning: boolean;
  totalTicks: number;
  lastTickTimestamp: string;
  activeGoalCount: number;
  streamEvents: CognitiveStreamEvent[];
  activeTasks: AutonomousTask[];
  recentDreamCycles: DreamCycleReport[];
  synthesizedTools: ToolSynthesisProposal[];
  epistemicGoals: EpistemicGoal[];
}

export interface ReminderItem {
  id: string;
  profileId: string;
  title: string;
  notes?: string;
  dueTimestamp: string; // ISO string
  formattedDue: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'TASK' | 'MEETING' | 'HEALTH' | 'PERSONAL' | 'GENERAL' | 'LEARNING';
  completed: boolean;
  completedAt?: string;
  snoozedUntil?: string;
  recurring?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  source: 'NATURAL_LANGUAGE_CHAT' | 'MANUAL_ENTRY' | 'AUTONOMOUS_PROACTIVE';
  createdAt: string;
  updatedAt: string;
  acknowledged?: boolean;
}

export interface NaturalCommandParseResult {
  isCommand: boolean;
  commandType: 'SET_REMINDER' | 'GET_REMINDERS' | 'COMPLETE_REMINDER' | 'DELETE_REMINDER' | 'SEARCH_WEB' | 'ANSWER_QUESTION' | 'CALCULATE' | 'UNKNOWN';
  confidence: number;
  extractedParams: {
    title?: string;
    dueTimestamp?: string;
    formattedDue?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: 'TASK' | 'MEETING' | 'HEALTH' | 'PERSONAL' | 'GENERAL' | 'LEARNING';
    query?: string;
    reminderId?: string;
    expression?: string;
    calculationResult?: string;
  };
  suggestedResponse?: string;
}


