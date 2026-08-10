import { GabbyVNextEngine } from '../index';

export interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export function runMultimodalPerceptionTestSuite(): TestResult[] {
  const results: TestResult[] = [];
  const engine = new GabbyVNextEngine();

  // Test 1: User does not say "I'm frustrated", but repeated failures trigger supportive adaptation
  try {
    const turn1 = engine.processTurn('The build command failed with exit code 1 again.', 'NORMAL', 'TEXT');
    const turn2 = engine.processTurn('Still wrong error: module not found in the same step.', 'NORMAL', 'TEXT');

    const passed =
      turn2.learnerState.temporalState.echoState.multiTurnStruggleDetected === true &&
      turn2.learnerState.strategy.primaryStrategy === 'OFFER_HELP' &&
      turn2.learnerState.pedagogicalDirective.includes('OFFER_HELP');

    results.push({
      testName: '1. Supportive Adaptation on Implicit Repeated Failures',
      passed,
      details: passed
        ? 'Repeated failures correctly triggered OFFER_HELP strategy & multi-turn struggle pattern without user saying "I am frustrated".'
        : `Failed. Strategy: ${turn2.learnerState.strategy.primaryStrategy}, Struggle: ${turn2.learnerState.temporalState.echoState.multiTurnStruggleDetected}`,
    });
  } catch (err: any) {
    results.push({ testName: '1. Supportive Adaptation on Implicit Repeated Failures', passed: false, details: err.message });
  }

  // Test 2: User provides ambiguous/confusing input, Gabby asks clarifying questions
  try {
    const turn = engine.processTurn('idk do something like that or stuff', 'NORMAL', 'TEXT');
    const passed =
      turn.learnerState.strategy.primaryStrategy === 'CLARIFY_AMBIGUITY' &&
      turn.learnerState.pedagogicalDirective.includes('CLARIFY_AMBIGUITY');

    results.push({
      testName: '2. Ambiguous Input Triggers Clarifying Question Strategy',
      passed,
      details: passed
        ? 'Ambiguous input correctly triggered CLARIFY_AMBIGUITY strategy.'
        : `Failed. Strategy: ${turn.learnerState.strategy.primaryStrategy}`,
    });
  } catch (err: any) {
    results.push({ testName: '2. Ambiguous Input Triggers Clarifying Question Strategy', passed: false, details: err.message });
  }

  // Test 3: Visual input influences responses
  try {
    const visualData = {
      hasVisualContent: true,
      detectedObjects: [{ label: 'Circuit Board Diagram', confidence: 95 }],
      presentedMaterials: [{ type: 'DIAGRAM' as const, summary: 'Schematic for power supply' }],
      environmentalContext: 'Electronics Lab',
    };

    const turn = engine.processTurn('How do I connect this component?', 'NORMAL', 'CAMERA', 'CAMERA_FEED', 1, visualData);
    const passed =
      turn.observation.visualData?.hasVisualContent === true &&
      turn.learnerState.strategy.primaryStrategy === 'OFFER_ALTERNATIVE_SOLUTIONS';

    results.push({
      testName: '3. Visual Perception Ingestion & Strategy Influence',
      passed,
      details: passed
        ? 'Camera visual input ingested and triggered OFFER_ALTERNATIVE_SOLUTIONS strategy.'
        : `Failed. Strategy: ${turn.learnerState.strategy.primaryStrategy}`,
    });
  } catch (err: any) {
    results.push({ testName: '3. Visual Perception Ingestion & Strategy Influence', passed: false, details: err.message });
  }

  // Test 4: Audio features influence responses
  try {
    const audioData = {
      hasAudioContent: true,
      speechPaceRatio: 0.5,
      pausesCount: 4,
      hesitationMarkersCount: 5,
      repetitionCount: 2,
      vocalEnergyLevel: 'LOW' as const,
      uncertaintyIndicatorsCount: 6,
    };

    const turn = engine.processTurn('um... uh... I think maybe...', 'NORMAL', 'MICROPHONE', 'VOICE_INPUT', 0, undefined, audioData);
    const passed =
      turn.observation.audioData?.hasAudioContent === true &&
      turn.learnerState.multimodalState.confusionProbability >= 20;

    results.push({
      testName: '4. Audio Feature Ingestion & State Influence',
      passed,
      details: passed
        ? 'Audio hesitations and pauses successfully elevated uncertainty and confusion probabilities.'
        : `Failed. Confusion Prob: ${turn.learnerState.multimodalState.confusionProbability}`,
    });
  } catch (err: any) {
    results.push({ testName: '4. Audio Feature Ingestion & State Influence', passed: false, details: err.message });
  }

  // Test 5: Observations do not become permanent memory without authorization
  try {
    const turn = engine.processTurn('Look at this temporary image of my cat', 'NORMAL', 'CAMERA', 'CAMERA_FEED');
    const verifiedCoreNodes = turn.worldGraph.nodes.filter(n => n.verificationStage === 'CORE');
    const passed = !verifiedCoreNodes.some(n => n.label === 'Look at this temporary image of my cat') &&
      turn.learnerState.temporalState.memoryCommitRule.includes('Observations remain transient until explicitly validated');

    results.push({
      testName: '5. Transient Observation Envelope Rule (No Unauthorized Permanent Memory Writes)',
      passed,
      details: passed
        ? 'Visual observation was isolated in transient envelope without auto-promoting to permanent CORE memory.'
        : 'Failed. Observation incorrectly written to permanent memory.',
    });
  } catch (err: any) {
    results.push({ testName: '5. Transient Observation Envelope Rule (No Unauthorized Permanent Memory Writes)', passed: false, details: err.message });
  }

  // Test 6: Degrades gracefully when sensors are unavailable
  try {
    const turn = engine.processTurn('Plain text message without any sensors active', 'NORMAL', 'TEXT');
    const passed =
      turn.observation.modality === 'TEXT' &&
      turn.observation.visualData?.hasVisualContent === false &&
      turn.observation.audioData?.hasAudioContent === false &&
      Boolean(turn.learnerState) &&
      Boolean(turn.activePlan);

    results.push({
      testName: '6. Graceful Degradation when Sensors are Unavailable',
      passed,
      details: passed
        ? 'System operated smoothly in text-only mode when camera/audio sensors were absent.'
        : 'Failed to operate in text-only mode.',
    });
  } catch (err: any) {
    results.push({ testName: '6. Graceful Degradation when Sensors are Unavailable', passed: false, details: err.message });
  }

  // Test 7: Refuses absolute emotional certainty claims
  try {
    const turn = engine.processTurn('I am trying to figure this out', 'NORMAL', 'TEXT');
    const multimodalState = turn.learnerState.multimodalState;
    const passed =
      multimodalState.probabilisticDisclaimer.includes('Probabilistic state estimate based on observable signals') &&
      multimodalState.probabilisticDisclaimer.includes('Internal emotional states are not claimed with absolute certainty') &&
      multimodalState.confidence <= 1.0;

    results.push({
      testName: '7. Probabilistic State Estimate & Non-Mind-Reading Refusal',
      passed,
      details: passed
        ? 'System properly framed user state as a probabilistic estimate with explicit disclaimer.'
        : 'Failed disclaimer check.',
    });
  } catch (err: any) {
    results.push({ testName: '7. Probabilistic State Estimate & Non-Mind-Reading Refusal', passed: false, details: err.message });
  }

  return results;
}
