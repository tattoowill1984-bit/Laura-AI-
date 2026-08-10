import { ReasoningTier, ObservationEnvelopeVNext } from './types';

export class AdaptiveReasoningBudget {
  public selectTier(obs: ObservationEnvelopeVNext, posture: string): ReasoningTier {
    const rawLen = obs.rawContent.length;
    const intent = obs.intentEstimate.primaryIntent;
    const uncertainty = obs.uncertainty.score;

    if (posture === 'STONEWALL' || posture === 'RAPTOR') {
      return 'MULTI_AGENT';
    }

    if (intent === 'DEBUG_AND_REPAIR' || uncertainty > 50) {
      return 'RESEARCH';
    }

    if (rawLen > 300 || intent === 'FEATURE_IMPLEMENTATION') {
      return 'DEEP';
    }

    if (rawLen > 80 || obs.extractedEntities.length > 1) {
      return 'MEDIUM';
    }

    return 'SIMPLE';
  }
}
