import {
  ObservationEnvelopeVNext,
  TemporalObservation,
  TemporalPerceptionWindow,
  TemporalStatus,
  AttentionLevel,
  InterpretationRevisionRecord,
  PerceptionModality,
} from './types';
import { WorldModel } from './worldModel';

export class TemporalPerceptionLayer {
  private observationsMap: Map<string, TemporalObservation> = new Map();
  private windowsMap: Map<string, TemporalPerceptionWindow> = new Map();
  private activeWindowId: string | null = null;
  private defaultWindowTimeoutMs: number = 30000; // 30s expiration

  constructor() {
    this.seedDefaultWindows();
  }

  private seedDefaultWindows() {
    const nowEpoch = Date.now();
    const seededWindowId = `win_seed_init`;

    const seedWindow: TemporalPerceptionWindow = {
      windowId: seededWindowId,
      startTime: new Date(nowEpoch - 60000).toISOString(),
      lastUpdateTime: new Date(nowEpoch - 10000).toISOString(),
      modalityContext: 'CAMERA_MICROPHONE_HYBRID',
      observationIds: ['obs_temporal_seed_1', 'obs_temporal_seed_2', 'obs_temporal_seed_3'],
      status: 'INTEGRATING',
      integratedUnderstanding: 'Will reached for and picked up an object while discussing system architecture.',
      plausibleInterpretations: [
        {
          interpretation: 'Will reached for an object and picked it up.',
          confidence: 90,
          supportingObservationIds: ['obs_temporal_seed_1', 'obs_temporal_seed_2', 'obs_temporal_seed_3'],
        },
        {
          interpretation: 'Will adjusted camera angle.',
          confidence: 30,
          supportingObservationIds: ['obs_temporal_seed_1'],
        },
      ],
      expirationTimeoutMs: 30000,
      attentionLevel: 'MODERATE',
    };

    const obs1: TemporalObservation = {
      id: 'obs_temporal_seed_1',
      timestamp: new Date(nowEpoch - 60000).toISOString(),
      modality: 'CAMERA',
      source: 'SENSOR_STREAMER_EYES',
      provenance: 'TemporalPerceptionLayer::CAMERA::Frame1',
      rawObservationRef: 'Will raises hand near workstation.',
      extractedFeatures: { frameNumber: 1, handRaised: true },
      preliminaryInterpretation: 'Will raised his hand.',
      revisedInterpretation: 'Will raised his hand as part of reaching for an object.',
      finalUnderstanding: 'Initial movement in sequence of picking up object.',
      confidence: 75,
      uncertainty: 25,
      windowId: seededWindowId,
      relatedObservationIds: ['obs_temporal_seed_2', 'obs_temporal_seed_3'],
      interpretationStatus: 'REVISED',
      revisionHistory: [
        {
          timestamp: new Date(nowEpoch - 30000).toISOString(),
          previousInterpretation: 'Will raised his hand.',
          revisedInterpretation: 'Will raised his hand as part of reaching for an object.',
          reasonForRevision: 'Later frames (Frame 3 & 4) revealed an object being picked up.',
          supportingEvidenceIds: ['obs_temporal_seed_2', 'obs_temporal_seed_3'],
          confidence: 92,
        },
      ],
      isProvisional: true,
      safetyRelevant: false,
      attentionLevel: 'MODERATE',
    };

    const obs2: TemporalObservation = {
      id: 'obs_temporal_seed_2',
      timestamp: new Date(nowEpoch - 45000).toISOString(),
      modality: 'CAMERA',
      source: 'SENSOR_STREAMER_EYES',
      provenance: 'TemporalPerceptionLayer::CAMERA::Frame2',
      rawObservationRef: 'Will reaches toward something off-screen.',
      extractedFeatures: { frameNumber: 2, trajectory: 'Forward reach' },
      preliminaryInterpretation: 'Will reaches toward something.',
      confidence: 80,
      uncertainty: 20,
      windowId: seededWindowId,
      relatedObservationIds: ['obs_temporal_seed_1', 'obs_temporal_seed_3'],
      interpretationStatus: 'INTEGRATING',
      revisionHistory: [],
      isProvisional: true,
      safetyRelevant: false,
      attentionLevel: 'MODERATE',
    };

    const obs3: TemporalObservation = {
      id: 'obs_temporal_seed_3',
      timestamp: new Date(nowEpoch - 30000).toISOString(),
      modality: 'CAMERA',
      source: 'SENSOR_STREAMER_EYES',
      provenance: 'TemporalPerceptionLayer::CAMERA::Frame3',
      rawObservationRef: 'Will holds object in view.',
      extractedFeatures: { frameNumber: 3, objectVisible: true },
      preliminaryInterpretation: 'Will is holding an object.',
      confidence: 95,
      uncertainty: 5,
      windowId: seededWindowId,
      relatedObservationIds: ['obs_temporal_seed_1', 'obs_temporal_seed_2'],
      interpretationStatus: 'STABLE',
      revisionHistory: [],
      isProvisional: true,
      safetyRelevant: false,
      attentionLevel: 'MODERATE',
    };

    this.windowsMap.set(seededWindowId, seedWindow);
    this.activeWindowId = seededWindowId;
    this.observationsMap.set(obs1.id, obs1);
    this.observationsMap.set(obs2.id, obs2);
    this.observationsMap.set(obs3.id, obs3);
  }

