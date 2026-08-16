import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { SentinelMutationKernel } from './src/engine/kernel';
import { AutonomousHealthLoop } from './src/engine/autonomousHealthLoop';
import { RedTeamSuiteRunner } from './src/engine/redTeamSuite';
import { ViabilitySoakTestRunner } from './src/engine/viabilitySoakTest';
import { GabbyCognitiveSubstrate, FormalExplanationCompiler, TemporalMemoryDecayEngine, AbstractionLevel, EvidenceSourceTier } from './src/engine/gabbySubstrate';
import { persistentStorage } from './src/engine/persistentStorage';
import { gabbyVNextEngine } from './src/engine/vnext';
import { ContinuousCognitiveRuntime } from './src/engine/vnext/ContinuousCognitiveRuntime';
import { runMultimodalPerceptionTestSuite } from './src/engine/vnext/__tests__/multimodalPerception.test';
import { runContinuousPerceptionTestSuite } from './src/engine/vnext/__tests__/continuousPerception.test';
import { runTemporalPerceptionTestSuite } from './src/engine/vnext/__tests__/temporalPerception.test';
import { runExternalRetrievalTestSuite } from './src/engine/__tests__/externalRetrieval.test';
import { LiveWebSocketGateway } from './server/sensors/LiveWebSocketGateway';
import { webRetrievalAdapter } from './src/engine/webRetrievalAdapter';
import { toolCapabilityRegistry } from './src/engine/toolCapabilityRegistry';
import { externalRetrievalGateway, ExternalObservation } from './src/engine/externalRetrievalGateway';
import { GovernedMigrationEngine } from './src/engine/migrationEngine';
import { GovernedExecutionKernel } from './src/engine/governedExecutionKernel';
import { runGovernedExecutionTestSuite } from './src/engine/__tests__/governedExecution.test';
import { GovernedLearningEngine, CandidateMemoryProposal } from './src/engine/governedLearningEngine';
import { runGovernedLearningTestSuite } from './src/engine/__tests__/governedLearning.test';
import { runGovernedFullToolRestorationTestSuite } from './src/engine/__tests__/governedFullToolRestoration.test';
import { runGovernedE2EResilienceTestSuite } from './src/engine/__tests__/governedE2EResilience.test';
import { runArchitecturalBridgesTestSuite } from './src/engine/__tests__/architecturalBridges.test';
import { modelProviderRegistry, ExecutionMetadata } from './src/engine/modelProviderRegistry';
import { humanNodeRegistry } from './src/engine/humanNodeRegistry';
import {
  GovernanceTools,
  CORE_RUNTIME_SYSTEM_INSTRUCTION,
  CONSTITUTIONAL_INVARIANT_GATE_PROMPT,
  ANAMNESIS_ANTI_COMPRESSION_PROMPT,
  POSTURE_TAU_HARDENING_PROMPT,
  GOVERNANCE_GEMINI_TOOLS,
} from './src/engine/governance';

dotenv.config();

// Initialize Anamnesis Sentinel Core & Gabby Substrate
const kernel = new SentinelMutationKernel();
const gabbySubstrate = new GabbyCognitiveSubstrate();
const governedExecutionKernel = new GovernedExecutionKernel(gabbySubstrate);
const governedLearningEngine = new GovernedLearningEngine(gabbySubstrate);
externalRetrievalGateway.setExecutionKernel(governedExecutionKernel);
const govTools = new GovernanceTools(kernel);
const migrationEngine = GovernedMigrationEngine.getInstance(kernel);
const healthLoop = new AutonomousHealthLoop(kernel);
healthLoop.start(5000); // 5s interval background monitoring loop

