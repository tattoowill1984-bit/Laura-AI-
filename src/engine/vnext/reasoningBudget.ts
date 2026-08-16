import { ReasoningTier, ObservationEnvelopeVNext } from './types';

export interface CognitiveResourceBudget {
  maxBackgroundCyclesPerMinute: number;
  maxRetrievalsPerTask: number;
  maxTokenBudgetPerTurn: number;
  maxRetryAttempts: number;
}

export class AdaptiveReasoningBudget {
  private static instance: AdaptiveReasoningBudget;

  private budgetConfig: CognitiveResourceBudget = {
    maxBackgroundCyclesPerMinute: 60,
    maxRetrievalsPerTask: 5,
    maxTokenBudgetPerTurn: 100000,
    maxRetryAttempts: 3,
  };

  private backgroundCyclesInCurrentWindow = 0;
  private windowStartMs = Date.now();
  private retrievalsByTask: Map<string, number> = new Map();

  public static getInstance(): AdaptiveReasoningBudget {
    if (!AdaptiveReasoningBudget.instance) {
      AdaptiveReasoningBudget.instance = new AdaptiveReasoningBudget();
    }
    return AdaptiveReasoningBudget.instance;
  }

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

  public checkCognitiveBudget(taskId?: string): { allowed: boolean; reason?: string; action: 'ALLOW' | 'DEFER' | 'THROTTLE' } {
    const now = Date.now();
    // Reset 1-minute window
    if (now - this.windowStartMs > 60000) {
      this.windowStartMs = now;
      this.backgroundCyclesInCurrentWindow = 0;
    }

    if (this.backgroundCyclesInCurrentWindow >= this.budgetConfig.maxBackgroundCyclesPerMinute) {
      return {
        allowed: false,
        reason: `BACKGROUND_CYCLE_RATE_LIMIT_EXCEEDED: ${this.backgroundCyclesInCurrentWindow}/${this.budgetConfig.maxBackgroundCyclesPerMinute} cycles per minute`,
        action: 'THROTTLE',
      };
    }

    if (taskId) {
      const retrievals = this.retrievalsByTask.get(taskId) || 0;
      if (retrievals >= this.budgetConfig.maxRetrievalsPerTask) {
        return {
          allowed: false,
          reason: `TASK_RETRIEVAL_BUDGET_EXCEEDED: ${retrievals}/${this.budgetConfig.maxRetrievalsPerTask} max retrievals for task '${taskId}'`,
          action: 'DEFER',
        };
      }
    }

    return { allowed: true, action: 'ALLOW' };
  }

  public recordCognitiveCycle(): void {
    this.backgroundCyclesInCurrentWindow++;
  }

  public recordRetrievalForTask(taskId: string): void {
    const current = this.retrievalsByTask.get(taskId) || 0;
    this.retrievalsByTask.set(taskId, current + 1);
  }

  public resetTaskRetrievalBudget(taskId: string): void {
    this.retrievalsByTask.delete(taskId);
  }
}

export const reasoningBudgetEngine = AdaptiveReasoningBudget.getInstance();

