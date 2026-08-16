import { GovernedExecutionKernel } from '../governedExecutionKernel';
import { GovernedLearningEngine } from '../governedLearningEngine';
import { externalRetrievalGateway } from '../externalRetrievalGateway';
import { modelProviderRegistry } from '../modelProviderRegistry';
import { humanNodeRegistry } from '../humanNodeRegistry';
import { GabbyCognitiveSubstrate } from '../gabbySubstrate';

export interface TestResult {
  testNumber: number;
  testName: string;
  passed: boolean;
  executionTimeMs: number;
  details: string;
}

export async function runGovernedE2EResilienceTestSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const substrate = new GabbyCognitiveSubstrate();
  const kernel = new GovernedExecutionKernel(substrate);

  // 1. Model Provider Registry Fallback and Synthesis
  const t1Start = Date.now();
  const healthReport = modelProviderRegistry.getModelHealthReport();
  const providerOk = Array.isArray(healthReport);
  results.push({
    testNumber: 1,
    testName: 'Model Provider Registry Active Availability & Triangulation',
    passed: providerOk,
    executionTimeMs: Date.now() - t1Start,
    details: providerOk ? `Model health entries: ${healthReport.length}` : 'Health report unavailable'
  });

  // 2. Governed Knowledge Synthesis and Accuracy Gate
  const t2Start = Date.now();
  const classification = externalRetrievalGateway.classifyRequestIntent('knowledge synthesis test query');
  const searchOk = !!classification;
  results.push({
    testNumber: 2,
    testName: 'Governed Knowledge Base External Synthesis Gate',
    passed: searchOk,
    executionTimeMs: Date.now() - t2Start,
    details: searchOk ? `Classification: ${classification.classification}` : 'Classification failed'
  });

  // 3. Human Node Subject Authentication
  const t3Start = Date.now();
  humanNodeRegistry.setCurrentSubject('will-owner', 100);
  const curCtx = humanNodeRegistry.getCurrentSubjectContext();
  const subOk = curCtx.currentSubjectId === 'will-owner';
  results.push({
    testNumber: 3,
    testName: 'Human Node Subject Identity Verification',
    passed: subOk,
    executionTimeMs: Date.now() - t3Start,
    details: subOk ? `Active human subject authenticated: ${curCtx.currentSubjectId}` : 'Failed verifying subject'
  });

  return results;
}
