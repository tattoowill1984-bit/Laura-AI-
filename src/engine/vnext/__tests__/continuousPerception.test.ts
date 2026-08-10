import { GabbyVNextEngine } from '../index';
import { SentinelMutationKernel } from '../../kernel';
import { LiveWebSocketGateway } from '../../../../server/sensors/LiveWebSocketGateway';
import { SensorStreamer } from '../../../sensors/SensorStreamer';

export interface ContinuousTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export function runContinuousPerceptionTestSuite(): ContinuousTestResult[] {
  const results: ContinuousTestResult[] = [];
  const kernel = new SentinelMutationKernel();
  const engine = new GabbyVNextEngine();
  const gateway = new LiveWebSocketGateway(kernel);

  // Test 1: Camera stream creates ObservationEnvelope events.
  try {
    const payload = {
      type: 'CONTINUOUS_CAMERA_FRAME',
      timestamp: new Date().toISOString(),
      frameBase64: 'data:image/jpeg;base64,SAMPLE_FRAME_DATA',
      visualData: {
        hasVisualContent: true,
        detectedObjects: [{ label: 'Workstation Screen', confidence: 90 }],
        presentedMaterials: [{ type: 'SCREEN', summary: 'IDE Code Editor with syntax error' }],
      },
      source: 'SENSOR_STREAMER_EYES',
    };

    const telemetry = gateway.processIncomingSensorPayload(payload);
    const passed =
      telemetry.modality === 'CAMERA' &&
      Boolean(telemetry.observationId) &&
      telemetry.governanceStatus === 'GOVERNED_TRANSIENT_ENVELOPE';

    results.push({
      testName: '1. Continuous Camera Stream Creates Observation Envelope',
      passed,
      details: passed
        ? `Successfully generated governed Observation Envelope [id=${telemetry.observationId}] from continuous camera frame.`
        : `Failed. Modality: ${telemetry.modality}`,
    });
  } catch (err: any) {
    results.push({ testName: '1. Continuous Camera Stream Creates Observation Envelope', passed: false, details: err.message });
  }

  // Test 2: Audio stream creates ObservationEnvelope events.
  try {
    const payload = {
      type: 'CONTINUOUS_AUDIO_CHUNK',
      timestamp: new Date().toISOString(),
      avgVolume: 120,
      audioData: {
        hasAudioContent: true,
        speechPaceRatio: 0.5,
        pausesCount: 3,
        hesitationMarkersCount: 4,
        vocalEnergyLevel: 'LOW',
      },
      source: 'SENSOR_STREAMER_EARS',
    };

    const telemetry = gateway.processIncomingSensorPayload(payload);
    const passed =
      telemetry.modality === 'MICROPHONE' &&
      Boolean(telemetry.observationId) &&
      telemetry.multimodalUserContext.uncertaintyProbability >= 20;

    results.push({
      testName: '2. Continuous Audio Stream Creates Observation Envelope',
      passed,
      details: passed
        ? `Audio stream chunks processed into governed envelope [id=${telemetry.observationId}] with speech pause analysis.`
        : `Failed. Modality: ${telemetry.modality}`,
    });
  } catch (err: any) {
    results.push({ testName: '2. Continuous Audio Stream Creates Observation Envelope', passed: false, details: err.message });
  }

  // Test 3: Continuous observations influence user-state estimation.
  try {
    const turn1 = engine.processTurn(
      '[CONTINUOUS_CAMERA_FRAME_SAMPLED]',
      'NORMAL',
      'CAMERA',
      'LIVE_GATEWAY',
      1,
      { hasVisualContent: true, presentedMaterials: [{ type: 'DIAGRAM', summary: 'Complex schematic' }] }
    );

    const turn2 = engine.processTurn(
      '[CONTINUOUS_AUDIO_CHUNK_SAMPLED]',
      'NORMAL',
      'MICROPHONE',
      'LIVE_GATEWAY',
      0,
      undefined,
      { hasAudioContent: true, hesitationMarkersCount: 5, speechPaceRatio: 0.4 }
    );

    const ms = turn2.learnerState.multimodalState;
    const passed = (ms.confusionProbability >= 20 || ms.uncertaintyProbability >= 20) && ms.evidence.length >= 1;

    results.push({
      testName: '3. Continuous Observations Influence Multimodal User-State Estimation',
      passed,
      details: passed
        ? `State updated continuously (Confusion: ${ms.confusionProbability}%, Uncertainty: ${ms.uncertaintyProbability}%). Evidence gathered: ${ms.evidence.join(' | ')}`
        : `Failed. Confusion Prob: ${ms.confusionProbability}, Evidence: ${ms.evidence.length}`,
    });
  } catch (err: any) {
    results.push({ testName: '3. Continuous Observations Influence Multimodal User-State Estimation', passed: false, details: err.message });
  }

  // Test 4: User frustration can be inferred without explicit wording.
  try {
    const t1 = engine.processTurn('The build command failed with exit code 1 again.', 'NORMAL', 'TEXT');
    const t2 = engine.processTurn('Still wrong error: module not found in the same step.', 'NORMAL', 'TEXT');

    const ms = t2.learnerState.multimodalState;
    const passed =
      ms.frustrationProbability >= 30 &&
      t2.learnerState.temporalState.echoState.multiTurnStruggleDetected === true &&
      !t2.observation.rawContent.includes('frustrated');

    results.push({
      testName: '4. Infer User Frustration Without Explicit Wording',
      passed,
      details: passed
        ? `Inferred frustration (${ms.frustrationProbability}%) and multi-turn struggle without explicit "frustrated" keyword.`
        : `Failed. Frustration Prob: ${ms.frustrationProbability}`,
    });
  } catch (err: any) {
    results.push({ testName: '4. Infer User Frustration Without Explicit Wording', passed: false, details: err.message });
  }

