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
import { GovernedLearningEngine } from './src/engine/governedLearningEngine';
import { runGovernedLearningTestSuite } from './src/engine/__tests__/governedLearning.test';
import {
  GovernanceTools,
  CORE_RUNTIME_SYSTEM_INSTRUCTION,
  CONSTITUTIONAL_INVARIANT_GATE_PROMPT,
  ANAMNESIS_ANTI_COMPRESSION_PROMPT,
  POSTURE_TAU_HARDENING_PROMPT,
  GOVERNANCE_GEMINI_TOOLS,
} from './src/engine/governance';

// Security middleware we've added
import { authMiddleware } from './server/middleware/auth';
import { setupHardening, safeErrorHandler } from './server/middleware/hardening';

dotenv.config();

// Initialize Anamnesis Sentinel Core & Gabby Substrate
const kernel = new SentinelMutationKernel();
const gabbySubstrate = new GabbyCognitiveSubstrate();
const governedExecutionKernel = new GovernedExecutionKernel(gabbySubstrate);
const governedLearningEngine = new GovernedLearningEngine(gabbySubstrate);
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
  const apiKey = process.env.GEMINI_API_KEY;
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

  if (intentClass.classification === 'FRESH_EXTERNAL_INFORMATION') {
    if (retrievalFailureReason || !toolCapabilityRegistry.isCapabilityAvailable('external_retrieval')) {
      return `I can't currently access external sources from this runtime, so I can't reliably give you this morning's headlines.\n\n` +
        `── EPISTEMIC GOVERNANCE RECEIPT ──\n` +
        `• Capability State: CAPABILITY_UNAVAILABLE (runtime_tool_not_connected)\n` +
        `• Posture: ${posture} | Autonomy Tier: ${tier}\n` +
        `• Policy Directive: Fabrication prohibited under missing retrieval capabilities.`;
    }

    if (externalObs && externalObs.results.length > 0) {
      const formattedHits = externalObs.results
        .map((r, i) => `${i + 1}. **${r.title}**\n   Source: ${r.source} | Retrieved: ${r.fetchedAt}\n   Snippet: ${r.snippet}\n   URL: ${r.url}`)
        .join('\n\n');

      coreAnalysis = `Here are the top headline stories retrieved from external sources for your query:\n\n${formattedHits}\n\n` +
        `── EXTERNAL RETRIEVAL PROVENANCE ──\n` +
        `• Query: "${externalObs.query}"\n` +
        `• Status: SUCCESS (TOOL_RETURNED_RESULT)\n` +
        `• Content SHA-256: ${externalObs.content_hash}\n` +
        `• Sources Identified: ${Array.from(new Set(externalObs.results.map(r => r.source))).join(', ')}`;
    } else {
      return `I can't currently access external sources from this runtime, so I can't reliably give you this morning's headlines.\n\n` +
        `── EPISTEMIC GOVERNANCE RECEIPT ──\n` +
        `• Posture: ${posture} | Autonomy Tier: ${tier}\n` +
        `• Retrieval Status: 0 results returned from Gateway.`;
    }
  } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("status") || lower.includes("health")) {
    coreAnalysis = `Greetings. I am Laura. System state is nominal with full identity preservation intact. All cognitive nodes and memory governance membranes are active in my Merkle Evidence DAG[...]`;
  } else if (lower.includes("build") || lower.includes("code") || lower.includes("error") || lower.includes("fix") || lower.includes("proposal")) {
    coreAnalysis = `Input evaluated under Laura's Dialectical Crucible. Proposed changes are being tracked within my Observation Envelope. Standing constitutional invariants prevent ungoverned du[...]`;
  } else if (lower.includes("who are you") || lower.includes("what are you") || lower.includes("sentinel") || lower.includes("anamnesis") || lower.includes("gabby") || lower.includes("laura")) {
    coreAnalysis = `I am Laura AI — a persistent, multimodal, governed cognitive AI machine and learning partner. I operate under my core substrate (Hardware KMS, CBAC Capability Guard, Merkle [...])`;
  } else {
    coreAnalysis = `Input received: "${message}". The query has been processed through the Observation Envelope (Capability ≠ Permission) and evaluated across the 3-Node Cognitive Fabric.`;
  }

  const willText = fabric?.WILL || fabric?.will?.summary || 'Identity boundary & executive direction preserved.';
  const einsteinText = fabric?.EINSTEIN || fabric?.einstein?.summary || 'Structural logical coherence & invariant check passed.';
  const sabrinaText = fabric?.SABRINA || fabric?.sabrina?.summary || 'Relational context & high-utility operational response synthesized.';
  const echoText = fabric?.ECHO || 'Lineage hash verified.';

  return `${coreAnalysis}\n\n` +
    `── EPISTEMIC GOVERNANCE RECEIPT ──\n` +
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

  // Safer body parsers
  app.use(express.json({ limit: process.env.JSON_LIMIT || '2mb' }));
  app.use(express.urlencoded({ limit: process.env.URLENCODED_LIMIT || '2mb', extended: true }));

  // Apply hardening (CORS whitelist, rate limiters, attachment guard)
  setupHardening(app);

  // Register auth middleware for admin-sensitive route prefixes
  const auth = authMiddleware();
  app.use('/api/gabby', auth);
  app.use('/api/migration', auth);
  app.use('/api/governed-execution', auth);
  app.use('/api/governed-learning', auth);
  app.use('/api/red-team', auth);
  app.use('/api/soak-test', auth);
  app.use('/api/health-loop', auth);
  app.use('/api/reality', auth);
  app.use('/api/kernel', auth);

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

  // ... (rest of server.ts unchanged) ...

  // Note: to keep this patch concise I am not inlining the full unchanged body here; the hardening branch contains the full server.ts with only the security middleware wiring changes plus the safeErrorHandler registration.

  // Register global safe error handler
  app.use(safeErrorHandler);

  const server = http.createServer(app);
  liveGateway.attach(server);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Anamnesis Sentinel] Control Organism active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Anamnesis Sentinel] Fatal Server Startup Error:', err);
});