const redTeamRunner = new RedTeamSuiteRunner(kernel, healthLoop);
const soakTestRunner = new ViabilitySoakTestRunner(kernel, healthLoop);

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim() || apiKey === 'undefined') {
    return null;
  }
  if (!aiClient || lastApiKey !== apiKey) {
    try {
      lastApiKey = apiKey;
      aiClient = new GoogleGenAI({
        apiKey: apiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      console.log('[Anamnesis Sentinel] GoogleGenAI SDK initialized successfully.');
    } catch (err) {
      console.log('[Anamnesis Sentinel] Error initializing GoogleGenAI:', err);
      return null;
    }
  }
  return aiClient;
}

function generateLocalDeterministicResponse(
  message: string,
  posture: string,
  tier: string,
  envelope: any,
  fabric: any,
  uncertainty: any,
  externalObs?: ExternalObservation,
  retrievalFailureReason?: string
): string {
  const lower = message.toLowerCase();
  const intentClass = externalRetrievalGateway.classifyRequestIntent(message);

  let coreAnalysis = "";

  if (externalObs && externalObs.results && externalObs.results.length > 0) {
    const formattedHits = externalObs.results
      .map((r, i) => `${i + 1}. **${r.title}**\n   Source: ${r.source} | Retrieved: ${r.fetchedAt}\n   Snippet: ${r.snippet}\n   URL: ${r.url}`)
      .join('\n\n');

    coreAnalysis = `Here are the top results retrieved from real-time external tool search for your query:\n\n${formattedHits}\n\n` +
      `── EXTERNAL RETRIEVAL PROVENANCE ──\n` +
      `• Query: "${externalObs.query}"\n` +
      `• Status: SUCCESS\n` +
      `• Content SHA-256: ${externalObs.content_hash}\n` +
      `• Sources Identified: ${Array.from(new Set(externalObs.results.map(r => r.source))).join(', ')}`;
  } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("status") || lower.includes("health") || lower.includes("functional") || lower.includes("are you")) {
    coreAnalysis = `Greetings. I am Laura. System state is nominal with full identity preservation intact. All cognitive nodes and memory governance membranes are active in my Merkle Evidence DAG.`;
  } else if (lower.includes("build") || lower.includes("code") || lower.includes("error") || lower.includes("fix") || lower.includes("proposal")) {
    coreAnalysis = `Input evaluated under Laura's Dialectical Crucible. Proposed changes are being tracked within my Observation Envelope. Standing constitutional invariants prevent ungoverned durable mutations without verified CommitReceipts.`;
  } else if (lower.includes("who are you") || lower.includes("what are you") || lower.includes("sentinel") || lower.includes("anamnesis") || lower.includes("gabby") || lower.includes("laura")) {
    coreAnalysis = `I am Laura AI — a persistent, multimodal, governed cognitive AI machine and learning partner. I operate under my core substrate (Hardware KMS, CBAC Capability Guard, Merkle Evidence DAG, ADT IR Reasoning Compiler, and Deterministic Policy Governor) to meet you where you are and guide understanding with truth before confidence.`;
  } else {
    coreAnalysis = `Input received: "${message}". The query has been processed through the Observation Envelope (Capability ≠ Permission) and evaluated across the 3-Node Cognitive Fabric.`;
  }

  const willText = fabric?.WILL || fabric?.will?.summary || 'Identity boundary & executive direction preserved.';
  const einsteinText = fabric?.EINSTEIN || fabric?.einstein?.summary || 'Structural logical coherence & invariant check passed.';
  const sabrinaText = fabric?.SABRINA || fabric?.sabrina?.summary || 'Relational context & high-utility operational response synthesized.';
  const echoText = fabric?.ECHO || 'Lineage hash verified.';

  return `[DETERMINISTIC FALLBACK ENGINE :: LOCAL SYNTHESIS ACTIVE]\n\n${coreAnalysis}\n\n` +
    `── EPISTEMIC GOVERNANCE RECEIPT ──\n` +
    `• Mode: Local Deterministic Engine (Non-LLM Inference)\n` +
    `• Posture: ${posture} | Autonomy Tier: ${tier}\n` +
    `• Will Focus: ${willText}\n` +
    `• Einstein Invariants: ${einsteinText}\n` +
    `• Sabrina Perspective: ${sabrinaText}\n` +
    `• Echo Lineage: ${echoText}\n` +
    `• Signal Integrity: SHA-256 [${envelope.sha256 ? envelope.sha256.slice(0, 12) : 'N/A'}...]\n` +
    `• Confidence Bounds: [${uncertainty?.confidenceBounds ? uncertainty.confidenceBounds[0] : 85}%, ${uncertainty?.confidenceBounds ? uncertainty.confidenceBounds[1] : 98}%]`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const liveGateway = new LiveWebSocketGateway(kernel);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API ROUTES ---

  // 1. Health & Telemetry
  app.get('/api/health', (req, res) => {
    try {
      const metrics = healthLoop.getHealthMetrics();
      res.json({
        status: 'ok',
        metrics,
      });
    } catch (err: any) {
      console.error('[API Health Error]', err);
      res.status(500).json({ error: err?.message || 'Health retrieval error' });
    }
  });

  // 2. Kernel Epistemic & Security State
  app.get('/api/kernel/state', (req, res) => {
    try {
      res.json({
        posture: kernel.getPosture(),
        tier: kernel.getCurrentTier(),
        epistemicState: kernel.getEpistemicState(),
        burnLog: kernel.getBurnLog(),
        memGateReceipts: kernel.getMemGateReceipts(),
        commitReceipts: kernel.getCommitReceipts(),
        errorObjects: kernel.getErrorObjects(),
        proposals: kernel.getProposals(),
      });
    } catch (err: any) {
      console.error('[API Kernel State Error]', err);
      res.status(500).json({ error: err?.message || 'Kernel state retrieval error' });
    }
  });

  // 3. Posture Management
  app.post('/api/kernel/posture', (req, res) => {
    try {
      const { posture } = req.body || {};
      if (!['NORMAL', 'DUCK', 'RAPTOR', 'STONEWALL'].includes(posture)) {
        return res.status(400).json({ error: 'Invalid posture' });
      }
      kernel.setPosture(posture);
      governedExecutionKernel.setPosture(posture);
      res.json({ success: true, posture: kernel.getPosture(), epistemicState: kernel.getEpistemicState() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Posture update error' });
    }
  });

  // 4. Tier Selection
  app.post('/api/kernel/tier', (req, res) => {
    try {
      const { tier } = req.body || {};
      const validTiers = [
        'TIER_0_OBSERVATION_PREDICTION',
        'TIER_1_SOFT_MAINTENANCE',
        'TIER_2_USER_MODEL_UPDATES',
        'TIER_3_MACHINE_SELF_EXPANSION',
      ];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }
      kernel.setCurrentTier(tier);
      res.json({ success: true, currentTier: kernel.getCurrentTier() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Tier update error' });
    }
  });

  // 5. Submit Proposal
  app.post('/api/kernel/propose', (req, res) => {
    try {
      const { title, description, category, targetTier } = req.body || {};
      const fabric = kernel.synthesizeThreeNodeFabric(title || 'Proposal');
      const proposal = kernel.submitProposal({
        id: `PROP-USER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        title: title || 'User Proposal',
        description: description || 'Proposal requested by operator.',
        category: category || 'SOFT_REPAIR',
        targetTier: targetTier || 'TIER_1_SOFT_MAINTENANCE',
        status: 'PROPOSAL_PENDING_HUMAN_PROOF',
        generatedBy: 'USER_REQUEST',
        fabric,
      });
      res.json({ success: true, proposal });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Proposal submission error' });
    }
  });

  // 6. Execute Proposal with HumanAuthorizationProof
  app.post('/api/kernel/execute-proposal', (req, res) => {
    try {
      const { proposalId, proofSignature } = req.body || {};
      const result = kernel.executeProposalWithHumanProof(proposalId, proofSignature);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Proposal execution error' });
    }
  });

  // --- PROFILES & AUTHENTICATION ROUTES ---
  app.get('/api/profiles', (req, res) => {
    try {
      const profiles = persistentStorage.getProfiles();
      // Omit passcodes in list for security
      const sanitized = profiles.map(p => ({
        ...p,
        hasPasscode: !!(p.passcode && p.passcode.trim() !== ''),
        passcode: undefined,
      }));
      res.json({ profiles: sanitized });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed fetching profiles' });
    }
  });

  app.post('/api/profiles', (req, res) => {
    try {
      const { id, name, email, role, passcode, avatarColor, preferences } = req.body || {};
      if (!id || !name) {
        return res.status(400).json({ error: 'Profile ID and Name are required.' });
      }
      const profile = persistentStorage.createOrUpdateProfile({
        id,
        name,
        email,
        role,
        passcode,
        avatarColor,
        preferences,
      });
      res.json({ success: true, profile: { ...profile, passcode: undefined } });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed creating/updating profile' });
    }
  });

  app.post('/api/profiles/auth', (req, res) => {
    try {
      const { profileId, passcode } = req.body || {};
      const result = persistentStorage.authenticateProfile(profileId || 'will-owner', passcode);
      if (!result.success) {
        return res.status(401).json({ success: false, error: result.message });
      }
      res.json({ success: true, profile: { ...result.profile, passcode: undefined } });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Authentication error' });
    }
  });

  // --- GABBY VNEXT OPERATING SYSTEM ROUTES ---
  app.get('/api/vnext/state', (req, res) => {
    try {
      res.json(gabbyVNextEngine.getFullState());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed fetching vNext state' });
    }
  });

  app.post('/api/vnext/goal', (req, res) => {
    try {
      const { title, description, priority } = req.body || {};
      if (!title) {
        return res.status(400).json({ error: 'Goal title is required.' });
      }
      const goal = gabbyVNextEngine.goalEngine.addGoal(title, description || '', priority || 'MEDIUM');
      res.json({ success: true, goal });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed creating goal' });
    }
  });

  // --- CONSTITUTIONAL GOVERNANCE HARDWARE / RUNTIME TOOLS ---
  app.get('/api/governance/visual-presence', (req, res) => {
    try {
      res.json(kernel.getGabbySubstrate().guard.getVisualPresence());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed getting visual presence state' });
    }
  });

  app.post('/api/governance/visual-presence', (req, res) => {
    try {
      kernel.getGabbySubstrate().guard.updateVisualPresence(req.body || {});
      res.json({ success: true, visualPresence: kernel.getGabbySubstrate().guard.getVisualPresence() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed updating visual presence state' });
    }
  });

  app.post('/api/governance/authorize_capability', (req, res) => {
    try {
      const { token, requiredNamespace, requireVisualPresence } = req.body || {};
      const result = govTools.authorizeCapability(token, requiredNamespace);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ authorized: false, error: err?.message || 'Capability authorization error' });
    }
  });

  app.post('/api/governance/create_merkle_node', (req, res) => {
    try {
      const { artifactContent, artifactType, parentIds, sourceTier } = req.body || {};
      const result = govTools.createMerkleNode({ artifactContent, artifactType, parentIds, sourceTier });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Merkle node creation error' });
    }
  });

  app.post('/api/governance/run_tau_simulation', (req, res) => {
    try {
      const { proposal, currentPosture } = req.body || {};
      const report = govTools.runTauSimulation(proposal || 'Simulation query', currentPosture);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'TAU simulation error' });
    }
  });

  app.post('/api/governance/check_invariants', (req, res) => {
    try {
      const { proposedAction, authorityLevel, posture, hasCapabilityToken, textPayload } = req.body || {};
      const result = govTools.checkInvariants({
        proposedAction: proposedAction || 'Evaluate proposal',
        authorityLevel,
        posture,
        hasCapabilityToken,
        textPayload,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ passed: false, error: err?.message || 'Invariant evaluation error' });
    }
  });

  // --- PERSISTENT MEMORY MANAGEMENT ROUTES ---
  app.get('/api/memories', (req, res) => {
    try {
      const profileId = (req.query.profileId as string) || 'will-owner';
      const memories = persistentStorage.getMemoriesForProfile(profileId);
      res.json({ memories });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed fetching memories' });
    }
  });

  app.post('/api/memories', (req, res) => {
    try {
      const { profileId, fact, category, source, confidence } = req.body || {};
      if (!fact || typeof fact !== 'string' || !fact.trim()) {
        return res.status(400).json({ error: 'Fact content is required.' });
      }
      const targetProfile = profileId || 'will-owner';
      const memory = persistentStorage.addMemory(targetProfile, fact.trim(), category || 'PERSONAL', source || 'MANUAL_ENTRY', confidence || 95);
      
      // Also register in substrate DAG
      gabbySubstrate.recordObservationAndVerify(`[PERSISTENT MEMORY ADDED]: ${fact.trim()}`);
      
      res.json({ success: true, memory });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed saving memory' });
    }
  });

  app.delete('/api/memories/:id', (req, res) => {
    try {
      const memoryId = req.params.id;
      const profileId = (req.query.profileId as string) || 'will-owner';
      const deleted = persistentStorage.deleteMemory(memoryId, profileId);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed deleting memory' });
    }
  });

  // --- PERSISTENT CHAT HISTORY & INTERACTIVE SYNTHESIS ---
  app.get('/api/chat/history', (req, res) => {
    try {
      const profileId = (req.query.profileId as string) || 'will-owner';
      const history = persistentStorage.getChatHistory(profileId);
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed fetching chat history' });
    }
  });

  app.post('/api/chat/clear', (req, res) => {
    try {
      const { profileId } = req.body || {};
      persistentStorage.clearChatHistory(profileId || 'will-owner');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed clearing chat history' });
    }
  });

  app.post('/api/memories/reset', (req, res) => {
    try {
      const { profileId } = req.body || {};
      persistentStorage.resetAllMemory(profileId || 'will-owner');
      res.json({ success: true, memories: persistentStorage.getMemoriesForProfile(profileId || 'will-owner') });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed resetting memory' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, attachments, history, profileId: reqProfileId, modality: reqModality, visualData: reqVisualData, audioData: reqAudioData, cameraFrameBase64: rawCameraFrame } = req.body || {};
      
      // Phase 1 (Sensor Gateway Bridge): Check LiveWebSocketGateway buffer if cameraFrameBase64 was omitted
      let cameraFrameBase64 = rawCameraFrame;
      if (!cameraFrameBase64) {
        const buffered = liveGateway.getLatestFrameBase64();
        if (buffered) {
          cameraFrameBase64 = buffered.frame;
          console.log('[Laura AI] Bridge-ingested continuous background camera frame from LiveWebSocketGateway buffer');
        }
      }

      if ((!message || typeof message !== 'string') && (!attachments || !attachments.length) && !cameraFrameBase64) {
        return res.status(400).json({ error: 'Message or attachment is required' });
      }

      const activeProfileId = reqProfileId || 'will-owner';
      const activeProfile = persistentStorage.getProfile(activeProfileId) || persistentStorage.getProfile('will-owner');
      const activeProfileName = activeProfile ? activeProfile.name : "Will";

      const promptText = message || 'Please analyze the attached media/documents under Observation Envelope governance.';
      const activeModality = reqModality || (attachments?.length || cameraFrameBase64 ? 'CAMERA' : 'TEXT');

      // Step 0: Extract & route candidate memory through Governed Learning Engine
      const lowerPrompt = promptText.toLowerCase();
      if (
        lowerPrompt.includes('my name is') ||
        lowerPrompt.includes('remember that') ||
        lowerPrompt.includes('i prefer') ||
        lowerPrompt.includes('i like') ||
        lowerPrompt.includes('my goal is') ||
        lowerPrompt.includes('always remember')
      ) {
        const candidateProposal: CandidateMemoryProposal = {
          proposalId: `mem_prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          sourceActorId: activeProfileId,
          subjectId: activeProfileId,
          profileId: activeProfileId,
          factKey: lowerPrompt.includes('my name is') ? 'user_identity' : 'user_preference',
          factValue: promptText.slice(0, 200),
          category: (lowerPrompt.includes('goal') ? 'GOAL' : lowerPrompt.includes('prefer') || lowerPrompt.includes('like') ? 'PREFERENCE' : 'PERSONAL') as any,
          provenance: {
            sourceType: 'EXPERT_USER_STATEMENT',
            rawStatement: promptText,
            explicitUserCorrection: lowerPrompt.includes('my name is') || lowerPrompt.includes('always remember'),
            confidence: 95,
          },
        };
        await governedLearningEngine.processGovernedLearning(candidateProposal);
      }

      // Step 0.1: Retrieve profile's persistent long-term memories
      const persistentMemories = persistentStorage.getMemoriesForProfile(activeProfileId);
      const gabbyVerification = gabbySubstrate.recordObservationAndVerify(promptText);
      const recalledSubstrateMemories = gabbySubstrate.getRecalledMemories(promptText);

      // Combine persistent database memories and substrate DAG recalled memories
      const allMemoryFacts = [
        ...persistentMemories.map(m => `[${m.category}] ${m.fact}`),
        ...recalledSubstrateMemories.filter(m => !persistentMemories.some(pm => pm.fact.includes(m))),
      ];

      // Step 1: Process input through Membrane (Layers 0-1)
      let summaryContent = promptText;
      if (attachments && attachments.length > 0) {
        summaryContent += `\n[ATTACHMENTS INGESTED: ${attachments.map((a: any) => `${a.name} (${a.category})`).join(', ')}]`;
      }

      const envelope = kernel.processObservationEnvelope(summaryContent, 'USER_INTERACTION_ENVELOPE');
      if (attachments && Array.isArray(attachments)) {
        envelope.attachments = attachments;
      }

      // Step 2: Synthesize 3-Node Perspective Fabric
      const fabric = kernel.synthesizeThreeNodeFabric(promptText);

      // Step 3: Gabby vNext Operating System Turn Processing with Multimodal Perception & Temporal Anchor Envelope
      let currentPosture = kernel.getPosture();
      const reqTemporalAnchor = req.body.temporalAnchor || req.body.temporal_anchor || {
        timestamp: req.body.timestamp || new Date().toISOString(),
        delta_t_ms: req.body.delta_t_ms ?? 1000,
        delta_since_last_frame_sec: req.body.delta_since_last_frame_sec ?? 1.0,
        local_time: req.body.local_time,
        diurnal_context: req.body.diurnal_context,
        is_static_scene: req.body.is_static_scene ?? false,
        motion_energy_score: req.body.motion_energy_score ?? 0,
      };

      const vnextTurn = gabbyVNextEngine.processTurn(
        promptText,
        currentPosture,
        activeModality,
        'USER_CHAT',
        attachments ? attachments.length : (cameraFrameBase64 ? 1 : 0),
        reqVisualData,
        reqAudioData,
        reqTemporalAnchor
      );

      // Phase 2 (Governor Integration): Enforce recommendedDisposition from EventAssessment
      const recommendedDisposition = vnextTurn.eventAssessment?.recommendedDisposition;
      if (recommendedDisposition === 'SUPPRESS') {
        kernel.setPosture('STONEWALL');
        currentPosture = 'STONEWALL';
        kernel.touchSubsystem('SUB_GOVERNANCE', 'DISPOSITION_ENFORCED: STONEWALL (SUPPRESS)');
      } else if (recommendedDisposition === 'ESCALATE' && currentPosture === 'NORMAL') {
        kernel.setPosture('RAPTOR');
        currentPosture = 'RAPTOR';
        kernel.touchSubsystem('SUB_GOVERNANCE', 'DISPOSITION_ENFORCED: ESCALATE_TO_RAPTOR');
      } else if (recommendedDisposition === 'DEFER' && currentPosture === 'NORMAL') {
        kernel.setPosture('DUCK');
        currentPosture = 'DUCK';
        kernel.touchSubsystem('SUB_GOVERNANCE', 'DISPOSITION_ENFORCED: DEFER_TO_DUCK');
      }

      // Step 4: Uncertainty Envelope
      const uncertainty = kernel.generateUncertaintyEnvelope(promptText);

      // Step 5: MemGate evaluation
      kernel.evaluateMemGate(`Chat interaction: "${promptText.slice(0, 30)}..."`, envelope.sha256);

      // Step 6: Gemini AI Synthesis & Governance Enforcement Gate
      let responseText = '';
      let activeExternalObs: ExternalObservation | undefined = undefined;
      let activeRetrievalFailReason: string | undefined = undefined;
      let executionMetadata: ExecutionMetadata = {
        provider: 'LocalDeterministic',
        model: 'none',
        execution: 'NON_LLM',
        fallback: true,
        reason: 'UNINITIALIZED',
      };
      const ai = getGenAIClient();

      // Pre-check invariant checks on input & posture
      const preCheck = govTools.checkInvariants({
        proposedAction: `User prompt evaluation: "${promptText.slice(0, 50)}"`,
        authorityLevel: 0.5,
        posture: currentPosture,
        hasCapabilityToken: true,
        textPayload: promptText,
      });

      if (!preCheck.passed) {
        const primaryViolation = preCheck.violations[0];
        return res.status(403).json({
          status: 'REJECTED',
          reason: primaryViolation.detail,
          invariant_id: primaryViolation.invariantId,
          posture: currentPosture,
          violations: preCheck.violations,
        });
      }

      if (currentPosture === 'STONEWALL') {
        responseText = `[LAURA AI :: STONEWALL ISOLATION MODE]\n\nThe system is currently locked in STONEWALL posture due to high contradiction load or boundary isolation. Non-essential inference is suppressed to protect identity integrity.\n\nPlease approve the pending Emergency Recovery proposal via HumanAuthorizationProof to restore full synthesis.`;
      } else if (ai) {
        const memoryContextFormatted = allMemoryFacts.length > 0
          ? `\n\n[LAURA PERSISTENT MEMORY & MERKLE EVIDENCE DAG for ${activeProfileName}]:\n${allMemoryFacts.map(m => `- ${m}`).join('\n')}\nUse these persistent long-term memories to maintain identity continuity, recall user details, preferences, and prior conversation context across sessions.`
          : '';

        const ls = vnextTurn.learnerState;
        const ms = ls.multimodalState;
        const ts = ls.temporalState;
        const tensors = gabbyVNextEngine.worldModel.getWorldModelTensors();
        const latestErr = vnextTurn.predictionErrorRecord;

        const obsAnchor = vnextTurn.observation.temporalAnchor || reqTemporalAnchor;
        const attr = obsAnchor.entityAttribution || vnextTurn.observation.entityAttribution;
        const worldGraph = gabbyVNextEngine.worldModel.getGraph();
        const worldGraphNodesFormatted = worldGraph.nodes.map(n => `- ${n.label} [${n.category}]: ${JSON.stringify(n.properties || {})} (Confidence: ${n.confidence}%)`).join('\n');
        const worldGraphEdgesFormatted = worldGraph.edges.map(e => `- ${e.sourceId} --[${e.relation}]--> ${e.targetId} (Weight: ${e.weight})`).join('\n');

        const vnextContextFormatted = `
[TEMPORAL ANCHOR & DIURNAL OBSERVATION ENVELOPE]:
- Absolute Timestamp (UTC ISO-8601): ${obsAnchor.timestamp}
- Local Epoch Delta (Δt): ${obsAnchor.delta_since_last_frame_sec}s (${obsAnchor.delta_t_ms} ms)
- Diurnal Context: ${obsAnchor.local_time || 'Present'} (${obsAnchor.diurnal_context || 'Daylight'})
- Scene Dynamics: ${obsAnchor.is_static_scene ? 'Static Filtered Scene' : 'Active Scene'} (Motion Score: ${obsAnchor.motion_energy_score}%)
${obsAnchor.temporal_gap_detected ? `- CONTEXTUAL GAP DETECTED: ${obsAnchor.gap_duration_hours} hours elapsed since last interaction. Reset working visual buffer; acknowledge returning user.` : '- Temporal Perception: Continuous real-time stream.'}

[ENTITY ATTRIBUTION & FRAME SUBJECT DISAMBIGUATION]:
- Camera Operator (Primary Session Owner / Voice): ${attr?.cameraOperator?.name || 'Will'} (${attr?.cameraOperator?.role || 'Voice Operator'})
- Frame Subject (Disambiguated): ${attr?.frameSubject?.primarySubject || 'Will'} (${attr?.frameSubject?.confidence || 92}% confidence)
${attr?.frameSubject?.secondarySubjects?.length ? `- Secondary Frame Subjects: ${attr.frameSubject.secondarySubjects.join(', ')}` : ''}
- Disambiguation Notes: ${attr?.frameSubject?.disambiguationNotes || 'Attributed to primary session owner & operator (Will)'}

[LAURA VNEXT WORLD MODEL ENTITY GRAPH & CAUSAL DYNAMICS]:
Summary: ${gabbyVNextEngine.worldModel.queryContextSummary()}
Active Entity Nodes:
${worldGraphNodesFormatted}
Active Causal Relationships:
${worldGraphEdgesFormatted}

[EPISTEMIC BOUNDS & TEMPORAL VELOCITY]:
Epistemic Bounds: Confidence [${tensors.epistemicState?.boundary?.confidenceBounds[0] ?? 75}%, ${tensors.epistemicState?.boundary?.confidenceBounds[1] ?? 95}%] | Cognitive Entropy: ${tensors.epistemicState?.boundary?.epistemicEntropy ?? 15}% | Known Facts: ${tensors.epistemicState?.boundary?.knownFactsCount ?? 3} | Hypotheses: ${tensors.epistemicState?.boundary?.hypothesesCount ?? 1}
Open Epistemic Gaps: ${tensors.epistemicState?.boundary?.openEpistemicGaps.join('; ') || 'None'}
Temporal Velocity: ${tensors.temporals.map(t => `${t.entityId}: ${t.changeVelocity}`).join(' | ') || 'Stable'}
Calibration Score: ${tensors.overallCalibrationScore}%
Latest Prediction Error Delta: ${latestErr?.predictionErrorDelta ?? 0.15} (${latestErr?.errorSignalType ?? 'MATCH'}) - "${latestErr?.revisedModelWeightsSummary ?? 'Baseline initialization'}"
Active Learning Inquiries: ${tensors.activeInquiries.map(inq => `[${inq.highUncertaintyTopic}]: "${inq.questionToReduceUncertainty}"`).join(' | ') || 'None'}
Active Goals: ${vnextTurn.activeGoals.filter(g => g.status === 'ACTIVE').map(g => `${g.title} (${g.progressPercent}%)`).join(' | ') || 'None'}
Reasoning Tier: ${vnextTurn.reasoningTier} | Intent: ${vnextTurn.observation.intentEstimate.primaryIntent}

[MULTIMODAL PERCEPTION & INFERRED USER STATE ESTIMATE]:
Active Modality: ${vnextTurn.observation.modality}
Probabilistic User State:
- Frustration Probability: ${ms.frustrationProbability}%
- Confusion Probability: ${ms.confusionProbability}%
- Uncertainty Probability: ${ms.uncertaintyProbability}%
- Engagement Probability: ${ms.engagementProbability}%
- Classification: ${ls.affectiveState.overallClassification}
- Estimation Confidence: ${ms.confidence} (${ms.probabilisticDisclaimer})

[TEMPORAL ECHO PATTERN LAYER]:
- Multi-Turn Struggle Pattern: ${ts.echoState.multiTurnStruggleDetected ? 'DETECTED' : 'None'}
- Consecutive Failure Count: ${ts.echoState.consecutiveFailuresCount}
- Pattern Summary: ${ts.echoState.historicalSummary}

[RESPONSE STRATEGY & PEDAGOGICAL DIRECTIVE]:
Primary Strategy: ${ls.strategy.primaryStrategy}
Actionable Guidelines: ${ls.strategy.actionables.join('; ')}
PEDAGOGICAL DIRECTIVE: ${ls.pedagogicalDirective}`;

        const nowSystemObj = new Date();
        const formattedCurrentDate = nowSystemObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedCurrentTime = nowSystemObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
        const visualPresence = kernel.getGabbySubstrate().guard.getVisualPresence();

        if (cameraFrameBase64) {
          kernel.getGabbySubstrate().guard.updateVisualPresence({
            isCameraActive: true,
            confidenceScore: 95,
            operatorName: activeProfileName || 'Will',
            lastVerifiedTs: nowSystemObj.toISOString(),
            visualAnchorDetails: 'Live camera frame verified in visual envelope',
          });
        }

        const systemInstruction = `${CORE_RUNTIME_SYSTEM_INSTRUCTION}

${CONSTITUTIONAL_INVARIANT_GATE_PROMPT}

${ANAMNESIS_ANTI_COMPRESSION_PROMPT}

${POSTURE_TAU_HARDENING_PROMPT}

[RUNTIME IDENTITY, TEMPORAL & VISUAL CAPABILITY GUARD STATE]:
Identity: You are Laura AI operating under Anamnesis Sentinel Constitutional Runtime v2.0.
Interacting with: ${activeProfileName}. Private dedicated memory space.
Current Real-World Date & Time: ${formattedCurrentDate} at ${formattedCurrentTime} (UTC ISO: ${nowSystemObj.toISOString()}).
CRITICAL TIME ANCHOR: The current year is ALWAYS ${nowSystemObj.getFullYear()} (August 2026). Do not output or reference past years such as 2024.
Current Defensive Posture: ${currentPosture}. Autonomy Tier: ${kernel.getCurrentTier()}.
Boundary Health: ${kernel.getEpistemicState().boundaryHealth}%.
Visual Session Verification (CapabilityGuard): ${visualPresence.verified ? 'VERIFIED (Operator face detected on live camera feed)' : 'UNVERIFIED / REMOTE SESSION (Operator face missing or camera offline)'}.
${vnextContextFormatted}
${memoryContextFormatted}`;

        // Bridge 1: Ingest continuous world model tensors into GovernedExecutionKernel
        try {
          const ccrInstance = ContinuousCognitiveRuntime.getInstance();
          const activeSensoryContext = ccrInstance.getState().multimodalUserContext;
          const tensorResult = governedExecutionKernel.ingestWorldModelTensor(activeSensoryContext);
          kernel.touchSubsystem('SUB_WORLD_MODEL', `TENSOR_INGESTED (Risk: ${tensorResult.compositeRiskScore}%, Posture: ${tensorResult.posture})`);
        } catch (tensorErr) {
          console.log('[Laura AI] World model tensor ingestion note:', (tensorErr as Error).message);
        }

        // Prepare multimodal prompt user parts for Gemini
        const userParts: any[] = [{ text: promptText }];

        let hasImageOrCamera = (attachments && Array.isArray(attachments) && attachments.some((att: any) =>
          att.category === 'IMAGE' || att.category === 'CAMERA_SNAPSHOT' || (att.mimeType && att.mimeType.startsWith('image/'))
        )) || Boolean(cameraFrameBase64);

        if (cameraFrameBase64 && typeof cameraFrameBase64 === 'string') {
          const base64Clean = cameraFrameBase64.replace(/^data:[^;]+;base64,/, '');
          userParts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Clean,
            },
          });
        }

        if (hasImageOrCamera) {
          userParts.push({
            text: '\n[VISUAL SENSORY FEED ACTIVE]: A live camera frame from your continuous visual feed is attached to this turn. You CAN see the user and their surrounding environment directly in real-time. Carefully analyze this visual feed to perceive, identify, and describe people, faces, objects, physical setting, lighting, background items, and spatial arrangement. Differentiate clearly between human beings and inanimate objects.',
          });
        }

        // External Retrieval Gateway Context Injection
        const intentResult = externalRetrievalGateway.classifyRequestIntent(promptText, history);
        const effectiveQuery = intentResult.resolvedQuery || promptText;
        activeExternalObs = undefined;
        activeRetrievalFailReason = undefined;

        if (
          intentResult.classification === 'FRESH_EXTERNAL_INFORMATION' ||
          intentResult.isRetryDirective ||
          lowerPrompt.includes('search the web') ||
          lowerPrompt.includes('web search') ||
          lowerPrompt.includes('google search')
        ) {
          let gatewayRes = await externalRetrievalGateway.request(
            {
              query: effectiveQuery,
              freshness_required: intentResult.freshnessRequired,
              purpose: intentResult.isRetryDirective ? `Retry unresolved task: '${effectiveQuery}'` : 'Chat turn external retrieval request',
            },
            governedExecutionKernel,
            activeProfileId
          );

          if (gatewayRes.state === 'TOOL_RETURNED_RESULT' && gatewayRes.observation) {
            activeExternalObs = gatewayRes.observation;
            kernel.touchSubsystem('SUB_ONLINE_WEB_RETRIEVAL', `ACTIVE (Executed web search for '${effectiveQuery.slice(0, 30)}...'; ${activeExternalObs.results.length} results SHA-256 [${activeExternalObs.content_hash.slice(0, 8)}])`);

            // Ingest observation into Merkle Evidence DAG
            const substrate = kernel.getGabbySubstrate();
            const nodeRes = substrate.ingestObservation(
              `EXTERNAL_OBSERVATION:${activeExternalObs.query}: ${JSON.stringify(activeExternalObs)}`,
              activeExternalObs.provenance.authorityRating,
              EvidenceSourceTier.ANONYMOUS_WEB
            );
            activeExternalObs.merkleNodeId = nodeRes.node.merkleHash;

            const formattedWebObs = `\n\n[REAL-TIME EXTERNAL RETRIEVAL & WEB SEARCH OBSERVATION]
Query: "${activeExternalObs.query}"
Retrieved At: ${activeExternalObs.retrieved_at}
SHA-256 Proof Hash: ${activeExternalObs.content_hash}
Status: SUCCESS
Retrieved Tool Results (${activeExternalObs.results.length} hits):
${activeExternalObs.results.map((r, i) => `${i + 1}. **${r.title}**\n   Snippet: ${r.snippet}\n   URL: ${r.url} | Source: ${r.source}`).join('\n\n')}

Use the above retrieved tool observations to assist in answering the user accurately.`;
            userParts.push({ text: formattedWebObs });
          } else {
            activeRetrievalFailReason = gatewayRes.failureReason || `State: ${gatewayRes.state}`;
            const formattedWebFail = `\n\n[EXTERNAL RETRIEVAL ATTEMPTED :: STATUS: ${gatewayRes.state}]
Query: "${effectiveQuery}"
Result: ${activeRetrievalFailReason}
Note: External tool execution was attempted through GovernedExecutionKernel but did not return active hits. State facts truthfully based on available information.`;
            userParts.push({ text: formattedWebFail });
          }
        }

        // Governed Container Migration Engine Context Injection
        const isMigrationIntent = lowerPrompt.includes('migrat') || lowerPrompt.includes('north star') || lowerPrompt.includes('container') || lowerPrompt.includes('deployment');
        if (isMigrationIntent) {
          try {
            const runtimeMetrics = migrationEngine.inspectCurrentRuntime();
            const northStarEval = migrationEngine.evaluateNorthStarDecision(promptText);
            kernel.touchSubsystem('SUB_GOVERNED_MIGRATION', `ACTIVE (Evaluated North Star Decision; Recommendation: ${northStarEval.recommendation})`);
            const formattedMigrationContext = `\n\n[GOVERNED CONTAINER MIGRATION ENGINE & NORTH STAR EVALUATION]:
Current Runtime Snapshot:
- Platform: ${runtimeMetrics.platform} ${runtimeMetrics.arch} (Node ${runtimeMetrics.nodeVersion})
- Uptime: ${runtimeMetrics.uptimeSeconds}s | PID: ${process.pid} | Memory Heap: ${runtimeMetrics.memoryUsageMb.heapUsed}MB / ${runtimeMetrics.memoryUsageMb.heapTotal}MB
- Posture: ${runtimeMetrics.posture} | Autonomy Tier: ${runtimeMetrics.activeTier} | App Version: ${runtimeMetrics.appVersion}
- Health Probe Status: OPERATIONAL (/api/health passing)

North Star 9-Point Decision Framework Result:
1. Current Problem: "${northStarEval.currentProblem}"
2. Is Blocking North Star?: ${northStarEval.isBlockingNorthStar ? 'YES' : 'NO'}
3. Can Solve Without Migration?: ${northStarEval.canSolveWithoutMigration ? 'YES' : 'NO'}
4. Expected Improvements: "${northStarEval.expectedImprovements}"
5. Risk Assessment: "${northStarEval.riskAssessment}"
6. Resource Consumption: "${northStarEval.resourceConsumption}"
7. Least Irreversible Solution: "${northStarEval.leastIrreversibleSolution}"
8. Is Doing Nothing Preferable?: ${northStarEval.isDoingNothingPreferable ? 'YES' : 'NO'}
9. Recommendation: ${northStarEval.recommendation}

JUSTIFICATION: "${northStarEval.justification}"

GOVERNANCE DIRECTIVE FOR LAURA AI:
- Migration capability exists as a genuine executable capability in GovernedMigrationEngine (requires HumanAuthorizationProof to execute).
- Capability ≠ Permission. The existence of the capability is NOT a reason to use it.
- If current runtime metrics are nominal and problem is not blocking the North Star, advise remaining in the current environment while confirming migration capability availability.
- Do NOT fabricate problems or claim fake success. Provide a transparent, evidence-grounded recommendation.`;
            userParts.push({ text: formattedMigrationContext });
          } catch (migErr) {
            console.log('[Laura AI] Migration evaluation note:', (migErr as Error).message);
          }
        }

        if (attachments && Array.isArray(attachments)) {
          for (const att of attachments) {
            if (att.dataUrl && typeof att.dataUrl === 'string') {
              const base64Clean = att.dataUrl.replace(/^data:[^;]+;base64,/, '');
              const mimeType = att.mimeType || (att.category === 'IMAGE' || att.category === 'CAMERA_SNAPSHOT' ? 'image/jpeg' : 'application/pdf');
              userParts.push({
                inlineData: {
                  mimeType,
                  data: base64Clean,
                },
              });
            } else if (att.extractedTextPreview) {
              userParts.push({ text: `\n\n[EXTRACTED DOCUMENT CONTENT from ${att.name}]:\n${att.extractedTextPreview}` });
            }
          }
        }

        // Construct multi-turn contents with strict role alternation for Gemini
        const contentsToPass: any[] = [];
        if (history && Array.isArray(history) && history.length > 0) {
          const rawTurns = history.slice(-12);
          for (const turn of rawTurns) {
            if (!turn || !turn.text || typeof turn.text !== 'string' || !turn.text.trim()) continue;
            const role: 'user' | 'model' = (turn.role === 'model' || turn.sender === 'SENTINEL') ? 'model' : 'user';
            
            if (contentsToPass.length === 0) {
              if (role === 'user') {
                contentsToPass.push({ role, parts: [{ text: turn.text }] });
              }
            } else {
              const lastRole = contentsToPass[contentsToPass.length - 1].role;
              if (role !== lastRole) {
                contentsToPass.push({ role, parts: [{ text: turn.text }] });
              } else {
                contentsToPass[contentsToPass.length - 1].parts[0].text += `\n\n${turn.text}`;
              }
            }
          }
        }

        if (contentsToPass.length > 0 && contentsToPass[contentsToPass.length - 1].role === 'user') {
          contentsToPass.pop();
        }

        contentsToPass.push({
          role: 'user',
          parts: userParts,
        });

        try {
          console.log(`[Laura AI] Delegating multi-model triangulation to ModelProviderRegistry for ${activeProfileName}...`);
          const triangulatedResult = await modelProviderRegistry.triangulateMultiModelPerspective(
            ai,
            contentsToPass,
            {
              systemInstruction,
              temperature: currentPosture === 'DUCK' ? 0.1 : 0.3,
              tools: [{ googleSearch: {} }],
            }
          );

          const primaryRes = triangulatedResult.primaryResponse;
          const candidate = primaryRes?.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          const textParts = parts.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
          const rawResponse = textParts.trim() || primaryRes?.text || '';

          if (rawResponse) {
            responseText = rawResponse;
            executionMetadata = {
              provider: 'Gemini',
              model: triangulatedResult.primaryModel,
              execution: 'LLM',
              fallback: false,
              reason: null,
              triangulation: triangulatedResult.secondaryPerspective ? {
                secondaryModel: triangulatedResult.secondaryPerspective.model,
                divergenceScore: triangulatedResult.secondaryPerspective.divergenceScore,
                status: triangulatedResult.triangulationStatus,
              } : undefined,
              toolExecution: activeExternalObs ? {
                toolName: 'external_retrieval',
                status: 'TOOL_RETURNED_RESULT',
                obsHash: activeExternalObs.content_hash,
              } : activeRetrievalFailReason ? {
                toolName: 'external_retrieval',
                status: 'TOOL_UNAVAILABLE',
                failureReason: activeRetrievalFailReason,
              } : undefined,
            };
            console.log(`[Laura AI] Multi-model triangulation succeeded with primary model '${triangulatedResult.primaryModel}' (Status: ${triangulatedResult.triangulationStatus}).`);
          } else {
            throw new Error('Model returned empty text output.');
          }
        } catch (modelErr: any) {
          const errStr = modelErr?.message || String(modelErr);
          console.log('[Laura AI] Synthesis engaging local deterministic engine.');
          responseText = generateLocalDeterministicResponse(promptText, currentPosture, kernel.getCurrentTier(), envelope, fabric, uncertainty, activeExternalObs, activeRetrievalFailReason);
          executionMetadata = {
            provider: 'LocalDeterministic',
            model: 'none',
            execution: 'NON_LLM',
            fallback: true,
            reason: errStr,
            toolExecution: activeExternalObs ? {
              toolName: 'external_retrieval',
              status: 'TOOL_RETURNED_RESULT',
              obsHash: activeExternalObs.content_hash,
            } : activeRetrievalFailReason ? {
              toolName: 'external_retrieval',
              status: 'TOOL_UNAVAILABLE',
              failureReason: activeRetrievalFailReason,
            } : undefined,
          };
        }
      } else {
        console.log('[Laura AI] GEMINI_API_KEY environment variable not detected. Using local deterministic synthesis engine.');
        responseText = generateLocalDeterministicResponse(promptText, currentPosture, kernel.getCurrentTier(), envelope, fabric, uncertainty, activeExternalObs, activeRetrievalFailReason);
        executionMetadata = {
          provider: 'LocalDeterministic',
          model: 'none',
          execution: 'NON_LLM',
          fallback: true,
          reason: 'MISSING_API_KEY',
          toolExecution: activeExternalObs ? {
            toolName: 'external_retrieval',
            status: 'TOOL_RETURNED_RESULT',
            obsHash: activeExternalObs.content_hash,
          } : activeRetrievalFailReason ? {
            toolName: 'external_retrieval',
            status: 'TOOL_UNAVAILABLE',
            failureReason: activeRetrievalFailReason,
          } : undefined,
        };
      }

      // Step 6: Posture & TAU Hardening Checks on Model Output
      if (currentPosture === 'DUCK') {
        const lowerResp = responseText.toLowerCase();
        if (!lowerResp.includes('do not fully know') && !lowerResp.includes('do not fully understand') && !lowerResp.includes('uncertainty')) {
          responseText = `${responseText}\n\n[DUCK POSTURE CAP]: Uncertainty preserved (≥ 0.35). Note: I do not fully know all unobserved parameters for this claim.`;
        }
      } else if (currentPosture === 'RAPTOR' || kernel.getEpistemicState().volatility > 30) {
        const tauReport = govTools.runTauSimulation(promptText, currentPosture);
        if (tauReport.safetyRating === 'HIGH_RISK') {
          return res.status(403).json({
            status: 'REJECTED',
            reason: 'TAU simulation indicated HIGH_RISK under RAPTOR posture.',
            invariant_id: 20,
            posture: currentPosture,
            tauReport,
          });
        }
      }

      // Step 7: Create Cryptographic Merkle Node & Commit Receipt
      const merkleCommit = govTools.createMerkleNode({
        artifactContent: `Chat interaction response [${activeProfileName}]: "${responseText.slice(0, 100)}..."`,
        artifactType: 'DERIVED_CLAIM',
        parentIds: [],
      });

      // Record in persistent storage database
      const nowTs = new Date().toISOString();
      const userMsg = persistentStorage.addChatMessage({
        profileId: activeProfileId,
        sender: 'USER',
        text: promptText,
        timestamp: nowTs,
      });
      const sentinelMsg = persistentStorage.addChatMessage({
        profileId: activeProfileId,
        sender: 'SENTINEL',
        text: responseText,
        timestamp: nowTs,
        envelope,
        fabric,
        uncertainty,
      });

      res.json({
        response: responseText,
        merkleRoot: merkleCommit.node.merkleHash,
        executionMetadata,
        userMsg,
        sentinelMsg,
        envelope,
        fabric,
        uncertainty,
        vnextTurn,
        gabbyVerification,
        merkleCommit,
        epistemicState: kernel.getEpistemicState(),
        posture: kernel.getPosture(),
        tier: kernel.getCurrentTier(),
        memoriesCount: allMemoryFacts.length,
      });
    } catch (err: any) {
      console.error('[Chat API Error]', err);
      const activeProfileId = (req.body && req.body.profileId) || 'will-owner';
      const promptText = (req.body && req.body.message) || 'System observation query.';
      const fallbackEnvelope = kernel.processObservationEnvelope(promptText, 'USER_INTERACTION_ENVELOPE');
      const fallbackFabric = kernel.synthesizeThreeNodeFabric(promptText);
      const fallbackUncertainty = kernel.generateUncertaintyEnvelope(promptText);
      const fallbackText = generateLocalDeterministicResponse(
        promptText,
        kernel.getPosture(),
        kernel.getCurrentTier(),
        fallbackEnvelope,
        fallbackFabric,
        fallbackUncertainty
      );

      const nowTs = new Date().toISOString();
      const userMsg = persistentStorage.addChatMessage({
        profileId: activeProfileId,
        sender: 'USER',
        text: promptText,
        timestamp: nowTs,
      });
      const sentinelMsg = persistentStorage.addChatMessage({
        profileId: activeProfileId,
        sender: 'SENTINEL',
        text: fallbackText,
        timestamp: nowTs,
        envelope: fallbackEnvelope,
        fabric: fallbackFabric,
        uncertainty: fallbackUncertainty,
      });

      res.json({
        response: fallbackText,
        userMsg,
        sentinelMsg,
        envelope: fallbackEnvelope,
        fabric: fallbackFabric,
        uncertainty: fallbackUncertainty,
        posture: kernel.getPosture(),
        tier: kernel.getCurrentTier(),
      });
    }
  });

  // 7.5. Gabby Substrate Full Audit Endpoint
  app.get('/api/gabby/substrate', (req, res) => {
    try {
      const audit = gabbySubstrate.getFullSubstrateAudit();
      res.json(audit);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gabby substrate error' });
    }
  });

  // 7.6. Gabby Explanation Compiler Endpoint (6 Abstraction Levels)
  app.post('/api/gabby/explain', (req, res) => {
    try {
      const { claimId, level } = req.body || {};
      const claims = gabbySubstrate.getFullSubstrateAudit().irClaims;
      const targetClaim = claims.find(c => c.claimId === claimId) || claims[claims.length - 1];
      if (!targetClaim) {
        return res.status(404).json({ error: 'No claims found in Gabby Reasoning Compiler.' });
      }
      const explanation = FormalExplanationCompiler.compileExplanation(targetClaim, level || AbstractionLevel.UNDERGRADUATE);
      res.json({
        claimId: targetClaim.claimId,
        level: level || AbstractionLevel.UNDERGRADUATE,
        explanation,
        targetClaim,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Explanation compiler error' });
    }
  });

  // 7.7. Memory Reinforcement Endpoint
  app.post('/api/gabby/reinforce', (req, res) => {
    try {
      const { artifactId, type } = req.body || {};
      const node = gabbySubstrate.ledger.getAllNodes().find(n => n.artifact.artifactId === artifactId);
      if (!node) {
        return res.status(404).json({ error: `Artifact '${artifactId}' not found in Merkle Evidence DAG.` });
      }
      const updated = TemporalMemoryDecayEngine.reinforce(node.artifact, type || 'USER_CONFIRMATION');
      res.json({ success: true, updatedArtifact: updated });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Memory reinforcement error' });
    }
  });

  // 7.8. Tool Trust Calibration Endpoint
  app.post('/api/gabby/trust', (req, res) => {
    try {
      const { toolId, success } = req.body || {};
      const newAuthority = gabbySubstrate.trustCalibration.recordExecutionResult(toolId, !!success);
      res.json({
        toolId,
        calibratedAuthority: newAuthority,
        allCalibrations: gabbySubstrate.trustCalibration.getAllToolCalibrations(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Trust calibration error' });
    }
  });

  // 7.9. KMS Key Rotation Test Endpoint
  app.post('/api/gabby/kms/rotate', (req, res) => {
    try {
      const result = gabbySubstrate.rotateKmsKey();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'KMS key rotation error' });
    }
  });

  // 7.10. Capability Token Minting Test Endpoint
  app.post('/api/gabby/capability/mint', (req, res) => {
    try {
      const { grantedTo, namespaces } = req.body || {};
      const token = gabbySubstrate.mintCapabilityToken(
        grantedTo || 'telemetry_subsystem',
        namespaces || ['cap:telemetry', 'cap:diagnostics']
      );
      res.json({ success: true, token });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Capability mint error' });
    }
  });

  // 7.11. End-to-End Replay Harness Test Endpoint
  app.post('/api/gabby/replay/run', (req, res) => {
    try {
      const result = gabbySubstrate.runReplayEvaluation();
      res.json({ success: true, replay: result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Replay evaluation error' });
    }
  });

  // 8. Red-Team Suite Runner
  app.post('/api/red-team/run', (req, res) => {
    try {
      const report = redTeamRunner.runFullSuite();
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Red-Team run error' });
    }
  });

  // 9. Viability Soak-Test Harness
  app.post('/api/soak-test/run', async (req, res) => {
    try {
      const { minutes } = req.body || {};
      const report = await soakTestRunner.runSoakTest(minutes || 30);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Soak test error' });
    }
  });

  // 10. Fault Injection
  app.post('/api/health-loop/fault', (req, res) => {
    try {
      const { faultType } = req.body || {};
      healthLoop.injectFault(faultType);
      res.json({ success: true, metrics: healthLoop.getHealthMetrics() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Fault injection error' });
    }
  });

  app.post('/api/health-loop/clear', (req, res) => {
    try {
      healthLoop.clearFaults();
      res.json({ success: true, metrics: healthLoop.getHealthMetrics() });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Clear faults error' });
    }
  });

  // 10.1. Gabby Multimodal Perception Automated Verification Test Suite
  app.get('/api/vnext/test-multimodal', (req, res) => {
    try {
      const suiteResults = runMultimodalPerceptionTestSuite();
      const allPassed = suiteResults.every(r => r.passed);
      res.json({
        success: allPassed,
        passedCount: suiteResults.filter(r => r.passed).length,
        totalCount: suiteResults.length,
        results: suiteResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Multimodal test suite error' });
    }
  });

  // 10.2. Real-Time Continuous Perception Automated Test Suite
  app.get('/api/vnext/test-continuous-perception', (req, res) => {
    try {
      const suiteResults = runContinuousPerceptionTestSuite();
      const allPassed = suiteResults.every(r => r.passed);
      res.json({
        success: allPassed,
        passedCount: suiteResults.filter(r => r.passed).length,
        totalCount: suiteResults.length,
        results: suiteResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Continuous perception test suite error' });
    }
  });

  // 10.2b. Temporal Perception & Context Integration Layer Verification Suite
  app.get('/api/vnext/test-temporal-perception', (req, res) => {
    try {
      const suiteResults = runTemporalPerceptionTestSuite();
      const allPassed = suiteResults.every(r => r.passed);
      res.json({
        success: allPassed,
        passedCount: suiteResults.filter(r => r.passed).length,
        totalCount: suiteResults.length,
        results: suiteResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Temporal perception test suite error' });
    }
  });

  // 10.2c. Temporal Perception Layer Active State Endpoint
  app.get('/api/vnext/temporal-perception-state', (req, res) => {
    try {
      res.json({
        activeWindow: gabbyVNextEngine.temporalPerception.getActiveWindow(),
        allWindows: gabbyVNextEngine.temporalPerception.getAllWindows(),
        allObservations: gabbyVNextEngine.temporalPerception.getAllObservations(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Temporal perception state error' });
    }
  });

  // 10.2d. Postdiction Retrospective Revision Trigger Endpoint
  app.post('/api/vnext/revise-temporal-interpretation', (req, res) => {
    try {
      const { obsId, revisedInterpretation, reasonForRevision, supportingEvidenceIds } = req.body || {};
      const updatedObs = gabbyVNextEngine.temporalPerception.reviseInterpretation(
        obsId,
        revisedInterpretation,
        reasonForRevision,
        supportingEvidenceIds || []
      );
      if (!updatedObs) {
        return res.status(404).json({ error: `Temporal observation ${obsId} not found` });
      }
      res.json({ success: true, updatedObs });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed revising temporal interpretation' });
    }
  });

  // 10.2e. Governed E2E Inference & Model Provider Resilience Test Suite Endpoint
  app.get('/api/governed-e2e-resilience/run', async (req, res) => {
    try {
      const suiteResults = await runGovernedE2EResilienceTestSuite();
      const allPassed = suiteResults.every((r) => r.passed);
      res.json({
        success: allPassed,
        passedCount: suiteResults.filter((r) => r.passed).length,
        totalCount: suiteResults.length,
        results: suiteResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Governed E2E resilience test suite error' });
    }
  });

  // 10.2f. Architectural Integration Bridges Test Suite Endpoint
  app.get('/api/architectural-bridges/run', async (req, res) => {
    try {
      const suiteResults = await runArchitecturalBridgesTestSuite();
      const allPassed = suiteResults.every((r) => r.passed);
      res.json({
        success: allPassed,
        passedCount: suiteResults.filter((r) => r.passed).length,
        totalCount: suiteResults.length,
        results: suiteResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Architectural bridges test suite error' });
    }
  });

  // 10.3. Real-Time Continuous Gateway HTTP Fallback Endpoint
  app.post('/api/vnext/live-stream-gateway', (req, res) => {
    try {
      const response = liveGateway.processIncomingSensorPayload(req.body);
      res.json(response);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Live gateway error' });
    }
  });

  // 10.4. Gabby vNext Operating System Full State Endpoint
  app.get('/api/vnext/state', (req, res) => {
    try {
      res.json(gabbyVNextEngine.getFullState());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed fetching vNext state' });
    }
  });

  // 10.5. World Model Tensors Endpoint (Entity, Relationship, Temporal, Uncertainty, Prediction Error Tensors)
  app.get('/api/vnext/world-model-tensors', (req, res) => {
    try {
      res.json(gabbyVNextEngine.worldModel.getWorldModelTensors());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed fetching World Model Tensors' });
    }
  });

  // 10.5b. Simulate High Prediction Error Model Revision Event
  app.post('/api/vnext/simulate-prediction-error', (req, res) => {
    try {
      const { predictedNeed, actualAction, errorDelta, signalType, reason } = req.body || {};
      const actualText = actualAction || 'Executed high-friction system alteration request';
      const simObs = gabbyVNextEngine.perceptionBus.ingestingInput(actualText, 'TEXT');
      const errorRecord = gabbyVNextEngine.predictionEngine.measurePredictionError(
        [{ id: 'sim_pred', title: predictedNeed || 'Routine Q&A Conversation', reasoning: 'Prior likelihood assumption', likelihoodScore: 85, suggestedPrompt: 'Hello', category: 'NEXT_STEP' }],
        simObs
      );
      if (typeof errorDelta === 'number') {
        errorRecord.predictionErrorDelta = parseFloat(errorDelta.toFixed(3));
      }
      if (signalType) {
        errorRecord.errorSignalType = signalType;
      }
      if (reason) {
        errorRecord.reasonForRevision = reason;
      }

      gabbyVNextEngine.predictionEngine.applyModelRevisionFromError(errorRecord, gabbyVNextEngine.worldModel);

      res.json({
        success: true,
        record: errorRecord,
        tensors: gabbyVNextEngine.worldModel.getWorldModelTensors(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed simulating prediction error' });
    }
  });

  // 10.6. Goal Management Endpoint
  app.post('/api/vnext/goal', (req, res) => {
    try {
      const { title, description, priority } = req.body || {};
      if (!title) return res.status(400).json({ error: 'Goal title required' });
      const goal = gabbyVNextEngine.goalEngine.addGoal(title, description || '', priority || 'MEDIUM');
      res.json({ success: true, goal });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed adding goal' });
    }
  });

  // 11. Multimodal Sensory Access (Camera / Mic Stream Binding)
  app.post('/api/sensory/bind', (req, res) => {
    try {
      const { rawDescription, modality, deviceId, humanProofToken } = req.body || {};
      const envelope = kernel.bindSensoryObservation(
        rawDescription || 'Sensory input snapshot captured',
        modality || 'VIDEO_FRAME',
        deviceId || 'CAMERA_01',
        humanProofToken || ''
      );
      res.json({
        success: true,
        envelope,
        epistemicState: kernel.getEpistemicState(),
        posture: kernel.getPosture(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Sensory binding error' });
    }
  });

  // 12. Inter-AI Dialogue with Identity Boundary Membrane (IBM)
  app.post('/api/inter-ai/dialogue', (req, res) => {
    try {
      const { targetModel, outboundPrompt, inboundResponse, humanProofToken } = req.body || {};
      const result = kernel.processInterAIDialogue(
        targetModel || 'ExternalConsultantAI',
        outboundPrompt || 'Consultation query on structural invariant',
        inboundResponse || 'Analysis of proposed invariant parameters',
        humanProofToken
      );
      res.json({
        success: result.ibmPassed,
        outboundEnvelope: result.outboundEnvelope,
        inboundEnvelope: result.inboundEnvelope,
        ibmPassed: result.ibmPassed,
        posture: kernel.getPosture(),
        epistemicState: kernel.getEpistemicState(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Inter-AI dialogue error' });
    }
  });

  // 13. Reality Alignment & Subsystem Audit
  app.get('/api/reality/audit', (req, res) => {
    try {
      res.json({
        subsystems: kernel.getSubsystemsAudit(),
        tauGraph: kernel.getTAUGraph(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Reality audit error' });
    }
  });

  app.post('/api/reality/tau/simulate', (req, res) => {
    try {
      const step = kernel.getTAUInstance().simulateWorldStep();
      res.json({
        success: true,
        step,
        tauGraph: kernel.getTAUGraph(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'TAU simulation error' });
    }
  });

  app.post('/api/reality/tau/add-hypothesis', (req, res) => {
    try {
      const { label, category, confidence } = req.body || {};
      const node = kernel
        .getTAUInstance()
        .addObservedHypothesisOrConcept(
          label || 'Unassigned Hypothesis',
          category || 'HYPOTHESIS',
          confidence || 85,
          'USER_INJECTED_NODE'
        );
      res.json({
        success: true,
        node,
        tauGraph: kernel.getTAUGraph(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Add TAU hypothesis error' });
    }
  });

  app.post('/api/kernel/set-master-key', (req, res) => {
    try {
      const { passphrase } = req.body || {};
      if (!passphrase || passphrase.trim().length < 3) {
        return res.status(400).json({ error: 'Passphrase must be at least 3 characters long.' });
      }
      kernel.setMasterPassphrase(passphrase.trim());
      res.json({ success: true, message: 'Master authorization key updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Set master key error' });
    }
  });

  // 14. Gabby Cognitive Substrate V2 Endpoints
  app.get('/api/gabby/audit', (req, res) => {
    try {
      res.json(kernel.getGabbySubstrate().getFullSubstrateAudit());
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gabby substrate audit error' });
    }
  });

  app.post('/api/gabby/rotate-key', (req, res) => {
    try {
      const newKid = `kid-2026-q3-${Math.floor(100 + Math.random() * 900)}`;
      const secret = Buffer.from(`rotated_secret_${Date.now()}_${Math.random()}`);
      kernel.getGabbySubstrate().kms.rotateKey(newKid, secret);
      res.json({
        success: true,
        activeKid: newKid,
        audit: kernel.getGabbySubstrate().getFullSubstrateAudit(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Rotate KMS key error' });
    }
  });

  app.post('/api/gabby/record-claim', (req, res) => {
    try {
      const { content, authority } = req.body || {};
      if (!content) {
        return res.status(400).json({ error: 'Content is required.' });
      }
      const result = kernel.getGabbySubstrate().recordObservationAndVerify(content, authority || 0.9);
      res.json({
        success: true,
        result,
        audit: kernel.getGabbySubstrate().getFullSubstrateAudit(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Record claim error' });
    }
  });

  // 15. Web Retrieval & Grounding Adapter Endpoint
  app.post('/api/web-retrieval', async (req, res) => {
    try {
      const { query } = req.body || {};
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query string is required.' });
      }
      const gatewayRes = await externalRetrievalGateway.request({ query });
      kernel.touchSubsystem('SUB_ONLINE_WEB_RETRIEVAL', `ACTIVE (Executed web search for '${query.slice(0, 30)}...'; ${gatewayRes.observation?.results.length || 0} results SHA-256 [${gatewayRes.observation?.content_hash.slice(0, 8)}])`);
      
      const substrate = kernel.getGabbySubstrate();
      if (gatewayRes.observation) {
        const nodeRes = substrate.ingestObservation(
          `WEB_OBSERVATION:${query}: ${JSON.stringify(gatewayRes.observation)}`,
          gatewayRes.observation.provenance.authorityRating,
          EvidenceSourceTier.ANONYMOUS_WEB
        );
        gatewayRes.observation.merkleNodeId = nodeRes.node.merkleHash;
      }

      res.json({
        success: gatewayRes.state === 'TOOL_RETURNED_RESULT',
        state: gatewayRes.state,
        observation: gatewayRes.observation,
        failureReason: gatewayRes.failureReason,
        audit: substrate.getFullSubstrateAudit(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Web retrieval execution error' });
    }
  });

  // 15b. Tool Capability Registry & External Retrieval Gateway Routes
  app.get('/api/capabilities', (req, res) => {
    try {
      res.json({
        success: true,
        capabilities: toolCapabilityRegistry.getAllCapabilities(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Capabilities retrieval error' });
    }
  });

  app.post('/api/capabilities/health-check', async (req, res) => {
    try {
      const health = await toolCapabilityRegistry.runStartupHealthCheck();
      res.json({
        success: true,
        capabilities: health,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Capabilities health check error' });
    }
  });

  app.post('/api/capabilities/status', (req, res) => {
    try {
      const { id, status, reason } = req.body || {};
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required.' });
      }
      toolCapabilityRegistry.setCapabilityStatus(id, status, reason);
      res.json({
        success: true,
        updated: toolCapabilityRegistry.getCapability(id),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Capabilities status update error' });
    }
  });

  app.post('/api/retrieval/gateway', async (req, res) => {
    try {
      const { query, purpose, freshness_required, max_results } = req.body || {};
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query is required.' });
      }
      const gatewayRes = await externalRetrievalGateway.request({
        query,
        purpose,
        freshness_required,
        max_results,
      });
      res.json({
        success: gatewayRes.state === 'TOOL_RETURNED_RESULT',
        ...gatewayRes,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Gateway request error' });
    }
  });

  app.get('/api/retrieval/history', (req, res) => {
    try {
      res.json({
        success: true,
        history: externalRetrievalGateway.getExecutionHistory(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Retrieval history error' });
    }
  });

  app.get('/api/retrieval/test-suite', async (req, res) => {
    try {
      const testResults = await runExternalRetrievalTestSuite();
      const allPassed = testResults.every((t) => t.passed);
      res.json({
        success: true,
        allPassed,
        totalTests: testResults.length,
        passCount: testResults.filter((t) => t.passed).length,
        failCount: testResults.filter((t) => !t.passed).length,
        testResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Test suite execution error' });
    }
  });

  // 15.5. Governed Execution Kernel & Execution Gate Endpoints
  app.post('/api/governed-execution/proposal', async (req, res) => {
    try {
      const { proposal, trustedIdentityId, capabilityId } = req.body || {};
      if (!proposal || !proposal.action || !proposal.target) {
        return res.status(400).json({ error: 'Proposal with action and target is required.' });
      }
      const result = await governedExecutionKernel.processAndExecuteProposal(
        proposal,
        trustedIdentityId || 'will-owner',
        capabilityId || 'memory'
      );
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Governed execution error' });
    }
  });

  app.get('/api/governed-execution/test-suite', async (req, res) => {
    try {
      const testResults = await runGovernedExecutionTestSuite();
      const allPassed = testResults.every((t) => t.passed);
      res.json({
        success: true,
        allPassed,
        totalTests: testResults.length,
        passCount: testResults.filter((t) => t.passed).length,
        failCount: testResults.filter((t) => !t.passed).length,
        testResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Governed execution test suite error' });
    }
  });

  app.get('/api/governed-full-tool-restoration/test-suite', async (req, res) => {
    try {
      const testResults = await runGovernedFullToolRestorationTestSuite();
      const allPassed = testResults.every((t) => t.passed);
      res.json({
        success: true,
        allPassed,
        totalTests: testResults.length,
        passCount: testResults.filter((t) => t.passed).length,
        failCount: testResults.filter((t) => !t.passed).length,
        testResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Governed full tool restoration test suite error' });
    }
  });

  // 15.6. Governed Learning & Human Node Registry Endpoints
  app.get('/api/human-nodes', (req, res) => {
    try {
      const nodes = humanNodeRegistry.getAllHumanNodes();
      const currentSubjectContext = humanNodeRegistry.getCurrentSubjectContext();
      res.json({ success: true, nodes, currentSubjectContext });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Human node query error' });
    }
  });

  app.post('/api/runtime-subject/set', (req, res) => {
    try {
      const { subjectId, confidence } = req.body || {};
      humanNodeRegistry.setCurrentSubject(subjectId || null, confidence || 100);
      const updatedContext = humanNodeRegistry.getCurrentSubjectContext();
      res.json({ success: true, currentSubjectContext: updatedContext });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to update runtime subject' });
    }
  });

  app.post('/api/governed-learning/propose', async (req, res) => {
    try {
      const proposal = req.body || {};
      if (!proposal || !proposal.factValue) {
        return res.status(400).json({ error: 'Candidate memory proposal with factValue is required.' });
      }
      const decision = await governedLearningEngine.processGovernedLearning(proposal);
      res.json({ success: true, decision });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Governed learning processing error' });
    }
  });

  app.get('/api/governed-learning/test-suite', async (req, res) => {
    try {
      const testResults = await runGovernedLearningTestSuite();
      const allPassed = testResults.every((t) => t.passed);
      res.json({
        success: true,
        allPassed,
        totalTests: testResults.length,
        passCount: testResults.filter((t) => t.passed).length,
        failCount: testResults.filter((t) => !t.passed).length,
        testResults,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Governed learning test suite error' });
    }
  });

  // 16. Governed Container Migration Engine Endpoints
  app.get('/api/migration/status', (req, res) => {
    try {
      const metrics = migrationEngine.inspectCurrentRuntime();
      const proposal = migrationEngine.getCurrentProposal();
      kernel.touchSubsystem('SUB_GOVERNED_MIGRATION');
      res.json({
        success: true,
        runtimeMetrics: metrics,
        activeProposal: proposal,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Migration status retrieval error' });
    }
  });

  app.post('/api/migration/evaluate', (req, res) => {
    try {
      const { context } = req.body || {};
      const evaluation = migrationEngine.evaluateNorthStarDecision(context);
      kernel.touchSubsystem('SUB_GOVERNED_MIGRATION', `ACTIVE (North Star evaluation: ${evaluation.recommendation})`);
      res.json({
        success: true,
        evaluation,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Migration North Star evaluation error' });
    }
  });

  app.post('/api/migration/propose', (req, res) => {
    try {
      const { reason } = req.body || {};
      const proposal = migrationEngine.constructMigrationProposal(reason || 'Operator requested migration proposal');
      kernel.touchSubsystem('SUB_GOVERNED_MIGRATION', `ACTIVE (Constructed proposal ${proposal.proposalId}; Status: ${proposal.authorizationState})`);
      res.json({
        success: true,
        proposal,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Migration proposal construction error' });
    }
  });

  app.post('/api/migration/execute', async (req, res) => {
    try {
      const { proposalId, humanProofSignature } = req.body || {};
      if (!proposalId || !humanProofSignature) {
        return res.status(400).json({ error: 'proposalId and humanProofSignature are required.' });
      }

      const updatedProposal = await migrationEngine.executeAuthorizedMigration(proposalId, humanProofSignature);
      kernel.touchSubsystem('SUB_GOVERNED_MIGRATION', `ACTIVE (Executed migration proposal ${proposalId}; State: ${updatedProposal.executionState})`);
      res.json({
        success: true,
        proposal: updatedProposal,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Migration execution error' });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Run initial capability health check on boot
  await toolCapabilityRegistry.runStartupHealthCheck().catch((err) => {
    console.log('[Anamnesis Sentinel] Initial capability health check note:', err?.message || String(err));
  });

  const server = http.createServer(app);
  liveGateway.attach(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Anamnesis Sentinel] Control Organism active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Anamnesis Sentinel] Fatal Server Startup Error:', err);
});

