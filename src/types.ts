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