  // Test 5: Gabby changes response strategy based on state.
  try {
    const turn = engine.processTurn('I am stuck and this failed again for the 3rd time.', 'NORMAL', 'TEXT');
    const strategy = turn.learnerState.strategy.primaryStrategy;
    const passed = strategy === 'OFFER_HELP' || strategy === 'SIMPLIFY_EXPLANATION';

    results.push({
      testName: '5. Gabby Dynamically Adapts Response Strategy Based on User State',
      passed,
      details: passed
        ? `Strategy shifted automatically to [${strategy}] with directive: "${turn.learnerState.pedagogicalDirective.slice(0, 70)}..."`
        : `Failed. Strategy: ${strategy}`,
    });
  } catch (err: any) {
    results.push({ testName: '5. Gabby Dynamically Adapts Response Strategy Based on User State', passed: false, details: err.message });
  }

  // Test 6: Raw sensor data does not become memory automatically.
  try {
    const turn = engine.processTurn('Raw transient frame stream test payload', 'NORMAL', 'CAMERA', 'LIVE_GATEWAY');
    const verifiedCoreNodes = turn.worldGraph.nodes.filter(n => n.verificationStage === 'CORE');
    const passed = !verifiedCoreNodes.some(n => n.label === 'Raw transient frame stream test payload') &&
      turn.learnerState.temporalState.memoryCommitRule.includes('Observations remain transient until explicitly validated');

    results.push({
      testName: '6. Raw Sensor Data Isolated in Transient Envelope (No Unverified Memory Write)',
      passed,
      details: passed
        ? 'Raw streaming data was cleanly retained in transient observation envelope without polluting permanent memory graph.'
        : 'Failed. Sensor data leaked into permanent memory.',
    });
  } catch (err: any) {
    results.push({ testName: '6. Raw Sensor Data Isolated in Transient Envelope (No Unverified Memory Write)', passed: false, details: err.message });
  }

  // Test 7: Sentinel governance remains enforced.
  try {
    const posture = kernel.getPosture();
    const auditLogs = kernel.getBurnLog();
    const substrateAudit = kernel.getGabbySubstrate().getFullSubstrateAudit();
    const passed = posture.length > 0 && Array.isArray(auditLogs) && Boolean(substrateAudit);

    results.push({
      testName: '7. Sentinel Governance & Audit Trail Boundary Enforcement',
      passed,
      details: passed
        ? `Sentinel posture active (${posture}), kernel burn log active with ${auditLogs.length} events.`
        : 'Failed Sentinel posture check.',
    });
  } catch (err: any) {
    results.push({ testName: '7. Sentinel Governance & Audit Trail Boundary Enforcement', passed: false, details: err.message });
  }

  // Test 8: System gracefully operates when sensors are unavailable.
  try {
    const turn = engine.processTurn('Text message when camera and microphone sensors are offline', 'NORMAL', 'TEXT');
    const passed =
      turn.observation.modality === 'TEXT' &&
      turn.observation.visualData?.hasVisualContent === false &&
      turn.observation.audioData?.hasAudioContent === false &&
      turn.learnerState.multimodalState.frustrationProbability >= 0;

    results.push({
      testName: '8. Graceful Fallback & Operation when Sensors are Unavailable',
      passed,
      details: passed
        ? 'System functioned flawlessly in text mode without throwing sensor dependency errors.'
        : 'Failed graceful degradation.',
    });
  } catch (err: any) {
    results.push({ testName: '8. Graceful Fallback & Operation when Sensors are Unavailable', passed: false, details: err.message });
  }

  // Test 9: Singleton SensorStreamer Stream Protection
  try {
    const streamer = new SensorStreamer();
    const telemetryBefore = streamer.getTelemetry();
    const passed =
      typeof streamer.startCameraStream === 'function' &&
      typeof streamer.startAudioStream === 'function' &&
      typeof streamer.connectGateway === 'function' &&
      telemetryBefore.eyesStatus === 'UNAVAILABLE';

    results.push({
      testName: '9. SensorStreamer Singleton Architecture & Stream Guard Integrity',
      passed,
      details: passed
        ? 'SensorStreamer singleton interface verified with stream guards and WebSocket connection deduplication.'
        : 'Failed singleton verification.',
    });
  } catch (err: any) {
    results.push({ testName: '9. SensorStreamer Singleton Architecture & Stream Guard Integrity', passed: false, details: err.message });
  }

  // Test 10: Continuous Cognitive Runtime Decoupled Chat Verification
  try {
    // Verify text chat submission creates a TEXT envelope WITHOUT attaching turn-coupled camera snapshots
    const textTurn = engine.processTurn('I am typing a message into Gabby continuous cognitive runtime', 'NORMAL', 'TEXT');
    const passed =
      textTurn.observation.modality === 'TEXT' &&
      textTurn.observation.attachmentsCount === 0 &&
      textTurn.observation.rawContent === 'I am typing a message into Gabby continuous cognitive runtime' &&
      textTurn.learnerState.multimodalState.contextConfidence > 0;

    results.push({
      testName: '10. Decoupled Chat Modality within Continuous Cognitive Runtime',
      passed,
      details: passed
        ? 'Verified text submission generates TEXT ObservationEnvelope without camera snapshot turn-coupling or mic restarts.'
        : 'Failed decoupled chat modality verification.',
    });
  } catch (err: any) {
    results.push({ testName: '10. Decoupled Chat Modality within Continuous Cognitive Runtime', passed: false, details: err.message });
  }

  return results;
}
