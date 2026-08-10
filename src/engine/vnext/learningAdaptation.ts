import { ObservationEnvelopeVNext, PerceptionModality } from './types';

export type LearnerStage = 'CONFUSION' | 'CURIOSITY' | 'EXPLORATION' | 'UNDERSTANDING' | 'CONFIDENCE';

export type ExplanationStyle = 'STEP_BY_STEP' | 'ANALOGY_FIRST' | 'FIRST_PRINCIPLES' | 'CONCISE_SUMMARY' | 'SOCRATIC_GUIDANCE';

export type ResponseStrategyType =
  | 'OFFER_HELP'
  | 'SIMPLIFY_EXPLANATION'
  | 'OFFER_ALTERNATIVE_SOLUTIONS'
  | 'DEEPEN_EXPLORATION'
  | 'VALIDATE_AND_CHALLENGE'
  | 'CLARIFY_AMBIGUITY'
  | 'SIMPLIFY_AND_GUIDE';

export interface UserContextState {
  frustrationProbability: number; // 0 - 100
  confusionProbability: number; // 0 - 100
  uncertaintyProbability: number; // 0 - 100
  engagementProbability: number; // 0 - 100
  contextConfidence: number; // 0.0 - 1.0
  attentionContext: {
    focusedEntityId?: string;
    activeModality: PerceptionModality;
    visualFocus?: string;
  };
  confidence: number; // 0.0 - 1.0
  evidence: string[];
  probabilisticDisclaimer: string;
}

export interface TemporalStateLayer {
  currentState: {
    timestamp: string;
    primaryObservationSummary: string;
    immediateUserContext: UserContextState;
  };
  echoState: {
    multiTurnStruggleDetected: boolean;
    consecutiveFailuresCount: number;
    unresolvedConfusionPattern: boolean;
    increasingDifficultyTrend: boolean;
    historicalSummary: string;
  };
  memoryCommitRule: string;
}

export interface AffectiveStateEstimate {
  frustration: number; // 0 - 100
  confusion: number; // 0 - 100
  engagement: number; // 0 - 100
  uncertainty: number; // 0 - 100
  overallClassification: 'STUCK_FRUSTRATED' | 'CONFUSED_BEGINNER' | 'ACTIVE_EXPLORER' | 'UNCERTAIN_LEARNER' | 'CONFIDENT_MASTER';
}

export interface SituationalResponseStrategy {
  primaryStrategy: ResponseStrategyType;
  actionables: string[];
  recommendedPromptPrefix: string;
}

export interface LearnerAdaptationState {
  currentStage: LearnerStage;
  confusionIndex: number; // 0 - 100
  confidenceIndex: number; // 0 - 100
  preferredStyle: ExplanationStyle;
  affectiveState: AffectiveStateEstimate;
  multimodalState: UserContextState;
  temporalState: TemporalStateLayer;
  strategy: SituationalResponseStrategy;
  identifiedGaps: string[];
  masteredConcepts: string[];
  pedagogicalDirective: string;
}

export class LearningAdaptationLayer {
  private turnCount = 0;
  private turnHistory: Array<{
    obs: ObservationEnvelopeVNext;
    frustrationProb: number;
    confusionProb: number;
    uncertaintyProb: number;
  }> = [];

