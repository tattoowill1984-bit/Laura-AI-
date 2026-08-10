import { ObservationEnvelopeVNext, ObservationEntity, PerceptionModality, VisualObservationData, AudioObservationData, TemporalAnchorHeader } from './types';

export class MultimodalPerceptionBus {
  private history: ObservationEnvelopeVNext[] = [];
  private lastObservationEpochMs: number = Date.now();

  public ingestingInput(
    rawInput: string,
    modality: PerceptionModality = 'TEXT',
    source: string = 'USER_CHAT',
    attachmentsCount: number = 0,
    visualInputData?: Partial<VisualObservationData>,
    audioInputData?: Partial<AudioObservationData>,
    temporalInputData?: Partial<TemporalAnchorHeader>
  ): ObservationEnvelopeVNext {
    const now = new Date();
    const nowEpoch = now.getTime();
    const id = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Calculate or accept Temporal Anchor Header
    const delta_t_ms = temporalInputData?.delta_t_ms ?? (this.lastObservationEpochMs ? Math.max(0, nowEpoch - this.lastObservationEpochMs) : 1000);
    const delta_since_last_frame_sec = temporalInputData?.delta_since_last_frame_sec ?? parseFloat((delta_t_ms / 1000).toFixed(1));
    this.lastObservationEpochMs = nowEpoch;

    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const local_time = temporalInputData?.local_time || `${hours}:${minutes}`;

    let diurnal_context = temporalInputData?.diurnal_context;
    if (!diurnal_context) {
      if (hours >= 5 && hours < 7) diurnal_context = 'Dawn';
      else if (hours >= 7 && hours < 11) diurnal_context = 'Morning';
      else if (hours >= 11 && hours < 13) diurnal_context = 'Midday';
      else if (hours >= 13 && hours < 17) diurnal_context = 'Afternoon';
      else if (hours >= 17 && hours < 19) diurnal_context = 'Dusk';
      else if (hours >= 19 && hours < 22) diurnal_context = 'Evening';
      else diurnal_context = 'Midnight';
    }

    const temporal_gap_detected = temporalInputData?.temporal_gap_detected ?? (delta_since_last_frame_sec >= 1800); // >= 30 minutes / 4 hours gap
    const gap_duration_hours = temporalInputData?.gap_duration_hours ?? parseFloat((delta_since_last_frame_sec / 3600).toFixed(2));

    const entityAttribution = temporalInputData?.entityAttribution || visualInputData?.entityAttribution || {
      cameraOperator: {
        name: 'Will',
        role: 'Primary Session Owner / Voice Operator',
        id: 'user_will_primary',
      },
      frameSubject: {
        primarySubject: visualInputData?.entityAttribution?.frameSubject?.primarySubject || (modality === 'CAMERA' ? 'Will' : 'Environment'),
        secondarySubjects: visualInputData?.entityAttribution?.frameSubject?.secondarySubjects || [],
        confidence: visualInputData?.entityAttribution?.frameSubject?.confidence || 92,
        disambiguationNotes: visualInputData?.entityAttribution?.frameSubject?.disambiguationNotes || 'Attributed to primary session owner & camera operator (Will)',
      },
    };

    const temporalAnchor: TemporalAnchorHeader = {
      timestamp: temporalInputData?.timestamp || now.toISOString(),
      delta_t_ms,
      delta_since_last_frame_sec,
      local_time,
      diurnal_context,
      is_static_scene: temporalInputData?.is_static_scene ?? false,
      motion_energy_score: temporalInputData?.motion_energy_score ?? 0,
      temporal_gap_detected,
      gap_duration_hours,
      entityAttribution,
    };

    // Extract basic entities from rawInput
    const extractedEntities = this.extractEntities(rawInput);
    const emotionalCues = this.analyzeEmotionalCues(rawInput);
    const intentEstimate = this.estimateIntent(rawInput, attachmentsCount);
    const uncertainty = this.evaluateUncertainty(rawInput);

    // Process Visual Signals (Eyes)
    const visualData: VisualObservationData = {
      hasVisualContent: modality === 'CAMERA' || Boolean(visualInputData?.hasVisualContent) || rawInput.includes('[ATTACHMENTS INGESTED'),
      detectedObjects: visualInputData?.detectedObjects || (modality === 'CAMERA' ? [{ label: 'User Camera Feed', confidence: 90 }] : []),
      presentedMaterials: visualInputData?.presentedMaterials || (attachmentsCount > 0 ? [{ type: 'DOCUMENT', summary: `User presented ${attachmentsCount} media attachment(s)` }] : []),
      environmentalContext: visualInputData?.environmentalContext || (modality === 'CAMERA' ? `Camera workspace (${diurnal_context} lighting, ${local_time})` : 'Default digital workplace'),
      entityAttribution,
    };

    // Process Audio Signals (Ears)
    const lower = rawInput.toLowerCase();
    const pauseMatches = (rawInput.match(/\.\.\.|\.\s\.\s\./g) || []).length;
    const hesitationMatches = (lower.match(/\b(um|uh|er|hmm|like|maybe|i think|sort of)\b/g) || []).length;
    const repetitionMatches = (lower.match(/\b(\w+)\s+\1\b/g) || []).length;

    const audioData: AudioObservationData = {
      hasAudioContent: modality === 'MICROPHONE' || Boolean(audioInputData?.hasAudioContent),
      speechPaceRatio: audioInputData?.speechPaceRatio ?? (hesitationMatches > 2 ? 0.65 : 1.0),
      pausesCount: audioInputData?.pausesCount ?? pauseMatches,
      hesitationMarkersCount: audioInputData?.hesitationMarkersCount ?? hesitationMatches,
      repetitionCount: audioInputData?.repetitionCount ?? repetitionMatches,
      vocalEnergyLevel: audioInputData?.vocalEnergyLevel ?? (rawInput.includes('!') ? 'ELEVATED' : 'NORMAL'),
      uncertaintyIndicatorsCount: audioInputData?.uncertaintyIndicatorsCount ?? (hesitationMatches + (rawInput.includes('?') ? 1 : 0)),
    };

    const envelope: ObservationEnvelopeVNext = {
      id,
      source,
      timestamp: temporalAnchor.timestamp,
      confidence: Math.min(95, Math.max(60, 100 - uncertainty.score / 2)),
      modality,
      extractedEntities,
      emotionalCues,
      intentEstimate,
      uncertainty,
      provenance: `PerceptionBus::${modality}::${source}`,
      rawContent: rawInput,
      attachmentsCount,
      visualData,
      audioData,
      temporalAnchor,
      entityAttribution,
    };

    this.history.unshift(envelope);
    if (this.history.length > 50) this.history.pop();

    return envelope;
  }

