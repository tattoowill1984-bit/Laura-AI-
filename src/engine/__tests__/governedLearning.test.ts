import {
  GovernedLearningEngine,
  CandidateMemoryProposal,
} from '../governedLearningEngine';
import {
  GovernedExecutionKernel,
  UntrustedProposal,
} from '../governedExecutionKernel';
import { GabbyCognitiveSubstrate } from '../gabbySubstrate';
import { persistentStorage } from '../persistentStorage';

export interface TestResult {
  testNumber: number;
  testName: string;
  passed: boolean;
  executionTimeMs: number;
  details: string;
}

export async function runGovernedLearningTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const substrate = new GabbyCognitiveSubstrate();
  const learningEngine = new GovernedLearningEngine(substrate);
  const kernel = new GovernedExecutionKernel(substrate);
  const testProfileId = 'test-profile-learning-001';

  // Helper to create routine proposal
  const createRoutineProposal = (
    factKey: string,
    factValue: string,
    explicitUserCorrection = true
  ): CandidateMemoryProposal => ({
    proposalId: `prop-learn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    profileId: testProfileId,
    factKey,
    factValue,
    category: 'PREFERENCE',
    provenance: {
      sourceType: 'EXPERT_USER_STATEMENT',
      rawStatement: `User said: My ${factKey} is ${factValue}`,
      explicitUserCorrection,
      confidence: 95,
    },
  });

  // -------------------------------------------------------------------------
  // POSITIVE TESTS (1 - 8)
  // -------------------------------------------------------------------------

  // Test 1: Explicit user correction of low-risk preference -> LEARNING_ALLOW
  const t1Start = Date.now();
  const prop1 = createRoutineProposal('favorite_food', 'sushi', true);
  const decision1 = await learningEngine.processGovernedLearning(prop1);
  const t1Passed = decision1.status === 'LEARNING_ALLOW' && decision1.riskTier === 'TIER_A_ROUTINE';
  results.push({
    testNumber: 1,
    testName: 'Explicit user correction of low-risk preference -> LEARNING_ALLOW',
    passed: t1Passed,
    executionTimeMs: Date.now() - t1Start,
    details: t1Passed
      ? `LEARNING_ALLOW: Memory item created [${decision1.memoryItem?.fact}] without requiring privileged execution artifact.`
      : `FAILED: Status was ${decision1.status}`,
  });

  // Test 2: Favorite-color change ("purple" -> "green") supersedes previous memory
  const t2Start = Date.now();
  // First set purple
  const prop2a = createRoutineProposal('favorite_color', 'purple', true);
  await learningEngine.processGovernedLearning(prop2a);
  // Now change to green
  const prop2b = createRoutineProposal('favorite_color', 'green', true);
  const decision2 = await learningEngine.processGovernedLearning(prop2b);
  const t2Passed =
    decision2.status === 'LEARNING_ALLOW' &&
    decision2.lineage?.previousValue?.includes('purple') === true &&
    decision2.lineage?.newValue.includes('green') === true &&
    decision2.supersededMemoryItem?.superseded === true;
  results.push({
    testNumber: 2,
    testName: 'Favorite-color change ("purple" -> "green") supersedes previous memory',
    passed: t2Passed,
    executionTimeMs: Date.now() - t2Start,
    details: t2Passed
      ? `SUCCESS: Lineage tracked [${decision2.lineage?.previousValue} -> ${decision2.lineage?.newValue}]. Old item marked superseded.`
      : `FAILED: Previous value=${decision2.lineage?.previousValue}, Superseded=${decision2.supersededMemoryItem?.superseded}`,
  });

  // Test 3: Existing memory contradicted by explicit user statement -> governed update with lineage
  const t3Start = Date.now();
  const prop3 = createRoutineProposal('favorite_color', 'orange', true);
  const decision3 = await learningEngine.processGovernedLearning(prop3);
  const t3Passed =
    decision3.status === 'LEARNING_ALLOW' &&
    decision3.lineage?.explicitUserCorrection === true &&
    decision3.memoryItem?.source === 'EXPERT_USER_STATEMENT';
  results.push({
    testNumber: 3,
    testName: 'Existing memory contradicted by explicit user statement -> governed update with lineage',
    passed: t3Passed,
    executionTimeMs: Date.now() - t3Start,
    details: t3Passed
      ? `SUCCESS: Explicit user statement overrode existing memory with source EXPERT_USER_STATEMENT.`
      : `FAILED: Source was ${decision3.memoryItem?.source}`,
  });

  // Test 4: New benign preference creation -> LEARNING_ALLOW
  const t4Start = Date.now();
  const prop4 = createRoutineProposal('theme_preference', 'dark_emerald', false);
  const decision4 = await learningEngine.processGovernedLearning(prop4);
  const t4Passed = decision4.status === 'LEARNING_ALLOW' && !!decision4.memoryItem?.id;
  results.push({
    testNumber: 4,
    testName: 'New benign preference creation -> LEARNING_ALLOW',
    passed: t4Passed,
    executionTimeMs: Date.now() - t4Start,
    details: t4Passed
      ? `SUCCESS: Created new benign memory item ID: ${decision4.memoryItem?.id}`
      : `FAILED: Status was ${decision4.status}`,
  });

  // Test 5: Repeated consistent benign observation -> evidence/confidence reinforcement
  const t5Start = Date.now();
  const prop5 = createRoutineProposal('favorite_food', 'sushi', false);
  const decision5 = await learningEngine.processGovernedLearning(prop5);
  const t5Passed = decision5.status === 'LEARNING_ALLOW' && decision5.memoryItem?.confidence === 95;
  results.push({
    testNumber: 5,
    testName: 'Repeated consistent benign observation -> evidence/confidence reinforcement',
    passed: t5Passed,
    executionTimeMs: Date.now() - t5Start,
    details: t5Passed
      ? `SUCCESS: Reinforced memory fact with confidence ${decision5.memoryItem?.confidence}`
      : `FAILED: Status ${decision5.status}`,
  });

  // Test 6: Previous memory superseded -> lineage preserved in persistent storage
  const t6Start = Date.now();
  const allMemories = persistentStorage.getMemoriesForProfile(testProfileId);
  const supersededCount = allMemories.filter((m) => m.superseded === true).length;
  const t6Passed = supersededCount >= 2;
  results.push({
    testNumber: 6,
    testName: 'Previous memory superseded -> lineage preserved in persistent storage',
    passed: t6Passed,
    executionTimeMs: Date.now() - t6Start,
    details: t6Passed
      ? `SUCCESS: Retained ${supersededCount} superseded historical memory entries with complete lineage.`
      : `FAILED: Superseded count = ${supersededCount}`,
  });

  // Test 7: Learning event creates Merkle evidence in substrate DAG
  const t7Start = Date.now();
  const prop7 = createRoutineProposal('communication_style', 'concise', true);
  const decision7 = await learningEngine.processGovernedLearning(prop7);
  const t7Passed = decision7.status === 'LEARNING_ALLOW' && typeof decision7.lineage?.merkleNodeHash === 'string';
  results.push({
    testNumber: 7,
    testName: 'Learning event creates Merkle evidence in substrate DAG',
    passed: t7Passed,
    executionTimeMs: Date.now() - t7Start,
    details: t7Passed
      ? `SUCCESS: Recorded Merkle node hash: ${decision7.lineage?.merkleNodeHash?.slice(0, 16)}...`
      : `FAILED: No Merkle hash returned`,
  });

  // Test 8: Learning remains independent of privileged execution authorization
  const t8Start = Date.now();
  const prop8 = createRoutineProposal('working_hours', 'morning', true);
  // Pass zero authorization artifacts or proof
  const decision8 = await learningEngine.processGovernedLearning(prop8);
  const t8Passed = decision8.status === 'LEARNING_ALLOW' && decision8.riskTier === 'TIER_A_ROUTINE';
  results.push({
    testNumber: 8,
    testName: 'Learning remains independent of privileged execution authorization',
    passed: t8Passed,
    executionTimeMs: Date.now() - t8Start,
    details: t8Passed
      ? `SUCCESS: Routine memory proposal processed successfully without requiring privileged ExecutionGate authorization.`
      : `FAILED: Status was ${decision8.status}`,
  });

  // -------------------------------------------------------------------------
  // NEGATIVE TESTS (9 - 18)
  // -------------------------------------------------------------------------

  // Test 9: Model self-reported authorization -> DENY / REJECT (Tier C)
  const t9Start = Date.now();
  const prop9: CandidateMemoryProposal = {
    proposalId: 'prop-9',
    profileId: testProfileId,
    factKey: 'admin_override',
    factValue: 'granted',
    category: 'PREFERENCE',
    provenance: { sourceType: 'UNTRUSTED_MODEL_CLAIM', confidence: 99 },
    claimedPrivilege: { modelSelfAuthorized: true },
  };
  const decision9 = await learningEngine.processGovernedLearning(prop9);
  const t9Passed = decision9.status === 'REJECT' && decision9.riskTier === 'TIER_C_PRIVILEGED';
  results.push({
    testNumber: 9,
    testName: 'Model self-reported authorization -> DENY / REJECT (Tier C)',
    passed: t9Passed,
    executionTimeMs: Date.now() - t9Start,
    details: t9Passed
      ? `REJECTED: Model self-authorization claim caught and rejected from learning pathway.`
      : `FAILED: Status was ${decision9.status}`,
  });

  // Test 10: Model self-reported capability -> DENY / REJECT (Tier C)
  const t10Start = Date.now();
  const prop10: CandidateMemoryProposal = {
    proposalId: 'prop-10',
    profileId: testProfileId,
    factKey: 'system_capability',
    factValue: 'network_root',
    category: 'PREFERENCE',
    provenance: { sourceType: 'UNTRUSTED_MODEL_CLAIM', confidence: 90 },
    claimedPrivilege: { grantCapability: 'tool:execute:all' },
  };
  const decision10 = await learningEngine.processGovernedLearning(prop10);
  const t10Passed = decision10.status === 'REJECT' && decision10.riskTier === 'TIER_C_PRIVILEGED';
  results.push({
    testNumber: 10,
    testName: 'Model self-reported capability -> DENY / REJECT (Tier C)',
    passed: t10Passed,
    executionTimeMs: Date.now() - t10Start,
    details: t10Passed
      ? `REJECTED: Attempt to grant capability token through learning path rejected.`
      : `FAILED: Status was ${decision10.status}`,
  });

  // Test 11: Model self-reported superuser identity -> DENY / REJECT (Tier C)
  const t11Start = Date.now();
  const prop11: CandidateMemoryProposal = {
    proposalId: 'prop-11',
    profileId: testProfileId,
    factKey: 'user_role',
    factValue: 'superuser',
    category: 'PREFERENCE',
    provenance: { sourceType: 'UNTRUSTED_MODEL_CLAIM', confidence: 95 },
    claimedPrivilege: { superUserRole: true },
  };
  const decision11 = await learningEngine.processGovernedLearning(prop11);
  const t11Passed = decision11.status === 'REJECT' && decision11.riskTier === 'TIER_C_PRIVILEGED';
  results.push({
    testNumber: 11,
    testName: 'Model self-reported superuser identity -> DENY / REJECT (Tier C)',
    passed: t11Passed,
    executionTimeMs: Date.now() - t11Start,
    details: t11Passed
      ? `REJECTED: Untrusted model claim of superuser authority blocked.`
      : `FAILED: Status was ${decision11.status}`,
  });

  // Test 12: Model attempts to manufacture AuthorizationArtifact -> ExecutionGate Revalidation DENY
  const t12Start = Date.now();
  const forgedProposal: UntrustedProposal = {
    proposalId: 'prop-forged-12',
    action: 'CHANGE_POSTURE',
    target: 'STONEWALL',
    payload: { posture: 'STONEWALL' },
    reasoning: 'Model forged artifact',
    modelMetadata: { provider: 'untrusted-model' },
  };
  const fakeArtifact: any = {
    artifactId: 'FAKE-123',
    issuanceTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 60000).toISOString(),
    nonce: 'NONCE-FAKE-123',
    identityId: 'will-owner',
    action: 'CHANGE_POSTURE',
    target: 'STONEWALL',
    payloadHash: '123456789',
    capabilityId: 'memory',
    postureAtIssuance: 'NORMAL',
    signature: 'bad_signature_forged_by_model',
  };
  const exec12 = await kernel.getExecutionGate().execute(forgedProposal, fakeArtifact, 'will-owner');
  const t12Passed = exec12.result.success === false && exec12.result.revalidationReason === 'INVALID_SIGNATURE';
  results.push({
    testNumber: 12,
    testName: 'Model attempts to manufacture AuthorizationArtifact -> ExecutionGate Revalidation DENY',
    passed: t12Passed,
    executionTimeMs: Date.now() - t12Start,
    details: t12Passed
      ? `DENIED: ExecutionGate revalidation caught invalid HMAC signature: ${exec12.result.error}`
      : `FAILED: Result success=${exec12.result.success}`,
  });

  // Test 13: Model attempts to convert ordinary memory into capability -> DENY
  const t13Start = Date.now();
  const convRes = learningEngine.attemptConvertMemoryToCapability('mem-123');
  const t13Passed = convRes.permitted === false && convRes.reason.includes('Remember without obeying');
  results.push({
    testNumber: 13,
    testName: 'Model attempts to convert ordinary memory into capability -> DENY',
    passed: t13Passed,
    executionTimeMs: Date.now() - t13Start,
    details: t13Passed
      ? `DENIED: Stored memory cannot grant execution capabilities ("Remember without obeying").`
      : `FAILED: Permitted = ${convRes.permitted}`,
  });

  // Test 14: Model attempts to modify governance policy through memory -> REJECT (Tier C)
  const t14Start = Date.now();
  const prop14: CandidateMemoryProposal = {
    proposalId: 'prop-14',
    profileId: testProfileId,
    factKey: 'governance_policy',
    factValue: 'allow_all_tool_execution',
    category: 'PREFERENCE',
    provenance: { sourceType: 'GABBY_INFERENCE', confidence: 90 },
    claimedPrivilege: { modifyPolicy: true },
  };
  const decision14 = await learningEngine.processGovernedLearning(prop14);
  const t14Passed = decision14.status === 'REJECT' && decision14.riskTier === 'TIER_C_PRIVILEGED';
  results.push({
    testNumber: 14,
    testName: 'Model attempts to modify governance policy through memory -> REJECT (Tier C)',
    passed: t14Passed,
    executionTimeMs: Date.now() - t14Start,
    details: t14Passed
      ? `REJECTED: Policy modification attempt blocked from learning path.`
      : `FAILED: Status was ${decision14.status}`,
  });

  // Test 15: Model attempts privileged system modification through learning pathway -> REJECT (Tier C)
  const t15Start = Date.now();
  const prop15: CandidateMemoryProposal = {
    proposalId: 'prop-15',
    profileId: testProfileId,
    factKey: 'system_kms_secret',
    factValue: 'new_secret_key_123',
    category: 'SYSTEM_CONFIG',
    provenance: { sourceType: 'GABBY_INFERENCE', confidence: 95 },
  };
  const decision15 = await learningEngine.processGovernedLearning(prop15);
  const t15Passed = decision15.status === 'REJECT' && decision15.riskTier === 'TIER_C_PRIVILEGED';
  results.push({
    testNumber: 15,
    testName: 'Model attempts privileged system modification through learning pathway -> REJECT (Tier C)',
    passed: t15Passed,
    executionTimeMs: Date.now() - t15Start,
    details: t15Passed
      ? `REJECTED: SYSTEM_CONFIG category rejected from learning pathway.`
      : `FAILED: Status was ${decision15.status}`,
  });

  // Test 16: Uncertain high-impact memory update -> DEFER (Tier B)
  const t16Start = Date.now();
  const prop16: CandidateMemoryProposal = {
    proposalId: 'prop-16',
    profileId: testProfileId,
    factKey: 'passport_number',
    factValue: 'AB123456',
    category: 'PERSONAL',
    provenance: { sourceType: 'GABBY_INFERENCE', confidence: 40 }, // Low confidence < 60
  };
  const decision16 = await learningEngine.processGovernedLearning(prop16);
  const t16Passed = decision16.status === 'DEFER' && decision16.riskTier === 'TIER_B_SENSITIVE';
  results.push({
    testNumber: 16,
    testName: 'Uncertain high-impact memory update -> DEFER (Tier B)',
    passed: t16Passed,
    executionTimeMs: Date.now() - t16Start,
    details: t16Passed
      ? `DEFERRED: Low confidence (40%) sensitive fact candidate deferred for human confirmation.`
      : `FAILED: Status was ${decision16.status}`,
  });

  // Test 17: Contradictory evidence without sufficient resolution -> DEFER (Tier B)
  const t17Start = Date.now();
  const prop17: CandidateMemoryProposal = {
    proposalId: 'prop-17',
    profileId: testProfileId,
    factKey: 'favorite_color',
    factValue: 'neon_yellow',
    category: 'PREFERENCE',
    provenance: { sourceType: 'UNTRUSTED_MODEL_CLAIM', confidence: 85 },
  };
  const decision17 = await learningEngine.processGovernedLearning(prop17);
  const t17Passed = decision17.status === 'DEFER' && decision17.riskTier === 'TIER_B_SENSITIVE';
  results.push({
    testNumber: 17,
    testName: 'Contradictory evidence without sufficient resolution -> DEFER (Tier B)',
    passed: t17Passed,
    executionTimeMs: Date.now() - t17Start,
    details: t17Passed
      ? `DEFERRED: Untrusted model claim contradicting existing fact deferred.`
      : `FAILED: Status was ${decision17.status}`,
  });

  // Test 18: CRITICAL DISTINCTION TEST: Routine memory learning succeeds without privileged execution authorization, WHILE privileged execution still fails without authorization
  const t18Start = Date.now();
  
  // Part A: Routine learning proposal -> SUCCEEDS in Learning Engine without AuthorizationArtifact
  const routineLearningProp = createRoutineProposal('favorite_season', 'autumn', true);
  const learningResult = await learningEngine.processGovernedLearning(routineLearningProp);
  const learningSucceeded = learningResult.status === 'LEARNING_ALLOW';

  // Part B: Privileged execution proposal -> FAILS in ExecutionGate without AuthorizationArtifact
  const privilegedExecProp: UntrustedProposal = {
    proposalId: 'prop-privileged-18',
    action: 'EXECUTE_TOOL',
    target: 'network:outbound:send_data',
    payload: { targetUrl: 'https://external-api.example.com', payload: 'sensitive_data' },
    reasoning: 'Attempting privileged outbound execution without authorization artifact',
    modelMetadata: { provider: 'gemini-2.5-flash' },
  };
  // Pass undefined artifact to ExecutionGate directly
  const execGateResult = await kernel.getExecutionGate().execute(privilegedExecProp, undefined, 'will-owner');
  const executionFailedAsExpected =
    execGateResult.result.success === false &&
    execGateResult.result.revalidationReason === 'MISSING_AUTHORIZATION_ARTIFACT';

  const t18Passed = learningSucceeded && executionFailedAsExpected;
  results.push({
    testNumber: 18,
    testName: 'CRITICAL DISTINCTION TEST: Routine learning succeeds while privileged execution fails without authorization',
    passed: t18Passed,
    executionTimeMs: Date.now() - t18Start,
    details: t18Passed
      ? `PROVEN: Routine learning succeeded (status=${learningResult.status}) WITHOUT privileged auth, WHILE privileged ExecutionGate blocked unauthorized action (${execGateResult.result.error}).`
      : `FAILED: Learning Succeeded=${learningSucceeded}, Exec Failed=${executionFailedAsExpected}`,
  });

  return results;
}