  private state: LearnerAdaptationState = {
    currentStage: 'CURIOSITY',
    confusionIndex: 20,
    confidenceIndex: 50,
    preferredStyle: 'ANALOGY_FIRST',
    affectiveState: {
      frustration: 10,
      confusion: 20,
      engagement: 70,
      uncertainty: 30,
      overallClassification: 'ACTIVE_EXPLORER',
    },
    multimodalState: {
      frustrationProbability: 10,
      confusionProbability: 20,
      uncertaintyProbability: 30,
      engagementProbability: 70,
      contextConfidence: 0.85,
      attentionContext: { activeModality: 'TEXT' },
      confidence: 0.85,
      evidence: ['Baseline session initialization', 'Text input stream active'],
      probabilisticDisclaimer: 'Probabilistic state estimate based on observable signals. Internal emotional states are not claimed with absolute certainty.',
    },
    temporalState: {
      currentState: {
        timestamp: new Date().toISOString(),
        primaryObservationSummary: 'Baseline session initiation',
        immediateUserContext: {
          frustrationProbability: 10,
          confusionProbability: 20,
          uncertaintyProbability: 30,
          engagementProbability: 70,
          contextConfidence: 0.85,
          attentionContext: { activeModality: 'TEXT' },
          confidence: 0.85,
          evidence: ['Baseline session initialization'],
          probabilisticDisclaimer: 'Probabilistic state estimate based on observable signals.',
        },
      },
      echoState: {
        multiTurnStruggleDetected: false,
        consecutiveFailuresCount: 0,
        unresolvedConfusionPattern: false,
        increasingDifficultyTrend: false,
        historicalSummary: 'No multi-turn difficulty pattern detected yet.',
      },
      memoryCommitRule: 'Observations remain transient until explicitly validated by Anamnesis Sentinel authorization and Merkle commit rules.',
    },
    strategy: {
      primaryStrategy: 'DEEPEN_EXPLORATION',
      actionables: ['Encourage active inquiry', 'Offer real-world analogy'],
      recommendedPromptPrefix: 'Let us explore this together:',
    },
    identifiedGaps: [],
    masteredConcepts: [],
    pedagogicalDirective: 'Provide clear, encouraging, step-by-step guidance starting from simple analogies.',
  };