  /**
   * Ingests an ObservationEnvelopeVNext into the Temporal Perception Layer.
   * Associates nearby observations into temporal evidence windows.
   */
  public ingestAndIntegrate(
    obs: ObservationEnvelopeVNext,
    surpriseDelta: number = 0.1,
    worldModel?: WorldModel
  ): {
    temporalObs: TemporalObservation;
    window: TemporalPerceptionWindow;
    humanCommunicationString?: string;
  } {
    const now = new Date();
    const nowEpoch = now.getTime();

    // 1. Determine Attention Escalation Tier
    const attentionLevel = this.evaluateAttentionEscalation(obs, surpriseDelta);

    // 2. Select or Create Active Temporal Window
    let window = this.getOrCreateActiveWindow(obs, attentionLevel);

    // 3. Build Immutable Temporal Observation (isProvisional = true initially)
    const preliminaryInterpretation = this.derivePreliminaryInterpretation(obs);

    const temporalObs: TemporalObservation = {
      id: obs.id,
      timestamp: obs.timestamp || now.toISOString(),
      modality: obs.modality,
      source: obs.source,
      provenance: obs.provenance || `PerceptionBus::${obs.modality}`,
      rawObservationRef: obs.rawContent, // IMMUTABLE raw sensory data
      extractedFeatures: {
        entitiesCount: obs.extractedEntities.length,
        visualObjectsCount: obs.visualData?.detectedObjects.length || 0,
        audioHesitations: obs.audioData?.hesitationMarkersCount || 0,
        audioPace: obs.audioData?.speechPaceRatio || 1.0,
      },
      preliminaryInterpretation,
      confidence: obs.confidence,
      uncertainty: obs.uncertainty.score,
      windowId: window.windowId,
      relatedObservationIds: [...window.observationIds],
      interpretationStatus: 'OBSERVED',
      revisionHistory: [],
      isProvisional: true, // NOT promoted to durable memory automatically
      safetyRelevant: attentionLevel === 'SAFETY_RELEVANT',
      attentionLevel,
      compressed: attentionLevel === 'LOW',
    };

    // 4. Store Observation & Update Window
    this.observationsMap.set(temporalObs.id, temporalObs);
    window.observationIds.push(temporalObs.id);
    window.lastUpdateTime = now.toISOString();

    // 5. Multimodal Sequence Integration (Visual Sequences, Audio Sequences, Conversational Context)
    this.performSequenceIntegration(window, temporalObs, obs, worldModel);

    // 6. Check for Postdiction / Retrospective Revision of earlier observations in this window
    this.checkForRetrospectiveRevision(window, temporalObs);

    // 7. Update Epistemic Alignment if WorldModel provided
    if (worldModel) {
      this.syncEpistemicState(window, worldModel);
    }

    // 8. Attach metadata back to envelope
    obs.temporalObservation = temporalObs;
    obs.temporalWindowId = window.windowId;

    // 9. Format Natural Human Interaction String if uncertain or revised
    const humanCommunicationString = this.formatHumanInteractionString(window);

    return {
      temporalObs,
      window,
      humanCommunicationString,
    };
  }

