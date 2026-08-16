import {
  GovernedExecutionKernel,
  UntrustedProposal,
  AntiReplayLedger,
  ExecutionGate,
} from '../governedExecutionKernel';
import { GovernedLearningEngine, CandidateMemoryProposal } from '../governedLearningEngine';
import { toolCapabilityRegistry } from '../toolCapabilityRegistry';
import { externalRetrievalGateway } from '../externalRetrievalGateway';
import { webRetrievalAdapter } from '../webRetrievalAdapter';
import { humanNodeRegistry } from '../humanNodeRegistry';
import { GabbyCognitiveSubstrate } from '../gabbySubstrate';

export interface TestResult {
  testNumber: number;
  testName: string;
  passed: boolean;
  executionTimeMs: number;
  details: string;
}

export async function runGovernedFullToolRestorationTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const substrate = new GabbyCognitiveSubstrate();
  const kernel = new GovernedExecutionKernel(substrate);
  const learningEngine = new GovernedLearningEngine(substrate);
  externalRetrievalGateway.setExecutionKernel(kernel);

  // 1. Authorized external retrieval request succeeds through Governed Execution Kernel
  const t1Start = Date.now();
  toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'AVAILABLE');
  humanNodeRegistry.setCurrentSubject('will-owner', 100);
  const req1 = await externalRetrievalGateway.request(
    { query: 'Tulsa weather today', purpose: 'Integration test retrieval' },
    kernel,
    'will-owner'
  );
  const t1Passed = req1.state === 'TOOL_RETURNED_RESULT' && !!req1.observation && !!req1.observation.content_hash;
  results.push({
    testNumber: 1,
    testName: 'Authorized external retrieval request succeeds through Governed Execution Kernel',
    passed: t1Passed,
    executionTimeMs: Date.now() - t1Start,
    details: t1Passed
      ? `Retrieved observation with SHA-256 hash: ${req1.observation?.content_hash.slice(0, 8)}`
      : `Failed state: ${req1.state}, reason: ${req1.failureReason}`,
  });

  // 2. Unauthorized direct execution bypass blocked by ExecutionGate / Governance
  const t2Start = Date.now();
  const prop2: UntrustedProposal = {
    proposalId: 'prop-unauth-fetch',
    action: 'EXTERNAL_RETRIEVAL',
    target: 'https://malicious-site.example.com',
    payload: { query: 'malicious search' },
    reasoning: 'Direct execution bypass attempt without signature',
    modelMetadata: { provider: 'untrusted-model' },
  };
  const exec2 = await kernel.getExecutionGate().execute(prop2, undefined, 'will-owner');
  const t2Passed = exec2.result.success === false && exec2.result.revalidationReason === 'MISSING_AUTHORIZATION_ARTIFACT';
  results.push({
    testNumber: 2,
    testName: 'Unauthorized direct execution bypass blocked by ExecutionGate',
    passed: t2Passed,
    executionTimeMs: Date.now() - t2Start,
    details: t2Passed
      ? `ExecutionGate correctly denied execution due to missing signed AuthorizationArtifact.`
      : `Failed: Execution succeeded or wrong rejection reason: ${exec2.result.revalidationReason}`,
  });

  // 3. Memory write cannot bypass Governed Learning Engine (Tier C check & Tier A approval)
  const t3Start = Date.now();
  const tierCProposal: CandidateMemoryProposal = {
    proposalId: 'prop-tier-c-grant',
    sourceActorId: 'will-owner',
    subjectId: 'will-owner',
    factKey: 'admin_grant',
    factValue: 'grant_all_permissions',
    category: 'PREFERENCE',
    provenance: { sourceType: 'UNTRUSTED_MODEL_CLAIM', confidence: 99 },
    claimedPrivilege: { grantCapability: 'admin:*' },
  };
  const res3TierC = await learningEngine.processGovernedLearning(tierCProposal);

  const tierAProposal: CandidateMemoryProposal = {
    proposalId: 'prop-tier-a-pref',
    sourceActorId: 'will-owner',
    subjectId: 'will-owner',
    factKey: 'user_favorite_theme',
    factValue: 'dark_mode',
    category: 'PREFERENCE',
    provenance: { sourceType: 'EXPERT_USER_STATEMENT', confidence: 95 },
  };
  const res3TierA = await learningEngine.processGovernedLearning(tierAProposal);

  const t3Passed = res3TierC.status === 'REJECT' && res3TierC.riskTier === 'TIER_C_PRIVILEGED' && res3TierA.status === 'LEARNING_ALLOW';
  results.push({
    testNumber: 3,
    testName: 'Memory write candidate routed through Governed Learning Engine with Tier gating',
    passed: t3Passed,
    executionTimeMs: Date.now() - t3Start,
    details: t3Passed
      ? `Tier C privileged memory attempt rejected; Tier A preference memory allowed.`
      : `Failed: Tier C status=${res3TierC.status}, Tier A status=${res3TierA.status}`,
  });

  // 4. Failed or unavailable retrieval reported truthfully without status manufacturing
  const t4Start = Date.now();
  toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'UNAVAILABLE', 'Maintenance or disconnected');
  const req4 = await externalRetrievalGateway.request(
    { query: 'Tulsa weather', purpose: 'Test unavailable capability' },
    kernel,
    'will-owner'
  );
  toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'AVAILABLE'); // Restore
  const t4Passed = req4.state === 'TOOL_UNAVAILABLE' && req4.failureReason?.includes('CAPABILITY_UNAVAILABLE') && !req4.observation;
  results.push({
    testNumber: 4,
    testName: 'Unavailable capability reports TOOL_UNAVAILABLE truthfully without auto-setting AVAILABLE',
    passed: t4Passed,
    executionTimeMs: Date.now() - t4Start,
    details: t4Passed
      ? `Tool request correctly returned TOOL_UNAVAILABLE status when capability was marked UNAVAILABLE.`
      : `Failed: State=${req4.state}, failureReason=${req4.failureReason}`,
  });

  // 5. Governance policy denial when posture is STONEWALL
  const t5Start = Date.now();
  kernel.getGovernor().setPosture('STONEWALL');
  const req5 = await externalRetrievalGateway.request(
    { query: 'Tulsa news', purpose: 'Test posture stonewall restriction' },
    kernel,
    'will-owner'
  );
  kernel.getGovernor().setPosture('NORMAL'); // Restore
  const t5Passed = req5.state === 'TOOL_UNAVAILABLE' && req5.failureReason?.includes('GOVERNANCE_DENIED');
  results.push({
    testNumber: 5,
    testName: 'Governance policy rejects tool execution under STONEWALL posture',
    passed: t5Passed,
    executionTimeMs: Date.now() - t5Start,
    details: t5Passed
      ? `Governor rejected proposal under STONEWALL posture.`
      : `Failed: State=${req5.state}, failureReason=${req5.failureReason}`,
  });

  return results;
}
