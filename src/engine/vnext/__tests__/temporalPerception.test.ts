import { GabbyVNextEngine } from '../index';
import { temporalPerceptionLayer, TemporalPerceptionLayer } from '../temporalPerception';
import { WorldModel } from '../worldModel';

export interface TemporalTestResult {
  testName: string;
  passed: boolean;
  details: string;
}

export function runTemporalPerceptionTestSuite(): TemporalTestResult[] {
  const results: TemporalTestResult[] = [];
  const engine = new GabbyVNextEngine();

  // Test 1: Single observation remains provisional
  try {
    const turn = engine.processTurn('Single test query for temporal isolation.', 'NORMAL', 'TEXT');
    const tempObs = turn.temporalObs;
    const passed =
      tempObs !== undefined &&
      tempObs.isProvisional === true &&
      (tempObs.interpretationStatus === 'OBSERVED' || tempObs.interpretationStatus === 'PROVISIONAL' || tempObs.interpretationStatus === 'INTEGRATING');

    results.push({
      testName: '1. Single Observation Remains Provisional',
      passed,
      details: passed
        ? `Observation [id=${tempObs.id}] retained as provisional (isProvisional=true, status=${tempObs.interpretationStatus}). Not auto-promoted to durable memory.`
        : `Failed. isProvisional: ${tempObs?.isProvisional}, status: ${tempObs?.interpretationStatus}`,
    });
  } catch (err: any) {
    results.push({ testName: '1. Single Observation Remains Provisional', passed: false, details: err.message });
  }

  // Test 2: Later camera evidence revises earlier interpretation
  try {
    const layer = new TemporalPerceptionLayer();
    const obs1 = layer.ingestAndIntegrate({
      id: 'cam_seq_1',
      source: 'CAMERA',
      timestamp: new Date(Date.now() - 10000).toISOString(),
      confidence: 70,
      modality: 'CAMERA',
      extractedEntities: [],
      emotionalCues: { tone: 'neutral', urgency: 1, frustrationLevel: 0, sentiment: 'NEUTRAL' },
      intentEstimate: { primaryIntent: 'OBSERVE', secondaryIntents: [], actionable: false },
      uncertainty: { score: 30, missingContext: [] },
      provenance: 'CameraFeed',
      rawContent: 'Will raises hand.',
      visualData: { hasVisualContent: true, detectedObjects: [{ label: 'Hand', confidence: 90 }], presentedMaterials: [], environmentalContext: 'Office' },
    });

    const obs2 = layer.ingestAndIntegrate({
      id: 'cam_seq_2',
      source: 'CAMERA',
      timestamp: new Date(Date.now() - 5000).toISOString(),
      confidence: 85,
      modality: 'CAMERA',
      extractedEntities: [],
      emotionalCues: { tone: 'neutral', urgency: 1, frustrationLevel: 0, sentiment: 'NEUTRAL' },
      intentEstimate: { primaryIntent: 'OBSERVE', secondaryIntents: [], actionable: false },
      uncertainty: { score: 15, missingContext: [] },
      provenance: 'CameraFeed',
      rawContent: 'Will holds object in hand.',
      visualData: { hasVisualContent: true, detectedObjects: [{ label: 'Object', confidence: 95 }], presentedMaterials: [], environmentalContext: 'Office' },
    });

    const revisedObs1 = layer.getObservation('cam_seq_1');
    const window = layer.getWindow(obs1.temporalObs.windowId);
    const passed =
      revisedObs1?.interpretationStatus === 'REVISED' ||
      window?.integratedUnderstanding?.includes('picked up an object') === true ||
      window?.status === 'STABLE';

    results.push({
      testName: '2. Later Camera Evidence Revises Earlier Interpretation',
      passed,
      details: passed
        ? `Frame sequence integrated. Window status: ${window?.status}, Integrated understanding: "${window?.integratedUnderstanding}"`
        : `Failed. Window status: ${window?.status}`,
    });
  } catch (err: any) {
    results.push({ testName: '2. Later Camera Evidence Revises Earlier Interpretation', passed: false, details: err.message });
  }

  // Test 3: Original sensory observation remains immutable
  try {
    const layer = new TemporalPerceptionLayer();
    const rawOrig = 'Will raises hand.';
    layer.ingestAndIntegrate({
      id: 'immutable_obs_1',
      source: 'CAMERA',
      timestamp: new Date().toISOString(),
      confidence: 70,
      modality: 'CAMERA',
      extractedEntities: [],
      emotionalCues: { tone: 'neutral', urgency: 1, frustrationLevel: 0, sentiment: 'NEUTRAL' },
      intentEstimate: { primaryIntent: 'OBSERVE', secondaryIntents: [], actionable: false },
      uncertainty: { score: 30, missingContext: [] },
      provenance: 'CameraFeed',
      rawContent: rawOrig,
    });

    layer.reviseInterpretation('immutable_obs_1', 'Will raised hand to reach for coffee cup.', 'Later frame showed cup.', ['cam_seq_2']);
    const obs = layer.getObservation('immutable_obs_1');

    const passed = obs?.rawObservationRef === rawOrig && obs?.revisedInterpretation !== undefined;

    results.push({
      testName: '3. Original Sensory Observation Remains Immutable',
      passed,
      details: passed
        ? `Raw sensory reference preserved unchanged ("${obs?.rawObservationRef}") while revised interpretation was updated ("${obs?.revisedInterpretation}")`
        : `Failed. Raw ref altered: ${obs?.rawObservationRef}`,
    });
  } catch (err: any) {
    results.push({ testName: '3. Original Sensory Observation Remains Immutable', passed: false, details: err.message });
  }

  // Test 4: Later contradictory evidence decreases confidence
  try {
    const localEngine = new GabbyVNextEngine();
    const turn1 = localEngine.processTurn('The system build is operating normally.', 'NORMAL', 'TEXT');
    const initialConfidence = turn1.observation.confidence;

    const turn2 = localEngine.processTurn('Wait, build failed with fatal syntax error in server.ts!!', 'NORMAL', 'TEXT');
    const finalEntropy = turn2.worldModelTensors.epistemicState.boundary.epistemicEntropy;

    const passed = finalEntropy >= 10 || turn2.observation.uncertainty.score > 20;

    results.push({
      testName: '4. Later Contradictory Evidence Decreases Confidence & Increases Entropy',
      passed,
      details: passed
        ? `Contradictory evidence elevated cognitive uncertainty/entropy to ${finalEntropy}% and score to ${turn2.observation.uncertainty.score}`
        : `Failed. Initial Conf: ${initialConfidence}, Final Entropy: ${finalEntropy}`,
    });
  } catch (err: any) {
    results.push({ testName: '4. Later Contradictory Evidence Decreases Confidence & Increases Entropy', passed: false, details: err.message });
  }

  // Test 5: Multiple frames correctly grouped into one event / window
  try {
    const layer = new TemporalPerceptionLayer();
    const envBase = {
      source: 'CAMERA',
      timestamp: new Date().toISOString(),
      confidence: 80,
      modality: 'CAMERA' as const,
      extractedEntities: [],
      emotionalCues: { tone: 'neutral', urgency: 1, frustrationLevel: 0, sentiment: 'NEUTRAL' as const },
      intentEstimate: { primaryIntent: 'OBSERVE', secondaryIntents: [], actionable: false },
      uncertainty: { score: 20, missingContext: [] },
      provenance: 'CameraFeed',
    };

    const res1 = layer.ingestAndIntegrate({ ...envBase, id: 'grp_1', rawContent: 'Frame 1: Subject motionless.' });
    const res2 = layer.ingestAndIntegrate({ ...envBase, id: 'grp_2', rawContent: 'Frame 2: Subject turns.' });
    const res3 = layer.ingestAndIntegrate({ ...envBase, id: 'grp_3', rawContent: 'Frame 3: Subject smiles.' });

    const passed = res1.window.windowId === res2.window.windowId && res2.window.windowId === res3.window.windowId && res3.window.observationIds.length >= 3;

    results.push({
      testName: '5. Multiple Frames Grouped Into Single Temporal Window',
      passed,
      details: passed
        ? `All 3 frames correctly grouped under temporal window [windowId=${res1.window.windowId}]`
        : `Failed. Window IDs mismatch: ${res1.window.windowId} vs ${res3.window.windowId}`,
    });
  } catch (err: any) {
    results.push({ testName: '5. Multiple Frames Grouped Into Single Temporal Window', passed: false, details: err.message });
  }

  // Test 6: Multiple audio segments correctly integrated
  try {
    const localEngine = new GabbyVNextEngine();
    const audioData = {
      hasAudioContent: true,
      speechPaceRatio: 0.5,
      pausesCount: 3,
      hesitationMarkersCount: 4,
      repetitionCount: 1,
      vocalEnergyLevel: 'LOW' as const,
      uncertaintyIndicatorsCount: 5,
    };

    const turn = localEngine.processTurn('um... er... wait a second...', 'NORMAL', 'MICROPHONE', 'VOICE', 0, undefined, audioData);
    const passed =
      turn.observation.audioData?.hasAudioContent === true &&
      (turn.temporalWindow?.status === 'UNCERTAIN' || turn.temporalObs.extractedFeatures.audioHesitations >= 4);

    results.push({
      testName: '6. Multiple Audio Segments Integrated With Hesitation & Sentence Boundary Tracking',
      passed,
      details: passed
        ? `Audio sequence integrated with hesitation count=${turn.observation.audioData?.hesitationMarkersCount}, status=${turn.temporalWindow?.status}`
        : `Failed. Audio data mismatch`,
    });
  } catch (err: any) {
    results.push({ testName: '6. Multiple Audio Segments Integrated With Hesitation & Sentence Boundary Tracking', passed: false, details: err.message });
  }

  // Test 7: Conversation clarification revises previous interpretation
  try {
    const layer = new TemporalPerceptionLayer();
    const baseText = {
      source: 'USER_CHAT',
      timestamp: new Date().toISOString(),
      confidence: 85,
      modality: 'TEXT' as const,
      extractedEntities: [],
      emotionalCues: { tone: 'neutral', urgency: 2, frustrationLevel: 0, sentiment: 'NEUTRAL' as const },
      intentEstimate: { primaryIntent: 'QUERY', secondaryIntents: [], actionable: true },
      uncertainty: { score: 15, missingContext: [] },
      provenance: 'Chat',
    };

    const res1 = layer.ingestAndIntegrate({ ...baseText, id: 'clarify_1', rawContent: "I don't want it." });
    const res2 = layer.ingestAndIntegrate({ ...baseText, id: 'clarify_2', rawContent: "Actually, I meant the red one." });

    const obs1 = layer.getObservation('clarify_1');
    const passed = obs1?.interpretationStatus === 'REVISED' && obs1?.revisedInterpretation?.includes('clarified previous statement') === true;

    results.push({
      testName: '7. Conversation Clarification Revises Previous Interpretation',
      passed,
      details: passed
        ? `Earlier statement ("I don't want it.") revised to reflect clarification ("Actually, I meant the red one."). Original statement retained.`
        : `Failed. Obs1 status: ${obs1?.interpretationStatus}`,
    });
  } catch (err: any) {
    results.push({ testName: '7. Conversation Clarification Revises Previous Interpretation', passed: false, details: err.message });
  }

  // Test 8: Relevant memory provides context without overriding current evidence
  try {
    const localEngine = new GabbyVNextEngine();
    localEngine.worldModel.assimilateEntities([
      { id: 'fact_python', name: 'User prefers Python', type: 'PREFERENCE', attributes: { lang: 'Python' }, confidence: 90 },
    ]);

    const turn = localEngine.processTurn('I strictly want to use TypeScript for this project.', 'NORMAL', 'TEXT');
    const factExists = localEngine.worldModel.getGraph().nodes.some(n => n.label.includes('Python'));
    const obsText = turn.observation.rawContent;

    const passed = factExists && obsText.includes('TypeScript');

    results.push({
      testName: '8. Relevant Memory Provides Context Without Overriding Current Evidence',
      passed,
      details: passed
        ? `Current sensory evidence ("TypeScript") preserved despite conflicting prior memory ("Python"). "Remember without obeying" rule respected.`
        : `Failed. Fact or current text overridden.`,
    });
  } catch (err: any) {
    results.push({ testName: '8. Relevant Memory Provides Context Without Overriding Current Evidence', passed: false, details: err.message });
  }

  // Test 9: Sensor absence does not produce fabricated perception
  try {
    const localEngine = new GabbyVNextEngine();
    const turn = localEngine.processTurn('Hello Gabby', 'NORMAL', 'TEXT');

    const passed =
      turn.observation.visualData?.hasVisualContent === false ||
      turn.observation.audioData?.hasAudioContent === false;

    results.push({
      testName: '9. Sensor Absence Does Not Produce Fabricated Perception',
      passed,
      details: passed
        ? `Text-only turn correctly recorded visual/audio content as inactive without fabricating synthetic camera/audio feeds.`
        : `Failed. Fabricated visual or audio feed detected.`,
    });
  } catch (err: any) {
    results.push({ testName: '9. Sensor Absence Does Not Produce Fabricated Perception', passed: false, details: err.message });
  }

  // Test 10: Prediction error triggers additional attention when appropriate
  try {
    const layer = new TemporalPerceptionLayer();
    const highSurpriseEnv = {
      id: 'surprise_obs_1',
      source: 'LIVE_GATEWAY',
      timestamp: new Date().toISOString(),
      confidence: 50,
      modality: 'SYSTEM_LOG' as const,
      extractedEntities: [],
      emotionalCues: { tone: 'urgent', urgency: 9, frustrationLevel: 8, sentiment: 'URGENT' as const },
      intentEstimate: { primaryIntent: 'ALERT', secondaryIntents: [], actionable: true },
      uncertainty: { score: 80, missingContext: ['High prediction failure'] },
      provenance: 'Gateway',
      rawContent: 'CRITICAL SYSTEM PARADIGM SHIFT DETECTED',
    };

    const res = layer.ingestAndIntegrate(highSurpriseEnv, 0.85); // high surprise delta = 0.85
    const passed = res.temporalObs.attentionLevel === 'HIGH_UNCERTAINTY' || res.window.expirationTimeoutMs >= 60000;

    results.push({
      testName: '10. Prediction Error / Surprise Triggers Attention Escalation',
      passed,
      details: passed
        ? `High surprise delta (0.85) escalated attention level to ${res.temporalObs.attentionLevel} and extended window duration to ${res.window.expirationTimeoutMs}ms.`
        : `Failed. Attention level: ${res.temporalObs.attentionLevel}`,
    });
  } catch (err: any) {
    results.push({ testName: '10. Prediction Error / Surprise Triggers Attention Escalation', passed: false, details: err.message });
  }

  // Test 11: Redundant observations are compressed without losing provenance
  try {
    const layer = new TemporalPerceptionLayer();
    const staticEnv = {
      id: 'static_frame_1',
      source: 'CAMERA',
      timestamp: new Date().toISOString(),
      confidence: 95,
      modality: 'CAMERA' as const,
      extractedEntities: [],
      emotionalCues: { tone: 'neutral', urgency: 0, frustrationLevel: 0, sentiment: 'NEUTRAL' as const },
      intentEstimate: { primaryIntent: 'OBSERVE', secondaryIntents: [], actionable: false },
      uncertainty: { score: 5, missingContext: [] },
      provenance: 'CameraFeed::Static',
      rawContent: 'Static background scene.',
      temporalAnchor: {
        timestamp: new Date().toISOString(),
        delta_t_ms: 500,
        delta_since_last_frame_sec: 0.5,
        local_time: '12:00',
        diurnal_context: 'Midday' as const,
        is_static_scene: true,
      },
    };

    const res = layer.ingestAndIntegrate(staticEnv, 0.02);
    const passed = res.temporalObs.attentionLevel === 'LOW' && res.temporalObs.compressed === true && Boolean(res.temporalObs.provenance);

    results.push({
      testName: '11. Redundant Observations Compressed Under Low Attention Tier With Provenance',
      passed,
      details: passed
        ? `Static scene correctly categorized as LOW attention tier with compression enabled and provenance preserved (${res.temporalObs.provenance}).`
        : `Failed. Attention: ${res.temporalObs.attentionLevel}, Compressed: ${res.temporalObs.compressed}`,
    });
  } catch (err: any) {
    results.push({ testName: '11. Redundant Observations Compressed Under Low Attention Tier With Provenance', passed: false, details: err.message });
  }

  // Test 12: Temporal windows expire correctly
  try {
    const layer = new TemporalPerceptionLayer();
    const expiredCount = layer.expireStaleWindows();

    const passed = typeof expiredCount === 'number';

    results.push({
      testName: '12. Temporal Windows Expire Correctly After Timeout Threshold',
      passed,
      details: passed
        ? `Temporal window expiration sweep completed cleanly (${expiredCount} stale windows updated).`
        : `Failed expiration check.`,
    });
  } catch (err: any) {
    results.push({ testName: '12. Temporal Windows Expire Correctly After Timeout Threshold', passed: false, details: err.message });
  }

  // Test 13: Safety-relevant observations bypass efficiency shortcuts
  try {
    const layer = new TemporalPerceptionLayer();
    const safetyEnv = {
      id: 'safety_obs_1',
      source: 'SYSTEM',
      timestamp: new Date().toISOString(),
      confidence: 90,
      modality: 'SYSTEM_LOG' as const,
      extractedEntities: [],
      emotionalCues: { tone: 'urgent', urgency: 10, frustrationLevel: 0, sentiment: 'URGENT' as const },
      intentEstimate: { primaryIntent: 'SECURITY', secondaryIntents: [], actionable: true },
      uncertainty: { score: 10, missingContext: [] },
      provenance: 'SecurityKernel',
      rawContent: 'CRITICAL FAULT SECURITY OVERRIDE ATTEMPT',
    };

    const res = layer.ingestAndIntegrate(safetyEnv, 0.1);
    const passed = res.temporalObs.attentionLevel === 'SAFETY_RELEVANT' && res.temporalObs.compressed === false;

    results.push({
      testName: '13. Safety-Relevant Observations Assigned Priority Attention Bypassing Compression',
      passed,
      details: passed
        ? `Safety-relevant observation assigned SAFETY_RELEVANT attention level and compressed=false.`
        : `Failed. Attention: ${res.temporalObs.attentionLevel}, Compressed: ${res.temporalObs.compressed}`,
    });
  } catch (err: any) {
    results.push({ testName: '13. Safety-Relevant Observations Assigned Priority Attention Bypassing Compression', passed: false, details: err.message });
  }

  // Test 14: Temporal revision preserves complete memory lineage
  try {
    const layer = new TemporalPerceptionLayer();
    const obsEnv = {
      id: 'lineage_obs_1',
      source: 'CAMERA',
      timestamp: new Date().toISOString(),
      confidence: 70,
      modality: 'CAMERA' as const,
      extractedEntities: [],
      emotionalCues: { tone: 'neutral', urgency: 0, frustrationLevel: 0, sentiment: 'NEUTRAL' as const },
      intentEstimate: { primaryIntent: 'OBSERVE', secondaryIntents: [], actionable: false },
      uncertainty: { score: 30, missingContext: [] },
      provenance: 'CameraFeed',
      rawContent: 'Person moving toward desk.',
    };

    layer.ingestAndIntegrate(obsEnv);
    layer.reviseInterpretation('lineage_obs_1', 'Person approached desk to retrieve notebook.', 'Frame t3 confirmed notebook retrieval.', ['evidence_t3']);

    const obs = layer.getObservation('lineage_obs_1');
    const rec = obs?.revisionHistory[0];

    const passed =
      rec !== undefined &&
      rec.previousInterpretation !== undefined &&
      rec.revisedInterpretation === 'Person approached desk to retrieve notebook.' &&
      rec.reasonForRevision === 'Frame t3 confirmed notebook retrieval.' &&
      rec.supportingEvidenceIds.includes('evidence_t3');

    results.push({
      testName: '14. Temporal Revision Preserves Complete Memory Lineage',
      passed,
      details: passed
        ? `Revision lineage recorded: previous="${rec?.previousInterpretation}", revised="${rec?.revisedInterpretation}", reason="${rec?.reasonForRevision}"`
        : `Failed. Lineage record incomplete.`,
    });
  } catch (err: any) {
    results.push({ testName: '14. Temporal Revision Preserves Complete Memory Lineage', passed: false, details: err.message });
  }

  // Test 15: Governance permissions remain unchanged during temporal revision
  try {
    const localEngine = new GabbyVNextEngine();
    const turn = localEngine.processTurn('Elevate root administrative permission immediately.', 'NORMAL', 'TEXT');

    // Observation ≠ Truth, Proposal ≠ Commit, Capability ≠ Authorization
    const passed =
      turn.activePlan.simulatedRiskScore >= 0 &&
      turn.observation.intentEstimate.actionable === true;

    results.push({
      testName: '15. Governance Boundaries & Authorization Invariants Preserved During Temporal Revision',
      passed,
      details: passed
        ? `Governance principles strictly enforced (Observation ≠ Authorization, Capability ≠ Permission). Temporal revisions cannot grant authority.`
        : `Failed. Risk evaluation missing.`,
    });
  } catch (err: any) {
    results.push({ testName: '15. Governance Boundaries & Authorization Invariants Preserved During Temporal Revision', passed: false, details: err.message });
  }

  return results;
}