  /**
   * Postdiction-Inspired Retrospective Interpretation Revision.
   * Modifies interpretation of an earlier observation while keeping raw observation immutable!
   */
  public reviseInterpretation(
    obsId: string,
    revisedInterpretation: string,
    reasonForRevision: string,
    supportingEvidenceIds: string[] = []
  ): TemporalObservation | null {
    const obs = this.observationsMap.get(obsId);
    if (!obs) return null;

    const previousInterpretation = obs.revisedInterpretation || obs.preliminaryInterpretation;

    const revisionRecord: InterpretationRevisionRecord = {
      timestamp: new Date().toISOString(),
      previousInterpretation,
      revisedInterpretation,
      reasonForRevision,
      supportingEvidenceIds,
      confidence: Math.min(98, obs.confidence + 15),
    };

    obs.revisedInterpretation = revisedInterpretation;
    obs.finalUnderstanding = revisedInterpretation;
    obs.interpretationStatus = 'REVISED';
    obs.confidence = Math.min(98, obs.confidence + 15);
    obs.uncertainty = Math.max(5, obs.uncertainty - 15);
    obs.revisionHistory.push(revisionRecord);

    // Also update parent window status to 'REVISED'
    const window = this.windowsMap.get(obs.windowId);
    if (window) {
      window.status = 'REVISED';
      window.lastUpdateTime = new Date().toISOString();
      window.integratedUnderstanding = revisedInterpretation;
    }

    return obs;
  }

