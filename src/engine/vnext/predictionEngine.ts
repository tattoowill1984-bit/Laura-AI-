import { PredictedAction, ObservationEnvelopeVNext, GoalItem, PredictionErrorRecord } from './types';
import { WorldModel } from './worldModel';

export class PredictionEngine {
  /**
   * Generates proactive next-step predictions
   */
  public predictNextNeeds(
    recentObs: ObservationEnvelopeVNext | null,
    activeGoals: GoalItem[],
    systemPosture: string
  ): PredictedAction[] {
    const predictions: PredictedAction[] = [];

    if (recentObs) {
      const lower = recentObs.rawContent.toLowerCase();

      // Case 1: User is debugging or encountered an error
      if (lower.includes('error') || lower.includes('fail') || lower.includes('fix') || lower.includes('quota')) {
        predictions.push({
          id: 'pred_1',
          title: 'Inspect System Logs & Diagnostic Trace',
          reasoning: 'Active failure or quota issue detected; user will likely want root-cause logs and fallback options.',
          likelihoodScore: 92,
          suggestedPrompt: 'Show me the detailed execution trace and available API fallbacks.',
          category: 'LOG_INSPECTION',
        });

        predictions.push({
          id: 'pred_2',
          title: 'Run Automated Health & Red-Team Diagnostics',
          reasoning: 'System error state warrants verifying boundary health and memory integrity.',
          likelihoodScore: 85,
          suggestedPrompt: 'Run the Red-Team Suite to verify memory and boundary health.',
          category: 'TEST_RUN',
        });
      }

      // Case 2: User is discussing architecture / vNext / goals / world model
      if (
        lower.includes('architecture') ||
        lower.includes('goal') ||
        lower.includes('vnext') ||
        lower.includes('plan') ||
        lower.includes('world model') ||
        lower.includes('tensor')
      ) {
        predictions.push({
          id: 'pred_3',
          title: 'Show Live Knowledge Graph & World Model Tensors',
          reasoning: 'User is reviewing structural design and world model tensors; visualizing entity/causal tensors will aid clarity.',
          likelihoodScore: 90,
          suggestedPrompt: 'Open the vNext Dashboard to inspect World Model Tensors and prediction error dynamics.',
          category: 'NEXT_STEP',
        });
      }

      // Case 3: User completed or implemented something
      if (lower.includes('implement') || lower.includes('done') || lower.includes('created') || lower.includes('code')) {
        predictions.push({
          id: 'pred_4',
          title: 'Compile & Audit Subsystems',
          reasoning: 'After major code modifications, automated linter and compilation checks confirm system stability.',
          likelihoodScore: 88,
          suggestedPrompt: 'Run linter and check subsystem audit states.',
          category: 'TEST_RUN',
        });
      }
    }

    // Default proactive predictions based on active goals
    if (predictions.length === 0) {
      const criticalGoal = activeGoals.find((g) => g.priority === 'CRITICAL');
      if (criticalGoal) {
        predictions.push({
          id: 'pred_def_1',
          title: `Advance Goal: ${criticalGoal.title}`,
          reasoning: `Critical goal is active (${criticalGoal.progressPercent}% complete); continuing step execution is predicted next.`,
          likelihoodScore: 80,
          suggestedPrompt: `What is the next execution step for ${criticalGoal.title}?`,
          category: 'NEXT_STEP',
        });
      } else {
        predictions.push({
          id: 'pred_def_2',
          title: 'Deepen World Model Entity Mapping',
          reasoning: 'Continuous cognitive observation active; expanding entity context based on ongoing user interactions.',
          likelihoodScore: 75,
          suggestedPrompt: 'What key entity relationships are currently tracked in Gabby World Model?',
          category: 'NEXT_STEP',
        });
      }
    }

    return predictions;
  }

