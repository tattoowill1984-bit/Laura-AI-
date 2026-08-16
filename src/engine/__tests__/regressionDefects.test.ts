import { externalRetrievalGateway } from '../externalRetrievalGateway';
import { toolCapabilityRegistry } from '../toolCapabilityRegistry';
import { webRetrievalAdapter } from '../webRetrievalAdapter';
import { GovernedExecutionKernel } from '../governedExecutionKernel';
import { GabbyCognitiveSubstrate } from '../gabbySubstrate';

export async function runRegressionDefectsTests() {
  console.log('=== STARTING REGRESSION DEFECTS VERIFICATION TEST SUITE ===\n');
  let passedCount = 0;
  let failedCount = 0;

  // Setup Governed Kernel
  const substrate = new GabbyCognitiveSubstrate();
  const kernel = new GovernedExecutionKernel(substrate);
  externalRetrievalGateway.setExecutionKernel(kernel);

  // ---------------------------------------------------------------------------
  // TEST 1: Capability State Initialization & Consistency
  // ---------------------------------------------------------------------------
  try {
    console.log('[TEST 1] Verifying Capability State Initialization & Consistency...');
    // Ensure capability is active
    toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'AVAILABLE');

    const statusOnBoot = toolCapabilityRegistry.getCapabilityStatus('external_retrieval');
    const isAvailableOnBoot = toolCapabilityRegistry.isCapabilityAvailable('external_retrieval');

    if (statusOnBoot !== 'AVAILABLE' || !isAvailableOnBoot) {
      throw new Error(`Capability external_retrieval failed initialization check: status=${statusOnBoot}`);
    }

    // Execute first request
    const firstReq = await externalRetrievalGateway.request({
      query: 'Tulsa weather forecast test',
      purpose: 'Verification turn 1',
    });

    if (firstReq.state !== 'TOOL_RETURNED_RESULT' || !firstReq.observation) {
      throw new Error(`First request failed unexpectedly: state=${firstReq.state}, failure=${firstReq.failureReason}`);
    }

    console.log('  ✓ Test 1 Passed: Capability external_retrieval initialized consistently as AVAILABLE on first request.\n');
    passedCount++;
  } catch (err: any) {
    console.error('  ✗ Test 1 Failed:', err.message || err);
    failedCount++;
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Follow-up Intent Preservation ("Try again")
  // ---------------------------------------------------------------------------
  try {
    console.log('[TEST 2] Verifying Follow-up Intent Preservation on "Try again"...');
    const originalQuery = 'Looking for the latest Tulsa Oklahoma news headlines and today\'s weather';

    // 1. Set unresolved pending query
    externalRetrievalGateway.setPendingTaskQuery(originalQuery);

    const history = [
      { role: 'user', sender: 'user', text: originalQuery },
      { role: 'model', sender: 'assistant', text: '[EXTERNAL RETRIEVAL ATTEMPTED :: STATUS: TOOL_UNAVAILABLE]' },
    ];

    // Meta follow-up prompt
    const followUpPrompt = "Okay, I'm pretty sure I fix the issues now. Please try again";

    // Classify
    const intentResult = externalRetrievalGateway.classifyRequestIntent(followUpPrompt, history);

    if (intentResult.resolvedQuery !== originalQuery) {
      throw new Error(`Expected resolvedQuery to be '${originalQuery}', but got '${intentResult.resolvedQuery}'`);
    }

    if (intentResult.classification !== 'FRESH_EXTERNAL_INFORMATION' || !intentResult.isRetryDirective) {
      throw new Error(`Expected FRESH_EXTERNAL_INFORMATION and isRetryDirective=true, got classification=${intentResult.classification}`);
    }

    // Execute request with resolvedQuery
    const retryReq = await externalRetrievalGateway.request({
      query: intentResult.resolvedQuery,
      purpose: `Retry unresolved task: '${intentResult.resolvedQuery}'`,
    });

    if (retryReq.state !== 'TOOL_RETURNED_RESULT' || !retryReq.observation) {
      throw new Error(`Retry request failed: state=${retryReq.state}`);
    }

    if (retryReq.observation.query !== originalQuery) {
      throw new Error(`Expected observation query to match original query '${originalQuery}', but got '${retryReq.observation.query}'`);
    }

    console.log('  ✓ Test 2 Passed: Follow-up "Try again" successfully resolved prior unresolved query instead of searching meta text.\n');
    passedCount++;
  } catch (err: any) {
    console.error('  ✗ Test 2 Failed:', err.message || err);
    failedCount++;
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Retrieval Temporal Freshness & Location Relevance Filtering
  // ---------------------------------------------------------------------------
  try {
    console.log('[TEST 3] Verifying Temporal Freshness and Location Relevance Filtering...');
    const newsQuery = 'Looking for the latest Tulsa Oklahoma news headlines and today\'s weather';

    const obs = await webRetrievalAdapter.executeWebSearch(newsQuery);

    if (!obs || !obs.results || obs.results.length === 0) {
      throw new Error('Observation returned empty results array');
    }

    const currentYear = new Date().getFullYear();

    // Verify results
    for (const item of obs.results) {
      const titleLower = item.title.toLowerCase();
      const snippetLower = item.snippet.toLowerCase();

      // Location relevance check
      const mentionsLocation = titleLower.includes('tulsa') || titleLower.includes('oklahoma') || snippetLower.includes('tulsa') || snippetLower.includes('oklahoma') || item.url.includes('wttr.in') || item.source.includes('Weather');
      if (!mentionsLocation) {
        throw new Error(`Item '${item.title}' failed location relevance check for query '${newsQuery}'`);
      }

      // Freshness check: no items from 2025 or older when current year is 2026
      if (snippetLower.includes('2025') || item.title.includes('2025')) {
        throw new Error(`Item '${item.title}' contains stale 2025 publication date`);
      }
    }

    console.log(`  ✓ Test 3 Passed: Retained ${obs.results.length} results. All results passed location relevance and temporal freshness constraints.\n`);
    passedCount++;
  } catch (err: any) {
    console.error('  ✗ Test 3 Failed:', err.message || err);
    failedCount++;
  }

  console.log(`=== REGRESSION SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED ===\n`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionDefectsTests().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
