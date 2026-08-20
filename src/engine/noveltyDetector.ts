import crypto from 'crypto';
import { NoveltyDetectionReport, NoveltyHypothesis, EpistemicState } from '../types';

export class EpistemicNoveltyDetector {
  private noveltyHistory: NoveltyDetectionReport[] = [];
  private baselineWordFrequencies: Map<string, number> = new Map();
  private observationCount: number = 0;

  constructor() {
    // Seed baseline vocabulary
    const defaultBaseline = ['system', 'laura', 'user', 'query', 'observation', 'sentinel', 'memory', 'status', 'hello', 'analysis', 'gabby', 'model'];
    defaultBaseline.forEach(w => this.baselineWordFrequencies.set(w, 5));
    this.observationCount = 10;
  }

  /**
   * Evaluates incoming observation payload and world model updates for statistically significant deviations.
   */
  public analyzeNovelty(
    content: string,
    epistemicState?: EpistemicState,
    worldGraphNodeDeltaCount: number = 0,
    predictionErrorDelta: number = 0.0
  ): NoveltyDetectionReport {
    this.observationCount++;

    // 1. Calculate Word / Token Frequency Surprise (Shannon Entropy & TF-IDF Rarity)
    const words = content.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    let totalRarityScore = 0;
    let rareWordsCount = 0;
    const detectedDeviations: string[] = [];

    words.forEach(word => {
      const freq = this.baselineWordFrequencies.get(word) || 0;
      this.baselineWordFrequencies.set(word, freq + 1);

      if (freq === 0) {
        rareWordsCount++;
        totalRarityScore += 2.5;
      } else if (freq < 3) {
        totalRarityScore += 1.0;
      }
    });

    const wordEntropy = Math.min(10, (words.length > 0 ? (totalRarityScore / words.length) * 3 : 0));

    // 2. Compute Epistemic Volatility & Graph Mutation Deviation
    const volatility = epistemicState ? epistemicState.volatility : 12;
    const friction = epistemicState ? epistemicState.frictionScore : 8;
    const epistemicEntropy = (volatility * 0.4) + (friction * 0.3) + (predictionErrorDelta * 30);

    // 3. Compute Statistical Deviation Z-Score (sigma)
    const combinedDevScore = (wordEntropy * 0.4) + (worldGraphNodeDeltaCount * 1.5) + (predictionErrorDelta * 10) + (rareWordsCount * 0.3);
    const zScore = Math.max(0, Math.min(6.0, parseFloat(((combinedDevScore - 0.8) / 0.6).toFixed(2))));

    // 4. Calculate Quantitative Novelty Score (0 - 100%)
    const noveltyScore = Math.min(100, Math.max(0, Math.round((zScore / 3.5) * 100)));
    const isNovel = noveltyScore >= 30 || zScore >= 1.5;

    if (rareWordsCount > 2) {
      detectedDeviations.push(`High lexical surprise: ${rareWordsCount} previously unseen terms detected.`);
    }
    if (worldGraphNodeDeltaCount > 0) {
      detectedDeviations.push(`World graph topological shift: ${worldGraphNodeDeltaCount} entity nodes mutated.`);
    }
    if (predictionErrorDelta > 0.10) {
      detectedDeviations.push(`Prediction error spike: Δerror = ${(predictionErrorDelta * 100).toFixed(1)}%.`);
    }
    if (volatility > 20) {
      detectedDeviations.push(`Epistemic volatility elevated: ${volatility}%.`);
    }

    if (detectedDeviations.length === 0 && isNovel) {
      detectedDeviations.push(`Statistical variance exceeds baseline (+${zScore}σ deviation).`);
    }

    // 5. Generator-Critic Loop: Auto-generate Hypotheses upon Novelty Detection
    const generatedHypotheses: NoveltyHypothesis[] = [];
    if (isNovel) {
      const obsHash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
      const now = new Date().toISOString();

      // Hypothesis 1: Structural Domain Shift
      generatedHypotheses.push({
        id: `HYP_NOVELTY_${Date.now()}_1`,
        title: `Hypothesis: Structural Domain Shift (+${zScore}σ deviation)`,
        competingTheory: `Theory A: Incoming observation represents an authentic domain expansion requiring new conceptual nodes in World Model.`,
        noveltyScore,
        statisticalDeviationZScore: zScore,
        falsificationCondition: `Falsify if subsequent 3 turns align within ±0.8σ of baseline historical distribution.`,
        plausibilityScore: Math.min(0.95, parseFloat((0.55 + (noveltyScore / 250)).toFixed(2))),
        timestamp: now,
        status: 'PROPOSED',
        sourceObservationHash: obsHash,
      });

      // Hypothesis 2: Anomaly / Edge Case
      if (noveltyScore > 45) {
        generatedHypotheses.push({
          id: `HYP_NOVELTY_${Date.now()}_2`,
          title: `Hypothesis: Transient Peripheral Anomaly`,
          competingTheory: `Theory B: Observation is a transient peripheral outlier or uncalibrated sensor noise.`,
          noveltyScore,
          statisticalDeviationZScore: zScore,
          falsificationCondition: `Falsify if observation attributes are independently corroborated by secondary sensor stream.`,
          plausibilityScore: Math.max(0.15, parseFloat((0.85 - (noveltyScore / 180)).toFixed(2))),
          timestamp: now,
          status: 'UNDER_CRITIQUE',
          sourceObservationHash: obsHash,
        });
      }
    }

    const report: NoveltyDetectionReport = {
      id: `NOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      noveltyScore,
      statisticalDeviationZScore: zScore,
      isNovel,
      detectedDeviations,
      generatedHypotheses,
      epistemicEntropy: parseFloat(epistemicEntropy.toFixed(1)),
      wordEntropy: parseFloat(wordEntropy.toFixed(2)),
      predictionErrorDelta,
    };

    this.noveltyHistory.unshift(report);
    if (this.noveltyHistory.length > 30) this.noveltyHistory.pop();

    return report;
  }

  public getHistory(): NoveltyDetectionReport[] {
    return [...this.noveltyHistory];
  }
}

export const epistemicNoveltyDetector = new EpistemicNoveltyDetector();
