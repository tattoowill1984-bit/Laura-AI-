import { ConversationMetrics, ObservationEnvelopeVNext } from './types';

export class ConversationManager {
  private metrics: ConversationMetrics = {
    emotionalTemperature: 25,
    verbosityPreference: 'BALANCED',
    unansweredQuestions: [],
    followUpOpportunities: [],
    interruptionDetected: false,
    contextSwitchFrequency: 0.1,
  };

  public updateFromObservation(obs: ObservationEnvelopeVNext): ConversationMetrics {
    const cue = obs.emotionalCues;

    if (cue.sentiment === 'FRUSTRATED' || cue.sentiment === 'URGENT') {
      this.metrics.emotionalTemperature = Math.min(100, this.metrics.emotionalTemperature + 20);
      this.metrics.verbosityPreference = 'CONCISE';
    } else if (cue.sentiment === 'CURIOUS') {
      this.metrics.verbosityPreference = 'BALANCED';
    } else if (cue.sentiment === 'POSITIVE') {
      this.metrics.emotionalTemperature = Math.max(10, this.metrics.emotionalTemperature - 10);
    }

    if (obs.rawContent.endsWith('?')) {
      if (!this.metrics.unansweredQuestions.includes(obs.rawContent)) {
        this.metrics.unansweredQuestions.push(obs.rawContent);
        if (this.metrics.unansweredQuestions.length > 5) this.metrics.unansweredQuestions.shift();
      }
    }

    return this.metrics;
  }

  public markQuestionAnswered(questionText: string) {
    this.metrics.unansweredQuestions = this.metrics.unansweredQuestions.filter((q) => q !== questionText);
  }

  public getMetrics(): ConversationMetrics {
    return this.metrics;
  }
}