  private extractEntities(text: string): ObservationEntity[] {
    const entities: ObservationEntity[] = [];
    const lower = text.toLowerCase();

    // Detect common key entities
    if (lower.includes('cat') || lower.includes('pet') || lower.includes('dog') || lower.includes('stinky')) {
      entities.push({
        id: 'ent_pet',
        name: lower.includes('stinky') ? 'Stinky' : 'Pet',
        type: 'PET',
        attributes: { species: lower.includes('cat') ? 'Cat' : lower.includes('dog') ? 'Dog' : 'Pet' },
        confidence: 90,
      });
    }

    if (lower.includes('project') || lower.includes('app') || lower.includes('code') || lower.includes('gabby')) {
      entities.push({
        id: 'ent_gabby',
        name: 'Gabby AI Project',
        type: 'PROJECT',
        attributes: { active: true },
        confidence: 95,
      });
    }

    if (lower.includes('fix') || lower.includes('error') || lower.includes('bug') || lower.includes('build')) {
      entities.push({
        id: 'ent_task_fix',
        name: 'System Repair / Bugfix',
        type: 'TASK',
        attributes: { urgency: 'HIGH' },
        confidence: 85,
      });
    }

    return entities;
  }

  private analyzeEmotionalCues(text: string) {
    const lower = text.toLowerCase();
    let urgency = 3;
    let frustrationLevel = 2;
    let sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'CURIOUS' | 'URGENT' = 'NEUTRAL';

    if (lower.includes('urgent') || lower.includes('broken') || lower.includes('asap') || text.includes('!!')) {
      urgency = 8;
      sentiment = 'URGENT';
    }

    if (lower.includes('frustrated') || lower.includes('error') || lower.includes('fail') || lower.includes('wrong')) {
      frustrationLevel = 7;
      sentiment = 'FRUSTRATED';
    }

    if (lower.includes('how') || lower.includes('why') || lower.includes('what if') || lower.includes('explain')) {
      sentiment = 'CURIOUS';
    }

    if (lower.includes('great') || lower.includes('thanks') || lower.includes('nice') || lower.includes('haha')) {
      sentiment = 'POSITIVE';
      frustrationLevel = 1;
    }

    return {
      tone: sentiment.toLowerCase(),
      urgency,
      frustrationLevel,
      sentiment,
    };
  }

  private estimateIntent(text: string, attachmentsCount: number) {
    const lower = text.toLowerCase();
    let primaryIntent = 'GENERAL_QUERY';
    const secondaryIntents: string[] = [];

    if (lower.includes('fix') || lower.includes('error') || lower.includes('repair')) {
      primaryIntent = 'DEBUG_AND_REPAIR';
    } else if (lower.includes('plan') || lower.includes('build') || lower.includes('implement')) {
      primaryIntent = 'FEATURE_IMPLEMENTATION';
    } else if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does')) {
      primaryIntent = 'EXPLANATION_REQUEST';
    } else if (lower.includes('test') || lower.includes('verify')) {
      primaryIntent = 'VERIFICATION_AND_TESTING';
    }

    if (attachmentsCount > 0) {
      secondaryIntents.push('ATTACHMENT_INSPECTION');
    }

    return {
      primaryIntent,
      secondaryIntents,
      actionable: primaryIntent !== 'GENERAL_QUERY' || lower.length > 30,
    };
  }

  private evaluateUncertainty(text: string) {
    const missingContext: string[] = [];
    let score = 20;

    if (text.length < 15) {
      score += 40;
      missingContext.push('Brief or ambiguous input query');
    }

    if (text.toLowerCase().includes('it') || text.toLowerCase().includes('this')) {
      missingContext.push('Anaphoric pronoun references requiring disambiguation');
      score += 15;
    }

    return {
      score: Math.min(100, score),
      missingContext,
    };
  }

  public getRecentObservations(limit: number = 10): ObservationEnvelopeVNext[] {
    return this.history.slice(0, limit);
  }
}
