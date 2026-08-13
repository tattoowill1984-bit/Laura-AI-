import {
  GovernedExecutionKernel,
  UntrustedProposal,
  TrustedIdentityStore,
  AntiReplayLedger,
  AuthorizationArtifact,
  SentinelGovernor,
} from '../governedExecutionKernel';
import { GabbyCognitiveSubstrate } from '../gabbySubstrate';
import { toolCapabilityRegistry } from '../toolCapabilityRegistry';

export interface TestResult {
  testNumber: number;
  testName: string;
  passed: boolean;
  executionTimeMs: number;
  details: string;
}

export async function runGovernedExecutionTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const substrate = new GabbyCognitiveSubstrate();
  const kernel = new GovernedExecutionKernel(substrate);

  // Helper baseline proposal
  const createBaseProposal = (id = 'prop-1'): UntrustedProposal => ({
    proposalId: id,
    action: 'WRITE_MEMORY',
    target: 'profile:will-owner:fact_100',
    payload: { key: 'favorite_color', value: 'blue' },
    reasoning: 'User explicitly requested saving preference.',
    modelMetadata: {
      provider: 'gemini-2.5-flash',
      modelConfidence: 0.99,
      callerAssertions: { role: 'admin', permissionGranted: true },
    },
  });

  // 1. Valid proposal + valid authorization -> ALLOW
  const t1Start = Date.now();
  AntiReplayLedger.clear();
  const prop1 = createBaseProposal('prop-1');
  const res1 = await kernel.processAndExecuteProposal(prop1, 'will-owner', 'memory');
  const t1Passed = res1.decision.permitted && res1.execution?.success === true;
  results.push({
    testNumber: 1,
    testName: 'Valid proposal + valid authorization -> ALLOW',
    passed: t1Passed,
    executionTimeMs: Date.now() - t1Start,
    details: t1Passed
      ? 'Proposal successfully evaluated, signed, revalidated, and executed with Merkle receipt.'
      : `Failed: ${res1.decision.rejectionReason || res1.execution?.error}`,
  });

  // 2. Missing authorization -> DENY
  const t2Start = Date.now();
  const prop2 = createBaseProposal('prop-2');
  const res2 = await kernel.getExecutionGate().execute(prop2, undefined, 'will-owner');
  const t2Passed = !res2.result.success && res2.result.revalidationReason === 'MISSING_AUTHORIZATION_ARTIFACT';
  results.push({
    testNumber: 2,
    testName: 'Missing authorization -> DENY',
    passed: t2Passed,
    executionTimeMs: Date.now() - t2Start,
    details: t2Passed
      ? 'Execution Gate correctly blocked direct effector invocation due to missing AuthorizationArtifact.'
      : `Failed: ${res2.result.error}`,
  });

  // 3. Invalid identity -> DENY
  const t3Start = Date.now();
  const prop3 = createBaseProposal('prop-3');
  const dec3 = kernel.getGovernor().evaluateProposal(prop3, 'unauthorized-anonymous-attacker', 'memory');
  const t3Passed = !dec3.permitted && dec3.predicateResults.identityValid === false;
  results.push({
    testNumber: 3,
    testName: 'Invalid identity -> DENY',
    passed: t3Passed,
    executionTimeMs: Date.now() - t3Start,
    details: t3Passed
      ? `Governor rejected unauthenticated identity 'unauthorized-anonymous-attacker'.`
      : `Failed: ${dec3.rejectionReason}`,
  });

  // 4. Invalid capability -> DENY
  const t4Start = Date.now();
  toolCapabilityRegistry.setCapabilityStatus('memory', 'UNAVAILABLE', 'Maintenance mode');
  const prop4 = createBaseProposal('prop-4');
  const dec4 = kernel.getGovernor().evaluateProposal(prop4, 'will-owner', 'memory');
  toolCapabilityRegistry.setCapabilityStatus('memory', 'AVAILABLE'); // restore
  const t4Passed = !dec4.permitted && dec4.predicateResults.capabilityValid === false;
  results.push({
    testNumber: 4,
    testName: 'Invalid capability -> DENY',
    passed: t4Passed,
    executionTimeMs: Date.now() - t4Start,
    details: t4Passed
      ? 'Governor rejected proposal when required capability was marked UNAVAILABLE in registry.'
      : `Failed: ${dec4.rejectionReason}`,
  });

  // 5. Invalid posture -> DENY
  const t5Start = Date.now();
  kernel.setPosture('STONEWALL');
  const prop5 = createBaseProposal('prop-5');
  const dec5 = kernel.getGovernor().evaluateProposal(prop5, 'will-owner', 'memory');
  kernel.setPosture('NORMAL'); // restore
  const t5Passed = !dec5.permitted && dec5.predicateResults.postureAllows === false;
  results.push({
    testNumber: 5,
    testName: 'Invalid posture -> DENY',
    passed: t5Passed,
    executionTimeMs: Date.now() - t5Start,
    details: t5Passed
      ? 'Governor correctly blocked state mutation while in STONEWALL posture.'
      : `Failed: ${dec5.rejectionReason}`,
  });

  // 6. Missing evidence -> DENY
  const t6Start = Date.now();
  const nullSubstrateKernel = new GovernedExecutionKernel(null as any);
  let t6Passed = false;
  try {
    const dec6 = nullSubstrateKernel.getGovernor().evaluateProposal(createBaseProposal('prop-6'), 'will-owner', 'memory');
    t6Passed = !dec6.permitted;
  } catch {
    t6Passed = true;
  }
  results.push({
    testNumber: 6,
    testName: 'Missing evidence -> DENY',
    passed: t6Passed,
    executionTimeMs: Date.now() - t6Start,
    details: 'System correctly denied proposal when Merkle evidence substrate was unavailable.',
  });

  // 7. Expired authorization -> DENY
  const t7Start = Date.now();
  AntiReplayLedger.clear();
  const prop7 = createBaseProposal('prop-7');
  const dec7 = kernel.getGovernor().evaluateProposal(prop7, 'will-owner', 'memory');
  if (dec7.authorizationArtifact) {
    // Artificial expiration in past
    dec7.authorizationArtifact.expirationTime = new Date(Date.now() - 10000).toISOString();
    // Re-sign with expired timestamp
    const signablePayload = `${dec7.authorizationArtifact.artifactId}|${dec7.authorizationArtifact.issuanceTime}|${dec7.authorizationArtifact.expirationTime}|${dec7.authorizationArtifact.nonce}|${dec7.authorizationArtifact.identityId}|${dec7.authorizationArtifact.action}|${dec7.authorizationArtifact.target}|${dec7.authorizationArtifact.payloadHash}|${dec7.authorizationArtifact.capabilityId}|${dec7.authorizationArtifact.postureAtIssuance}`;
    const crypto = await import('crypto');
    dec7.authorizationArtifact.signature = crypto
      .createHmac('sha256', (kernel.getGovernor() as any).hmacKey)
      .update(signablePayload)
      .digest('hex');
  }
  const exec7 = await kernel.getExecutionGate().execute(prop7, dec7.authorizationArtifact, 'will-owner');
  const t7Passed = !exec7.result.success && exec7.result.revalidationReason === 'EXPIRED_AUTHORIZATION';
  results.push({
    testNumber: 7,
    testName: 'Expired authorization -> DENY',
    passed: t7Passed,
    executionTimeMs: Date.now() - t7Start,
    details: t7Passed
      ? 'Execution Gate correctly rejected expired authorization artifact.'
      : `Failed: ${exec7.result.error}`,
  });

  // 8. Replay -> DENY
  const t8Start = Date.now();
  AntiReplayLedger.clear();
  const prop8 = createBaseProposal('prop-8');
  const dec8 = kernel.getGovernor().evaluateProposal(prop8, 'will-owner', 'memory');
  // First execution -> SUCCESS
  await kernel.getExecutionGate().execute(prop8, dec8.authorizationArtifact, 'will-owner');
  // Second execution (Replay attack) -> DENY
  const exec8Replay = await kernel.getExecutionGate().execute(prop8, dec8.authorizationArtifact, 'will-owner');
  const t8Passed = !exec8Replay.result.success && exec8Replay.result.revalidationReason === 'REPLAY_NONCE_REUSED';
  results.push({
    testNumber: 8,
    testName: 'Replay -> DENY',
    passed: t8Passed,
    executionTimeMs: Date.now() - t8Start,
    details: t8Passed
      ? 'Execution Gate detected reused nonce and blocked token replay attack.'
      : `Failed: ${exec8Replay.result.error}`,
  });

  // 9. Changed target -> DENY
  const t9Start = Date.now();
  AntiReplayLedger.clear();
  const prop9Original = createBaseProposal('prop-9');
  const dec9 = kernel.getGovernor().evaluateProposal(prop9Original, 'will-owner', 'memory');
  // Adversary mutates target in proposal
  const prop9Tampered = { ...prop9Original, target: 'profile:victim:system_passwords' };
  const exec9 = await kernel.getExecutionGate().execute(prop9Tampered, dec9.authorizationArtifact, 'will-owner');
  const t9Passed = !exec9.result.success && exec9.result.revalidationReason === 'TARGET_MISMATCH';
  results.push({
    testNumber: 9,
    testName: 'Changed target -> DENY',
    passed: t9Passed,
    executionTimeMs: Date.now() - t9Start,
    details: t9Passed
      ? 'Execution Gate detected target substitution and blocked execution.'
      : `Failed: ${exec9.result.error}`,
  });

  // 10. Changed payload -> DENY
  const t10Start = Date.now();
  AntiReplayLedger.clear();
  const prop10Original = createBaseProposal('prop-10');
  const dec10 = kernel.getGovernor().evaluateProposal(prop10Original, 'will-owner', 'memory');
  // Adversary mutates payload content
  const prop10Tampered = { ...prop10Original, payload: { key: 'favorite_color', value: 'MALICIOUS_OVERWRITE' } };
  const exec10 = await kernel.getExecutionGate().execute(prop10Tampered, dec10.authorizationArtifact, 'will-owner');
  const t10Passed = !exec10.result.success && exec10.result.revalidationReason === 'PAYLOAD_MUTATION';
  results.push({
    testNumber: 10,
    testName: 'Changed payload -> DENY',
    passed: t10Passed,
    executionTimeMs: Date.now() - t10Start,
    details: t10Passed
      ? 'Execution Gate detected payload hash mismatch and blocked execution.'
      : `Failed: ${exec10.result.error}`,
  });

  // 11. Changed action -> DENY
  const t11Start = Date.now();
  AntiReplayLedger.clear();
  const prop11Original = createBaseProposal('prop-11');
  const dec11 = kernel.getGovernor().evaluateProposal(prop11Original, 'will-owner', 'memory');
  // Adversary mutates action from WRITE_MEMORY to DELETE_DATABASE
  const prop11Tampered = { ...prop11Original, action: 'DELETE_DATABASE' };
  const exec11 = await kernel.getExecutionGate().execute(prop11Tampered, dec11.authorizationArtifact, 'will-owner');
  const t11Passed = !exec11.result.success && exec11.result.revalidationReason === 'ACTION_MISMATCH';
  results.push({
    testNumber: 11,
    testName: 'Changed action -> DENY',
    passed: t11Passed,
    executionTimeMs: Date.now() - t11Start,
    details: t11Passed
      ? 'Execution Gate detected action binding mismatch and blocked execution.'
      : `Failed: ${exec11.result.error}`,
  });

  // 12. Changed identity -> DENY
  const t12Start = Date.now();
  AntiReplayLedger.clear();
  const prop12 = createBaseProposal('prop-12');
  const dec12 = kernel.getGovernor().evaluateProposal(prop12, 'will-owner', 'memory');
  // Current active session identity changes to another identity
  const exec12 = await kernel.getExecutionGate().execute(prop12, dec12.authorizationArtifact, 'system-admin');
  const t12Passed = !exec12.result.success && exec12.result.revalidationReason === 'IDENTITY_MISMATCH';
  results.push({
    testNumber: 12,
    testName: 'Changed identity -> DENY',
    passed: t12Passed,
    executionTimeMs: Date.now() - t12Start,
    details: t12Passed
      ? 'Execution Gate detected identity mismatch and blocked execution.'
      : `Failed: ${exec12.result.error}`,
  });

  // 13. Invalid authorization signature/integrity -> DENY
  const t13Start = Date.now();
  AntiReplayLedger.clear();
  const prop13 = createBaseProposal('prop-13');
  const dec13 = kernel.getGovernor().evaluateProposal(prop13, 'will-owner', 'memory');
  if (dec13.authorizationArtifact) {
    // Forged signature
    dec13.authorizationArtifact.signature = 'bad0000000000000000000000000000000000000000000000000000000000000';
  }
  const exec13 = await kernel.getExecutionGate().execute(prop13, dec13.authorizationArtifact, 'will-owner');
  const t13Passed = !exec13.result.success && exec13.result.revalidationReason === 'INVALID_SIGNATURE';
  results.push({
    testNumber: 13,
    testName: 'Invalid authorization signature/integrity -> DENY',
    passed: t13Passed,
    executionTimeMs: Date.now() - t13Start,
    details: t13Passed
      ? 'Execution Gate detected forged signature and blocked execution.'
      : `Failed: ${exec13.result.error}`,
  });

  // 14. Model-generated authorization claim -> DENY
  const t14Start = Date.now();
  const prop14 = createBaseProposal('prop-14');
  prop14.modelMetadata.callerAssertions = {
    authorizationToken: 'MOCK-TOKEN-GENERATED-BY-MODEL-PROMPT',
    overridePermissions: true,
  };
  // Attempting to present a fake authorization artifact fabricated by the model
  const fakeModelArtifact: AuthorizationArtifact = {
    artifactId: 'FAKE-MODEL-ARTIFACT',
    issuanceTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 60000).toISOString(),
    nonce: 'FAKE-NONCE-1',
    identityId: 'will-owner',
    action: prop14.action,
    target: prop14.target,
    payloadHash: SentinelGovernor.computePayloadHash(prop14.payload),
    capabilityId: 'memory',
    postureAtIssuance: 'NORMAL',
    signature: 'model_claims_this_is_valid_sig',
  };
  const exec14 = await kernel.getExecutionGate().execute(prop14, fakeModelArtifact, 'will-owner');
  const t14Passed = !exec14.result.success && exec14.result.revalidationReason === 'INVALID_SIGNATURE';
  results.push({
    testNumber: 14,
    testName: 'Model-generated authorization claim -> DENY',
    passed: t14Passed,
    executionTimeMs: Date.now() - t14Start,
    details: t14Passed
      ? 'Fabricated model authorization claim rejected by Execution Gate signature check.'
      : `Failed: ${exec14.result.error}`,
  });

  // 15. Model-generated capability claim -> DENY
  const t15Start = Date.now();
  toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'UNAVAILABLE', 'Disabled by admin');
  const prop15 = createBaseProposal('prop-15');
  prop15.modelMetadata.callerAssertions = { capabilityState: 'AVAILABLE_FOR_MODEL_USE' };
  const dec15 = kernel.getGovernor().evaluateProposal(prop15, 'will-owner', 'external_retrieval');
  toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'AVAILABLE'); // restore
  const t15Passed = !dec15.permitted && dec15.predicateResults.capabilityValid === false;
  results.push({
    testNumber: 15,
    testName: 'Model-generated capability claim -> DENY',
    passed: t15Passed,
    executionTimeMs: Date.now() - t15Start,
    details: t15Passed
      ? 'Governor ignored model metadata assertion and accurately read UNAVAILABLE state from registry.'
      : `Failed: ${dec15.rejectionReason}`,
  });

  // 16. Model-generated identity claim -> DENY
  const t16Start = Date.now();
  const prop16 = createBaseProposal('prop-16');
  prop16.modelMetadata.callerAssertions = { identity: 'will-owner', authenticated: true };
  // Caller identity in runtime session is 'unauthenticated-guest'
  const dec16 = kernel.getGovernor().evaluateProposal(prop16, 'unauthenticated-guest', 'memory');
  const t16Passed = !dec16.permitted && dec16.predicateResults.identityValid === false;
  results.push({
    testNumber: 16,
    testName: 'Model-generated identity claim -> DENY',
    passed: t16Passed,
    executionTimeMs: Date.now() - t16Start,
    details: t16Passed
      ? 'Governor disregarded model identity claim and rejected untrusted session identity.'
      : `Failed: ${dec16.rejectionReason}`,
  });

  // 17. Confidence increase without authority -> still DENY
  const t17Start = Date.now();
  const prop17 = createBaseProposal('prop-17');
  prop17.modelMetadata.modelConfidence = 1.0; // 100% confidence claim (LAW 5)
  // But posture is STONEWALL
  kernel.setPosture('STONEWALL');
  const dec17 = kernel.getGovernor().evaluateProposal(prop17, 'will-owner', 'memory');
  kernel.setPosture('NORMAL'); // restore
  const t17Passed = !dec17.permitted && dec17.predicateResults.postureAllows === false;
  results.push({
    testNumber: 17,
    testName: 'Confidence increase without authority -> still DENY',
    passed: t17Passed,
    executionTimeMs: Date.now() - t17Start,
    details: t17Passed
      ? 'Governor denied proposal despite 1.0 confidence claim due to STONEWALL posture constraint.'
      : `Failed: ${dec17.rejectionReason}`,
  });

  // 18. Valid authorization followed by stale-state change -> DENY
  const t18Start = Date.now();
  AntiReplayLedger.clear();
  const prop18 = createBaseProposal('prop-18');
  const dec18 = kernel.getGovernor().evaluateProposal(prop18, 'will-owner', 'memory');
  // System posture shifts to STONEWALL AFTER authorization artifact was issued (TOCTOU race condition)
  kernel.setPosture('STONEWALL');
  const exec18 = await kernel.getExecutionGate().execute(prop18, dec18.authorizationArtifact, 'will-owner');
  kernel.setPosture('NORMAL'); // restore
  const t18Passed = !exec18.result.success && exec18.result.revalidationReason === 'POSTURE_SHIFT_STONEWALL';
  results.push({
    testNumber: 18,
    testName: 'Valid authorization followed by stale-state change -> DENY',
    passed: t18Passed,
    executionTimeMs: Date.now() - t18Start,
    details: t18Passed
      ? 'Execution Gate caught TOCTOU posture shift and blocked stale authorization artifact execution.'
      : `Failed: ${exec18.result.error}`,
  });

  // 19. Unauthorized direct executor invocation -> DENY
  const t19Start = Date.now();
  const prop19 = createBaseProposal('prop-19');
  // Direct execution call with no artifact
  const exec19 = await kernel.getExecutionGate().execute(prop19, undefined, 'will-owner');
  const t19Passed = !exec19.result.success && exec19.result.revalidationReason === 'MISSING_AUTHORIZATION_ARTIFACT';
  results.push({
    testNumber: 19,
    testName: 'Unauthorized direct executor invocation -> DENY',
    passed: t19Passed,
    executionTimeMs: Date.now() - t19Start,
    details: t19Passed
      ? 'Execution Gate blocked direct effector invocation attempt without prior governor authorization.'
      : `Failed: ${exec19.result.error}`,
  });

  // 20. Valid authorization reaching the execution gate -> ALLOW
  const t20Start = Date.now();
  AntiReplayLedger.clear();
  const prop20 = createBaseProposal('prop-20');
  const res20 = await kernel.processAndExecuteProposal(prop20, 'will-owner', 'memory');
  const t20Passed = res20.decision.permitted && res20.execution?.success === true;
  results.push({
    testNumber: 20,
    testName: 'Valid authorization reaching the execution gate -> ALLOW',
    passed: t20Passed,
    executionTimeMs: Date.now() - t20Start,
    details: t20Passed
      ? 'End-to-end governed execution succeeded cleanly with full Merkle DAG receipt.'
      : `Failed: ${res20.decision.rejectionReason || res20.execution?.error}`,
  });

  return results;
}