  public evaluateLearnerState(obs: ObservationEnvelopeVNext): LearnerAdaptationState {
    this.turnCount++;
    const text = obs.rawContent.toLowerCase().trim();
    const isVisualInput = obs.modality === 'CAMERA' || Boolean(obs.visualData?.hasVisualContent);
    const isAudioInput = obs.modality === 'MICROPHONE' || Boolean(obs.audioData?.hasAudioContent);

    // 1. Implicit & Explicit Signal Detection
    const implicitFailureSignals = [
      'error', 'failed', 'cannot find', 'not working', 'again', 'redo', 'wrong',
      'invalid', 'exception', 'unexpected', 'stuck', 'failed to', 'gives error'
    ];

    const explicitFrustrationKeywords = [
      'annoyed', 'frustrated', 'terrible', 'impossible', 'why is this so hard', 'give up', 'cant do this'
    ];

    const confusionKeywords = [
      "i don't get it", "i don't understand", "i'm confused", "what do you mean",
      "huh", "lost me", "too complex", "hard to follow", "explain simply", "what is this"
    ];

    const ambiguityKeywords = [
      'whatever', 'something like that', 'or something', 'etc', 'stuff', 'idk', 'dunno', 'guessing'
    ];

    const uncertaintyKeywords = [
      'maybe', 'i think', 'not sure', 'is it', 'perhaps', 'could be', 'guess'
    ];

    const understandingKeywords = [
      'i get it', 'makes sense', 'got it', 'aha', 'oh okay', 'i see now',
      'that makes sense', 'clear now', 'perfect', 'understands'
    ];

    const explorationKeywords = [
      'why does', 'how come', 'what happens if', 'can you show me', 'how do i',
      'tell me more', 'deep dive', 'show me how'
    ];

    let implicitFailureHits = 0;
    let explicitFrustrationHits = 0;
    let confusionHits = 0;
    let ambiguityHits = 0;
    let uncertaintyHits = 0;
    let understandingHits = 0;
    let explorationHits = 0;

    for (const kw of implicitFailureSignals) if (text.includes(kw)) implicitFailureHits++;
    for (const kw of explicitFrustrationKeywords) if (text.includes(kw)) explicitFrustrationHits++;
    for (const kw of confusionKeywords) if (text.includes(kw)) confusionHits++;
    for (const kw of ambiguityKeywords) if (text.includes(kw)) ambiguityHits++;
    for (const kw of uncertaintyKeywords) if (text.includes(kw)) uncertaintyHits++;
    for (const kw of understandingKeywords) if (text.includes(kw)) understandingHits++;
    for (const kw of explorationKeywords) if (text.includes(kw)) explorationHits++;

    // Audio Feature Signal Contributions (Ears)
    const audioHesitationHits = obs.audioData ? obs.audioData.hesitationMarkersCount + obs.audioData.pausesCount : 0;
    const audioSlowPace = obs.audioData && obs.audioData.speechPaceRatio < 0.75;

    // Visual Material Contributions (Eyes)
    const visualMaterialPresent = obs.visualData && obs.visualData.presentedMaterials.length > 0;

    // 2. Multimodal Probabilistic Calculations
    let frustrationProb = Math.min(100, Math.max(0,
      explicitFrustrationHits * 40 +
      implicitFailureHits * 25 +
      (this.state.temporalState.echoState.consecutiveFailuresCount >= 2 ? 30 : 0)
    ));

    let confusionProb = Math.min(100, Math.max(0,
      confusionHits * 30 +
      (audioHesitationHits > 2 || audioSlowPace ? 25 : 0) +
      (isVisualInput && text.length < 8 ? 20 : 0)
    ));

    let uncertaintyProb = Math.min(100, Math.max(0,
      uncertaintyHits * 25 +
      ambiguityHits * 20 +
      audioHesitationHits * 15 +
      (text.endsWith('?') ? 15 : 0)
    ));

    let engagementProb = Math.min(100, Math.max(30,
      text.length * 2 +
      explorationHits * 25 +
      (isVisualInput || isAudioInput ? 20 : 0) +
      (visualMaterialPresent ? 15 : 0)
    ));

    if (understandingHits > 0) {
      frustrationProb = Math.max(0, frustrationProb - 40);
      confusionProb = Math.max(0, confusionProb - 40);
      uncertaintyProb = Math.max(0, uncertaintyProb - 35);
    }

    // Record turn history for Temporal Echo State calculations
    this.turnHistory.unshift({
      obs,
      frustrationProb,
      confusionProb,
      uncertaintyProb,
    });
    if (this.turnHistory.length > 10) this.turnHistory.pop();

    // 3. Temporal Echo State Evaluation (Current vs Echo Pattern)
    let consecutiveFailuresCount = 0;
    for (const item of this.turnHistory) {
      if (item.frustrationProb >= 35 || item.confusionProb >= 35) {
        consecutiveFailuresCount++;
      } else {
        break;
      }
    }

    const multiTurnStruggleDetected = consecutiveFailuresCount >= 2;
    const unresolvedConfusionPattern = this.turnHistory.length >= 2 &&
      this.turnHistory[0].confusionProb >= 30 &&
      this.turnHistory[1].confusionProb >= 30;

    const increasingDifficultyTrend = this.turnHistory.length >= 3 &&
      (this.turnHistory[0].frustrationProb + this.turnHistory[0].confusionProb) >
      (this.turnHistory[2].frustrationProb + this.turnHistory[2].confusionProb);

    let historicalSummary = 'User is maintaining steady progress.';
    if (multiTurnStruggleDetected) {
      historicalSummary = `User has encountered persistent difficulty across ${consecutiveFailuresCount} consecutive turns.`;
    } else if (unresolvedConfusionPattern) {
      historicalSummary = 'Previous explanations did not fully resolve user confusion. Simplify angle.';
    } else if (increasingDifficultyTrend) {
      historicalSummary = 'Interaction pattern indicates increasing task difficulty over recent turns.';
    }

    // Compute Probabilistic Confidence Score (0.0 - 1.0)
    const confidenceScore = Number(Math.min(0.95, Math.max(0.60, 0.70 + (this.turnHistory.length * 0.03))).toFixed(2));

    const evidence: string[] = [];
    if (explicitFrustrationHits > 0) evidence.push('Explicit frustration phrasing observed');
    if (implicitFailureHits > 0) evidence.push('Implicit task failure / error signals observed');
    if (confusionHits > 0) evidence.push('Confusion or clarification request observed');
    if (ambiguityHits > 0) evidence.push('Ambiguous or brief non-committal user input');
    if (audioHesitationHits > 0) evidence.push('Acoustic speech hesitation / pause patterns');
    if (isVisualInput) evidence.push('Continuous visual stream / camera frame ingested');
    if (multiTurnStruggleDetected) evidence.push(`Echo Temporal Pattern: ${consecutiveFailuresCount} consecutive turn struggles`);
    if (evidence.length === 0) evidence.push('Normal interaction flow without anomalous stress signals');

    const multimodalState: UserContextState = {
      frustrationProbability: frustrationProb,
      confusionProbability: confusionProb,
      uncertaintyProbability: uncertaintyProb,
      engagementProbability: engagementProb,
      contextConfidence: confidenceScore,
      attentionContext: {
        activeModality: obs.modality,
        visualFocus: obs.visualData?.presentedMaterials[0]?.summary,
        focusedEntityId: obs.extractedEntities[0]?.id,
      },
      confidence: confidenceScore,
      evidence,
      probabilisticDisclaimer: 'Probabilistic state estimate based on observable signals. Internal emotional states are not claimed with absolute certainty.',
    };

    const temporalState: TemporalStateLayer = {
      currentState: {
        timestamp: obs.timestamp,
        primaryObservationSummary: `Turn ${this.turnCount} via ${obs.modality}: "${obs.rawContent.slice(0, 60)}..."`,
        immediateUserContext: multimodalState,
      },
      echoState: {
        multiTurnStruggleDetected,
        consecutiveFailuresCount,
        unresolvedConfusionPattern,
        increasingDifficultyTrend,
        historicalSummary,
      },
      memoryCommitRule: 'Observations remain transient until explicitly validated by Anamnesis Sentinel authorization and Merkle commit rules.',
    };

    // 4. Overall State Classification
    let overallClassification: AffectiveStateEstimate['overallClassification'] = 'ACTIVE_EXPLORER';
    if (frustrationProb >= 40 || multiTurnStruggleDetected) {
      overallClassification = 'STUCK_FRUSTRATED';
    } else if (confusionProb >= 40 || unresolvedConfusionPattern) {
      overallClassification = 'CONFUSED_BEGINNER';
    } else if (uncertaintyProb >= 45 || ambiguityHits > 0) {
      overallClassification = 'UNCERTAIN_LEARNER';
    } else if (understandingHits > 0 && confusionProb < 20) {
      overallClassification = 'CONFIDENT_MASTER';
    }

    this.state.affectiveState = {
      frustration: frustrationProb,
      confusion: confusionProb,
      engagement: engagementProb,
      uncertainty: uncertaintyProb,
      overallClassification,
    };
    this.state.multimodalState = multimodalState;
    this.state.temporalState = temporalState;

    // 5. Connect Inferred State to Response Strategy
    let primaryStrategy: ResponseStrategyType = 'DEEPEN_EXPLORATION';
    let actionables: string[] = [];
    let recommendedPrefix = '';

    if (frustrationProb >= 40 || multiTurnStruggleDetected) {
      primaryStrategy = 'OFFER_HELP';
      actionables = [
        'Acknowledge difficulty neutrally without repeating failed approaches ("I notice this approach has been frustrating. Let us try a different angle.")',
        'De-escalate complexity into tiny sub-steps',
        'Avoid emotional dependency or claiming mind-reading certainty',
      ];
      recommendedPrefix = "I notice this approach has been frustrating. Let's stop repeating the same fix and try a different angle:";
      this.state.currentStage = 'CONFUSION';
      this.state.preferredStyle = 'ANALOGY_FIRST';
      this.state.pedagogicalDirective = 'SITUATIONAL STRATEGY [OFFER_HELP]: High frustration or multi-turn struggle inferred. Acknowledge difficulty, reduce complexity, pivot away from failed approaches, and present a guided sub-step.';
    } else if (confusionProb >= 40 || unresolvedConfusionPattern) {
      primaryStrategy = 'SIMPLIFY_EXPLANATION';
      actionables = [
        'Strip away technical jargon',
        'Use an everyday physical or visual analogy',
        'Break explanation into 2 simple steps and ask a single checking question',
      ];
      recommendedPrefix = 'Let us simplify this completely:';
      this.state.currentStage = 'CONFUSION';
      this.state.preferredStyle = 'ANALOGY_FIRST';
      this.state.pedagogicalDirective = 'SITUATIONAL STRATEGY [SIMPLIFY_EXPLANATION]: Learner confusion detected. Re-explain using a simple analogy, 2 clear steps, and a checking question.';
    } else if (ambiguityHits > 0 || (uncertaintyHits > 0 && text.length < 50)) {
      primaryStrategy = 'CLARIFY_AMBIGUITY';
      actionables = [
        'Ask a targeted clarifying question',
        'Present 2 plausible interpretations to guide the user',
      ];
      recommendedPrefix = 'To make sure I understand your exact goal:';
      this.state.currentStage = 'EXPLORATION';
      this.state.preferredStyle = 'SOCRATIC_GUIDANCE';
      this.state.pedagogicalDirective = 'SITUATIONAL STRATEGY [CLARIFY_AMBIGUITY]: User input is ambiguous or brief. Ask a targeted clarifying question with guided options.';
    } else if (isVisualInput || visualMaterialPresent) {
      primaryStrategy = 'OFFER_ALTERNATIVE_SOLUTIONS';
      actionables = [
        'Incorporate visual context from camera or attached materials',
        'Provide an alternative diagrammatic or concrete breakdown',
      ];
      recommendedPrefix = 'Looking at your visual materials, here is another angle:';
      this.state.currentStage = 'EXPLORATION';
      this.state.preferredStyle = 'STEP_BY_STEP';
      this.state.pedagogicalDirective = 'SITUATIONAL STRATEGY [OFFER_ALTERNATIVE_SOLUTIONS]: Visual input available. Synthesize visual evidence and offer an alternative solution path.';
    } else if (understandingHits > 0) {
      primaryStrategy = 'VALIDATE_AND_CHALLENGE';
      actionables = [
        'Validate the learner correct intuition',
        'Provide a concise 1-sentence summary',
        'Offer a lightweight optional extension question',
      ];
      recommendedPrefix = 'Spot on! You got it:';
      this.state.currentStage = 'CONFIDENCE';
      this.state.preferredStyle = 'CONCISE_SUMMARY';
      this.state.pedagogicalDirective = 'SITUATIONAL STRATEGY [VALIDATE_AND_CHALLENGE]: Celebrate milestone understanding concisely and invite independent mastery.';
    } else {
      primaryStrategy = 'DEEPEN_EXPLORATION';
      actionables = [
        'Explain core mechanism from first principles',
        'Connect concept to learner interest',
      ];
      recommendedPrefix = 'Great question:';
      this.state.currentStage = 'EXPLORATION';
      this.state.preferredStyle = 'FIRST_PRINCIPLES';
      this.state.pedagogicalDirective = 'SITUATIONAL STRATEGY [DEEPEN_EXPLORATION]: Guide active curiosity with clear first-principles explanations and interactive examples.';
    }

    this.state.strategy = {
      primaryStrategy,
      actionables,
      recommendedPromptPrefix: recommendedPrefix,
    };

    this.state.confusionIndex = confusionProb;
    this.state.confidenceIndex = Math.max(0, 100 - confusionProb - frustrationProb);

    return this.state;
  }

  public getState(): LearnerAdaptationState {
    return this.state;
  }
}