  /**
   * Prediction Error Engine:
   * Measures prediction error by comparing previous turn's predicted actions against current turn's actual observation content & intent.
   *
   * Reality -> Observe -> Internal Model -> Predict -> Reality Happens -> Measure Error -> Revise Model
   */
  public measurePredictionError(
    previousPredictions: PredictedAction[],
    currentObs: ObservationEnvelopeVNext
  ): PredictionErrorRecord {
    const now = new Date().toISOString();
    const actualText = currentObs.rawContent;

    // Check for explicit belief-action-prediction-reality intervention sequences
    if (actualText.toLowerCase().includes('prediction:') && actualText.toLowerCase().includes('reality:')) {
      // Parse structured intervention metrics
      const predMatch = actualText.match(/prediction:\s*([^\n]+)/i);
      const realityMatch = actualText.match(/reality:\s*([^\n]+)/i);
      const beliefMatch = actualText.match(/current belief:\s*([^\n]+)/i);
      const actionMatch = actualText.match(/action:\s*([^\n]+)/i);

      const predictedNeed = actionMatch ? `Intervention: ${actionMatch[1].trim()}` : 'Active Clarifying Question';
      const belief = beliefMatch ? beliefMatch[1].trim() : 'Document incomplete / context gap';

      // Parse confidence numbers if present (e.g., 20% vs 18%)
      const predNum = predMatch ? parseFloat(predMatch[1].replace(/[^0-9.]/g, '')) : 20;
      const realNum = realityMatch ? parseFloat(realityMatch[1].replace(/[^0-9.]/g, '')) : 18;

      const errorDelta = Math.abs(predNum - realNum) / Math.max(1, Math.max(predNum, realNum));

      return {
        id: `err_interv_${Date.now()}`,
        timestamp: now,
        predictedNeed: `${predictedNeed} (Predicted Gain: +${predNum}%)`,
        actualUserAction: `Belief: "${belief}" | Reality: +${realNum}% Gain (${((1 - errorDelta) * 100).toFixed(0)}% intervention accuracy)`,
        predictionErrorDelta: parseFloat(errorDelta.toFixed(3)),
        errorSignalType: errorDelta < 0.2 ? 'MATCH' : 'MINOR_DEVIATION',
        revisedModelWeightsSummary: `Intervention calibrated: Predicted +${predNum}% vs Actual +${realNum}%. Calibration score updated (${((1 - errorDelta) * 100).toFixed(0)}% accuracy).`,
      };
    }

    if (!previousPredictions || previousPredictions.length === 0) {
      return {
        id: `err_${Date.now()}`,
        timestamp: now,
        predictedNeed: 'Initial Interaction / Baseline State',
        actualUserAction: actualText.slice(0, 80),
        predictionErrorDelta: 0.15,
        errorSignalType: 'MATCH',
        revisedModelWeightsSummary: 'Baseline initialization. Model state steady.',
      };
    }

    const topPrediction = previousPredictions[0];
    const predictedPromptKeywords = (topPrediction.suggestedPrompt + ' ' + topPrediction.title).toLowerCase().split(/\s+/);
    const actualKeywords = actualText.toLowerCase().split(/\s+/);

    // Calculate keyword match overlap between predicted need and actual user prompt
    let matches = 0;
    predictedPromptKeywords.forEach((kw) => {
      if (kw.length > 3 && actualKeywords.includes(kw)) {
        matches++;
      }
    });

    const matchRatio = matches / Math.max(1, predictedPromptKeywords.filter((k) => k.length > 3).length);

    let errorDelta = 1.0 - matchRatio;
    let signalType: PredictionErrorRecord['errorSignalType'] = 'MINOR_DEVIATION';

    if (matchRatio > 0.4) {
      errorDelta = Math.max(0.05, 0.3 - matchRatio);
      signalType = 'MATCH';
    } else if (matchRatio < 0.1) {
      errorDelta = 0.85;
      signalType = 'MISPREDICTION';
    }

    // Check for radical topic switch or prompt reversal
    if (actualText.toLowerCase().includes('no') || actualText.toLowerCase().includes('wrong') || actualText.toLowerCase().includes('instead')) {
      errorDelta = 0.95;
      signalType = 'PARADIGM_SHIFT';
    }

    let reasonForRevision = '';
    if (signalType === 'MATCH') {
      reasonForRevision = `High prediction alignment (${(matchRatio * 100).toFixed(0)}% match). Validated prior hypotheses and reinforced causal topology.`;
    } else if (signalType === 'MINOR_DEVIATION') {
      reasonForRevision = `Minor variance detected (Delta: ${errorDelta.toFixed(2)}). Adjusted prior likelihood distribution over expected user actions.`;
    } else if (signalType === 'MISPREDICTION') {
      reasonForRevision = `High prediction error threshold exceeded (Delta: ${errorDelta.toFixed(2)}). User action diverged significantly from predicted need ("${topPrediction.title}").`;
    } else {
      reasonForRevision = `Paradigm shift trigger (Delta: ${errorDelta.toFixed(2)}). User redirected topic, introduced high-friction requirement, or invalidated prior model assumptions.`;
    }

    const errorRecord: PredictionErrorRecord = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: now,
      predictedNeed: topPrediction.title,
      actualUserAction: actualText.length > 100 ? actualText.slice(0, 97) + '...' : actualText,
      predictionErrorDelta: parseFloat(errorDelta.toFixed(3)),
      errorSignalType: signalType,
      revisedModelWeightsSummary:
        signalType === 'MATCH'
          ? `High prediction match (${(matchRatio * 100).toFixed(0)}%). Strengthened causal edge weights.`
          : signalType === 'MINOR_DEVIATION'
          ? `Minor prediction deviation (${errorDelta.toFixed(2)} error). Adjusted likelihood priors.`
          : `Prediction Error Spike (${errorDelta.toFixed(2)} error). Initiated active learning inquiry & revised world model priors.`,
      reasonForRevision,
    };

    return errorRecord;
  }

  /**
   * Applies Model Revision back to the World Model based on prediction error signal
   */
  public applyModelRevisionFromError(errorRecord: PredictionErrorRecord, worldModel: WorldModel) {
    // Record error signal into World Model's error history
    worldModel.recordPredictionError(errorRecord);

    // Record empirical calibration outcome
    const predictedConf = 85;
    const actualMatchScore = Math.round((1.0 - errorRecord.predictionErrorDelta) * 100);
    worldModel.recordPredictionOutcome(predictedConf, actualMatchScore);
  }
}