  /**
   * Selects an active window or creates a new window if expired / threshold reached.
   */
  private getOrCreateActiveWindow(obs: ObservationEnvelopeVNext, attentionLevel: AttentionLevel): TemporalPerceptionWindow {
    const nowEpoch = Date.now();

    if (this.activeWindowId) {
      const activeWindow = this.windowsMap.get(this.activeWindowId);
      if (activeWindow && activeWindow.status !== 'EXPIRED' && activeWindow.status !== 'COMMITTED') {
        const elapsedSinceLast = nowEpoch - new Date(activeWindow.lastUpdateTime).getTime();
        if (elapsedSinceLast < activeWindow.expirationTimeoutMs) {
          // If high uncertainty/surprise, extend window duration!
          if (attentionLevel === 'HIGH_UNCERTAINTY' || attentionLevel === 'SAFETY_RELEVANT') {
            activeWindow.expirationTimeoutMs = Math.max(activeWindow.expirationTimeoutMs, 60000); // extend to 60s
            activeWindow.attentionLevel = attentionLevel;
          }
          return activeWindow;
        } else {
          activeWindow.status = 'EXPIRED';
        }
      }
    }

    // Create new window
    const newWindowId = `win_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newWindow: TemporalPerceptionWindow = {
      windowId: newWindowId,
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      modalityContext: obs.modality,
      observationIds: [],
      status: 'OPEN',
      plausibleInterpretations: [],
      expirationTimeoutMs: attentionLevel === 'HIGH_UNCERTAINTY' ? 60000 : this.defaultWindowTimeoutMs,
      attentionLevel,
    };

    this.windowsMap.set(newWindowId, newWindow);
    this.activeWindowId = newWindowId;
    return newWindow;
  }

  /**
   * Attention Escalation Logic (Requirement 11).
   */
  public evaluateAttentionEscalation(obs: ObservationEnvelopeVNext, surpriseDelta: number): AttentionLevel {
    const text = obs.rawContent.toLowerCase();

    // 1. SAFETY_RELEVANT
    if (
      text.includes('safety') ||
      text.includes('danger') ||
      text.includes('fault') ||
      text.includes('override') ||
      text.includes('critical') ||
      text.includes('security')
    ) {
      return 'SAFETY_RELEVANT';
    }

    // 2. HIGH_UNCERTAINTY
    if (surpriseDelta >= 0.60 || obs.uncertainty.score >= 60 || (obs.audioData && obs.audioData.hesitationMarkersCount >= 3)) {
      return 'HIGH_UNCERTAINTY';
    }

    // 3. HIGH
    if (obs.modality === 'CAMERA' || obs.modality === 'MICROPHONE' || obs.attachmentsCount! > 0) {
      return 'HIGH';
    }

    // 4. LOW (Redundant frames / static input)
    if (obs.temporalAnchor?.is_static_scene || (text.length < 10 && obs.confidence > 90)) {
      return 'LOW';
    }

    return 'MODERATE';
  }

  private derivePreliminaryInterpretation(obs: ObservationEnvelopeVNext): string {
    if (obs.modality === 'CAMERA' && obs.visualData) {
      const objs = obs.visualData.detectedObjects.map(o => o.label).join(', ');
      return `Visual observation detecting: ${objs || 'workspace visual feed'}.`;
    }
    if (obs.modality === 'MICROPHONE' && obs.audioData) {
      if (obs.audioData.hesitationMarkersCount > 2) {
        return `Speech detected with ${obs.audioData.hesitationMarkersCount} hesitation pauses.`;
      }
      return `Audio speech input ingested at pace ratio ${obs.audioData.speechPaceRatio}.`;
    }
    return `User input observed: "${obs.rawContent.slice(0, 80)}".`;
  }

  /**
   * Performs continuous sequence integration over nearby observations in the window.
   */
  private performSequenceIntegration(
    window: TemporalPerceptionWindow,
    latestObs: TemporalObservation,
    obsEnvelope: ObservationEnvelopeVNext,
    worldModel?: WorldModel
  ) {
    const obsList = window.observationIds
      .map(id => this.observationsMap.get(id))
      .filter((o): o is TemporalObservation => Boolean(o));

    window.status = 'INTEGRATING';

    // A. Visual Sequence Integration (e.g. Frame 1, Frame 2, Frame 3, Frame 4)
    const visualObs = obsList.filter(o => o.modality === 'CAMERA');
    if (visualObs.length >= 2) {
      const contents = visualObs.map(o => o.rawObservationRef.toLowerCase());
      const hasReach = contents.some(c => c.includes('reach') || c.includes('raises hand') || c.includes('moving toward'));
      const hasObject = contents.some(c => c.includes('object') || c.includes('item') || c.includes('holding'));

      if (hasReach && hasObject) {
        window.integratedUnderstanding = 'Will appears to have reached for and picked up an object.';
        window.plausibleInterpretations = [
          { interpretation: 'Will reached for and picked up an object.', confidence: 92, supportingObservationIds: visualObs.map(o => o.id) },
          { interpretation: 'Will was adjusting workspace layout.', confidence: 35, supportingObservationIds: [visualObs[0].id] },
        ];
        window.status = 'STABLE';
      }
    }

    // B. Audio & Speech Integration (speech detected, speech incomplete, hesitation detected, sentence boundary)
    const audioObs = obsList.filter(o => o.modality === 'MICROPHONE' || o.modality === 'SPEECH');
    if (audioObs.length >= 1 && latestObs.modality === 'MICROPHONE') {
      const audioFeatures = obsEnvelope.audioData;
      if (audioFeatures && audioFeatures.hesitationMarkersCount > 0) {
        window.integratedUnderstanding = `Audio sequence: speech detected with ${audioFeatures.hesitationMarkersCount} hesitation markers. Awaiting complete sentence boundary.`;
        window.status = 'UNCERTAIN';
      }
    }

    // C. Conversational Sequence Clarification ("I don't want it" -> "Actually, I meant the red one")
    const textObs = obsList.filter(o => o.modality === 'TEXT');
    if (textObs.length >= 2) {
      const lastText = latestObs.rawObservationRef.toLowerCase();
      if (lastText.includes('actually') || lastText.includes('i meant') || lastText.includes('correction')) {
        const prevTextObs = textObs[textObs.length - 2];
        if (prevTextObs) {
          this.reviseInterpretation(
            prevTextObs.id,
            `User clarified previous statement ("${prevTextObs.rawObservationRef}"): "${latestObs.rawObservationRef}".`,
            `Later clarification statement ("${latestObs.rawObservationRef}") resolved prior ambiguity.`,
            [latestObs.id]
          );
          window.integratedUnderstanding = `Clarified sequence: User modified request to "${latestObs.rawObservationRef}".`;
          window.status = 'REVISED';
        }
      }
    }

    // D. User-Context Integration & Memory Check ("Remember without obeying")
    if (worldModel) {
      const graph = worldModel.getGraph();
      const userFacts = graph.nodes.filter(n => n.category === 'USER_FACT' || n.category === 'PREFERENCE');

      // Check if current sensory evidence contradicts a past memory
      const currentRaw = latestObs.rawObservationRef.toLowerCase();
      for (const fact of userFacts) {
        const factText = fact.label.toLowerCase();
        if (
          (factText.includes('dislikes') && currentRaw.includes('i love')) ||
          (factText.includes('python') && currentRaw.includes('strictly typescript'))
        ) {
          // Contradiction detected! Discrepancy logged, memory does NOT override current sensory evidence!
          latestObs.uncertainty = Math.min(100, latestObs.uncertainty + 20);
          window.status = 'UNCERTAIN';
          window.plausibleInterpretations.push({
            interpretation: `Current evidence ("${latestObs.rawObservationRef}") contradicts stored memory ("${fact.label}"). Investigating discrepancy.`,
            confidence: 65,
            supportingObservationIds: [latestObs.id],
          });
        }
      }
    }
  }

  /**
   * Retrospective interpretation revision check for sequence context.
   */
  private checkForRetrospectiveRevision(window: TemporalPerceptionWindow, latestObs: TemporalObservation) {
    const obsList = window.observationIds
      .map(id => this.observationsMap.get(id))
      .filter((o): o is TemporalObservation => Boolean(o));

    if (obsList.length >= 3) {
      const first = obsList[0];
      const middle = obsList[Math.floor(obsList.length / 2)];
      const last = obsList[obsList.length - 1];

      // Example postdiction: Person moving toward person (t1) -> carrying object (t2) -> hands object over (t3)
      const c1 = first.rawObservationRef.toLowerCase();
      const c2 = middle.rawObservationRef.toLowerCase();
      const c3 = last.rawObservationRef.toLowerCase();

      if (
        (c1.includes('moving') || c1.includes('approaching') || c1.includes('raises hand')) &&
        (c3.includes('hands object') || c3.includes('holds object') || c3.includes('picked up'))
      ) {
        if (!first.revisedInterpretation) {
          this.reviseInterpretation(
            first.id,
            `The earlier movement ("${first.rawObservationRef}") was part of reaching for and handing/picking up the object.`,
            `Subsequent observations at t3 confirmed the physical interaction sequence.`,
            [middle.id, last.id]
          );
        }
      }
    }
  }

  /**
   * Syncs epistemic state confidence & uncertainty with the WorldModel.
   */
  private syncEpistemicState(window: TemporalPerceptionWindow, worldModel: WorldModel) {
    const tensors = worldModel.getWorldModelTensors();
    const epistemic = tensors.epistemicState;

    if (window.status === 'STABLE' || window.status === 'REVISED') {
      epistemic.boundary.confidenceBounds = [Math.min(95, epistemic.boundary.confidenceBounds[0] + 5), 98];
      epistemic.boundary.epistemicEntropy = Math.max(5, epistemic.boundary.epistemicEntropy - 5);
    } else if (window.status === 'UNCERTAIN') {
      epistemic.boundary.epistemicEntropy = Math.min(95, epistemic.boundary.epistemicEntropy + 10);
    }
  }

  /**
   * Expiration sweep for stale temporal windows.
   */
  public expireStaleWindows(): number {
    const nowEpoch = Date.now();
    let expiredCount = 0;

    for (const window of this.windowsMap.values()) {
      if (window.status === 'OPEN' || window.status === 'INTEGRATING' || window.status === 'UNCERTAIN') {
        const elapsed = nowEpoch - new Date(window.lastUpdateTime).getTime();
        if (elapsed > window.expirationTimeoutMs) {
          window.status = 'EXPIRED';
          expiredCount++;
        }
      }
    }

    return expiredCount;
  }

  /**
   * Promotes a temporal window's understanding into durable committed memory state (Requirement 9 & 15).
   * Asserts distinct memory records for Observation, Initial Interpretation, Integrated Understanding, and Memory.
   */
  public commitToDurableMemory(windowId: string, worldModel: WorldModel): { committedNodeIds: string[] } {
    const window = this.windowsMap.get(windowId);
    if (!window) return { committedNodeIds: [] };

    window.status = 'COMMITTED';
    const committedNodeIds: string[] = [];

    const obsList = window.observationIds
      .map(id => this.observationsMap.get(id))
      .filter((o): o is TemporalObservation => Boolean(o));

    for (const obs of obsList) {
      obs.isProvisional = false;
      obs.interpretationStatus = 'COMMITTED';

      // Promote to WorldModel as durable nodes with distinct provenance
      worldModel.assimilateEntities([
        {
          id: `node_obs_${obs.id}`,
          name: `Observation: ${obs.rawObservationRef.slice(0, 40)}`,
          type: 'SYSTEM_EVENT',
          attributes: {
            rawContent: obs.rawObservationRef,
            provenance: obs.provenance,
            isImmutableObservation: true,
          },
          confidence: obs.confidence,
        },
        {
          id: `node_interp_${obs.id}`,
          name: `Initial Interp: ${obs.preliminaryInterpretation.slice(0, 40)}`,
          type: 'CONCEPT',
          attributes: {
            preliminaryInterpretation: obs.preliminaryInterpretation,
            revisedInterpretation: obs.revisedInterpretation || null,
            revisionReason: obs.revisionHistory[0]?.reasonForRevision || null,
          },
          confidence: obs.confidence,
        },
      ]);

      committedNodeIds.push(`node_obs_${obs.id}`, `node_interp_${obs.id}`);
    }

    if (window.integratedUnderstanding) {
      worldModel.assimilateEntities([
        {
          id: `node_understanding_${window.windowId}`,
          name: `Integrated Understanding: ${window.integratedUnderstanding.slice(0, 40)}`,
          type: 'CONCEPT',
          attributes: {
            integratedUnderstanding: window.integratedUnderstanding,
            windowId: window.windowId,
            status: 'COMMITTED',
          },
          confidence: 90,
        },
      ]);
      committedNodeIds.push(`node_understanding_${window.windowId}`);
    }

    return { committedNodeIds };
  }

  /**
   * Communicates naturally when uncertainty matters (Requirement 17).
   */
  public formatHumanInteractionString(window: TemporalPerceptionWindow): string {
    if (window.status === 'UNCERTAIN') {
      return "I'm not completely sure yet. Give me another moment to understand what I'm seeing.";
    }
    if (window.status === 'REVISED') {
      return "Ah — the later part of what I saw changes how I interpret the earlier part.";
    }
    if (window.status === 'INTEGRATING') {
      return "I think it looks like something is unfolding... let me observe the full sequence.";
    }
    return "Context sequence integrated smoothly.";
  }

  public getObservation(id: string): TemporalObservation | undefined {
    return this.observationsMap.get(id);
  }

  public getWindow(windowId: string): TemporalPerceptionWindow | undefined {
    return this.windowsMap.get(windowId);
  }

  public getActiveWindow(): TemporalPerceptionWindow | null {
    if (!this.activeWindowId) return null;
    return this.windowsMap.get(this.activeWindowId) || null;
  }

  public getAllObservations(): TemporalObservation[] {
    return Array.from(this.observationsMap.values());
  }

  public getAllWindows(): TemporalPerceptionWindow[] {
    return Array.from(this.windowsMap.values());
  }
}

export const temporalPerceptionLayer = new TemporalPerceptionLayer();
