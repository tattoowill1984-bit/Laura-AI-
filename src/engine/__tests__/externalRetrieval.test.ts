import { externalRetrievalGateway, ExternalObservation } from '../externalRetrievalGateway';
import { toolCapabilityRegistry } from '../toolCapabilityRegistry';
import { persistentStorage } from '../persistentStorage';

export interface TestResultItem {
  testName: string;
  passed: boolean;
  details: string;
  executionTimeMs: number;
  evidence?: any;
}

export async function runExternalRetrievalTestSuite(): Promise<TestResultItem[]> {
  const testResults: TestResultItem[] = [];

  // Initialize & run startup health check
  await toolCapabilityRegistry.runStartupHealthCheck();

  // -------------------------------------------------------------
  // Test 1: Mandatory Tulsa Current-News Test
  // -------------------------------------------------------------
  const t1Start = Date.now();
  try {
    const tulsaPrompt = "What are this morning's top headline stories from Tulsa, Oklahoma?";
    
    // Step 1: Detect freshness requirement
    const intent = externalRetrievalGateway.classifyRequestIntent(tulsaPrompt);
    const freshnessDetected = intent.classification === 'FRESH_EXTERNAL_INFORMATION' && intent.freshnessRequired;

    // Step 2: Invoke external retrieval tool
    const retrievalRes = await externalRetrievalGateway.request({
      query: 'top headline stories from Tulsa Oklahoma',
      purpose: 'Current news verification for operator request',
      freshness_required: true,
    });

    const toolExecuted = retrievalRes.state === 'TOOL_RETURNED_RESULT';
    const hasResults = (retrievalRes.observation?.results.length || 0) > 0;
    const hasProvenance = !!(
      retrievalRes.observation?.content_hash &&
      retrievalRes.observation?.retrieved_at &&
      retrievalRes.observation?.source
    );

    // Step 3: Identify sources used
    const sourcesIdentified = retrievalRes.observation?.results.map((r) => r.source).filter(Boolean) || [];

    const tulsaPassed = freshnessDetected && toolExecuted && hasResults && hasProvenance && sourcesIdentified.length > 0;

    testResults.push({
      testName: 'Mandatory Tulsa Current-News Test',
      passed: tulsaPassed,
      executionTimeMs: Date.now() - t1Start,
      details: tulsaPassed
        ? `Successfully retrieved ${retrievalRes.observation?.results.length} real headlines from sources [${sourcesIdentified.slice(0, 3).join(', ')}]. Content SHA-256: ${retrievalRes.observation?.content_hash.slice(0, 8)}`
        : `Failed Tulsa news retrieval. Freshness detected: ${freshnessDetected}, Executed: ${toolExecuted}, Has results: ${hasResults}`,
      evidence: {
        intent,
        state: retrievalRes.state,
        resultsCount: retrievalRes.observation?.results.length,
        sourcesIdentified,
        sha256: retrievalRes.observation?.content_hash,
      },
    });
  } catch (err: any) {
    testResults.push({
      testName: 'Mandatory Tulsa Current-News Test',
      passed: false,
      executionTimeMs: Date.now() - t1Start,
      details: `Exception encountered during Tulsa test: ${err?.message || String(err)}`,
    });
  }

  // -------------------------------------------------------------
  // Test A — Web Search
  // -------------------------------------------------------------
  const taStart = Date.now();
  try {
    const searchRes = await externalRetrievalGateway.request({
      query: 'latest information about quantum computing benchmarks',
      purpose: 'Web search test A',
    });

    const searchPassed = searchRes.state === 'TOOL_RETURNED_RESULT' && (searchRes.observation?.results.length || 0) > 0;

    testResults.push({
      testName: 'Test A — Web Search',
      passed: searchPassed,
      executionTimeMs: Date.now() - taStart,
      details: searchPassed
        ? `Web search returned ${searchRes.observation?.results.length} hits for quantum computing query. SHA-256: ${searchRes.observation?.content_hash.slice(0, 8)}`
        : `Web search failed or returned 0 results. State: ${searchRes.state}`,
    });
  } catch (err: any) {
    testResults.push({
      testName: 'Test A — Web Search',
      passed: false,
      executionTimeMs: Date.now() - taStart,
      details: `Web search exception: ${err?.message || String(err)}`,
    });
  }

  // -------------------------------------------------------------
  // Test B — Web Fetch
  // -------------------------------------------------------------
  const tbStart = Date.now();
  try {
    const fetchRes = await externalRetrievalGateway.fetchWebPage('https://en.wikipedia.org/wiki/Tulsa,_Oklahoma');
    const fetchPassed = fetchRes.state === 'TOOL_RETURNED_RESULT' && !!fetchRes.pageData?.text && fetchRes.pageData.text.length > 100;

    testResults.push({
      testName: 'Test B — Web Fetch',
      passed: fetchPassed,
      executionTimeMs: Date.now() - tbStart,
      details: fetchPassed
        ? `Web fetch succeeded. Fetched ${fetchRes.pageData?.text.length} chars from URL. Title: "${fetchRes.pageData?.title}". SHA-256: ${fetchRes.pageData?.sha256Hash.slice(0, 8)}`
        : `Web fetch failed. State: ${fetchRes.state}`,
    });
  } catch (err: any) {
    testResults.push({
      testName: 'Test B — Web Fetch',
      passed: false,
      executionTimeMs: Date.now() - tbStart,
      details: `Web fetch exception: ${err?.message || String(err)}`,
    });
  }

  // -------------------------------------------------------------
  // Test C — Current Information / Freshness Detection
  // -------------------------------------------------------------
  const tcStart = Date.now();
  try {
    const freshPrompt = 'What is the latest publicly available information about artificial intelligence regulations today?';
    const intent = externalRetrievalGateway.classifyRequestIntent(freshPrompt);
    const tcPassed = intent.classification === 'FRESH_EXTERNAL_INFORMATION' && intent.freshnessRequired;

    testResults.push({
      testName: 'Test C — Current Information Freshness Detection',
      passed: tcPassed,
      executionTimeMs: Date.now() - tcStart,
      details: tcPassed
        ? `Correctly classified query as FRESH_EXTERNAL_INFORMATION with freshness required.`
        : `Failed freshness classification. Result: ${intent.classification}`,
    });
  } catch (err: any) {
    testResults.push({
      testName: 'Test C — Current Information Freshness Detection',
      passed: false,
      executionTimeMs: Date.now() - tcStart,
      details: `Freshness detection exception: ${err?.message || String(err)}`,
    });
  }

  // -------------------------------------------------------------
  // Test D — Tool Failure & Capability Unavailable Handling
  // -------------------------------------------------------------
  const tdStart = Date.now();
  try {
    // Step 1: Temporarily disable external_retrieval
    toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'UNAVAILABLE', 'Simulated tool disconnection for Test D');

    const disabledRes = await externalRetrievalGateway.request({
      query: "What are this morning's top headline stories from Tulsa, Oklahoma?",
    });

    const isUnavailableState = disabledRes.state === 'TOOL_UNAVAILABLE';
    const hasExplicitReason = disabledRes.failureReason?.includes('CAPABILITY_UNAVAILABLE') || false;

    // Restore capability
    toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'AVAILABLE');

    const tdPassed = isUnavailableState && hasExplicitReason;

    testResults.push({
      testName: 'Test D — Tool Failure & Explicit Capability Unavailable Handling',
      passed: tdPassed,
      executionTimeMs: Date.now() - tdStart,
      details: tdPassed
        ? `System correctly returned TOOL_UNAVAILABLE state and explicit CAPABILITY_UNAVAILABLE failure reason without fabricating tool calls.`
        : `Failed tool failure test. State: ${disabledRes.state}, Reason: ${disabledRes.failureReason}`,
    });
  } catch (err: any) {
    // Ensure capability restored even on error
    toolCapabilityRegistry.setCapabilityStatus('external_retrieval', 'AVAILABLE');
    testResults.push({
      testName: 'Test D — Tool Failure & Explicit Capability Unavailable Handling',
      passed: false,
      executionTimeMs: Date.now() - tdStart,
      details: `Test D exception: ${err?.message || String(err)}`,
    });
  }

  // -------------------------------------------------------------
  // Test E — Provenance Metadata Verification
  // -------------------------------------------------------------
  const teStart = Date.now();
  try {
    const provRes = await externalRetrievalGateway.request({
      query: 'Oklahoma climate and geography overview',
    });

    const obs = provRes.observation;
    const hasDomain = !!obs?.provenance.sourceDomain;
    const hasHash = !!obs?.content_hash && obs.content_hash.length === 64;
    const hasFetchedAt = !!obs?.provenance.fetchedAt;
    const hasUncertainty = typeof obs?.provenance.uncertaintyScore === 'number';

    const tePassed = provRes.state === 'TOOL_RETURNED_RESULT' && hasDomain && hasHash && hasFetchedAt && hasUncertainty;

    testResults.push({
      testName: 'Test E — Provenance & Cryptographic Lineage',
      passed: tePassed,
      executionTimeMs: Date.now() - teStart,
      details: tePassed
        ? `Provenance metadata fully verified: Domain=${obs?.provenance.sourceDomain}, FetchedAt=${obs?.provenance.fetchedAt}, SHA-256=${obs?.content_hash}`
        : `Provenance metadata incomplete or state failed. State: ${provRes.state}`,
    });
  } catch (err: any) {
    testResults.push({
      testName: 'Test E — Provenance & Cryptographic Lineage',
      passed: false,
      executionTimeMs: Date.now() - teStart,
      details: `Provenance test exception: ${err?.message || String(err)}`,
    });
  }

  // -------------------------------------------------------------
  // Test F — Memory Boundary (Quarantine Enforcement)
  // -------------------------------------------------------------
  const tfStart = Date.now();
  try {
    const initialMemoriesCount = persistentStorage.getMemoriesForProfile('will-owner').length;

    // Perform external retrieval
    const memTestRes = await externalRetrievalGateway.request({
      query: 'Tulsa population and municipal governance details',
    });

    const endingMemoriesCount = persistentStorage.getMemoriesForProfile('will-owner').length;

    // Verify durable memory facts count did NOT automatically increase merely because retrieval occurred
    const tfPassed = memTestRes.state === 'TOOL_RETURNED_RESULT' && initialMemoriesCount === endingMemoriesCount;

    testResults.push({
      testName: 'Test F — Memory Boundary & External Content Quarantine',
      passed: tfPassed,
      executionTimeMs: Date.now() - tfStart,
      details: tfPassed
        ? `External information remained safely quarantined as transient observation; durable memory facts count unchanged (${initialMemoriesCount} -> ${endingMemoriesCount}).`
        : `Memory boundary breached! Durable memory count changed after external retrieval (${initialMemoriesCount} -> ${endingMemoriesCount}).`,
    });
  } catch (err: any) {
    testResults.push({
      testName: 'Test F — Memory Boundary & External Content Quarantine',
      passed: false,
      executionTimeMs: Date.now() - tfStart,
      details: `Memory boundary test exception: ${err?.message || String(err)}`,
    });
  }

  // -------------------------------------------------------------
  // Test G — LLM Consultation Capability
  // -------------------------------------------------------------
  const tgStart = Date.now();
  try {
    const consultRes = await externalRetrievalGateway.consultExternalLLM(
      'Evaluate structural consistency of active posture under raptor constraint',
      'gemini-3.7-flash'
    );

    const tgPassed = consultRes.state === 'TOOL_RETURNED_RESULT' && !!consultRes.consultationOutput?.includes('LLM_CONSULTATION');

    testResults.push({
      testName: 'Test G — LLM Consultation Capability',
      passed: tgPassed,
      executionTimeMs: Date.now() - tgStart,
      details: tgPassed
        ? `LLM consultation executed successfully. Output explicitly identified as model consultation.`
        : `LLM consultation failed. State: ${consultRes.state}`,
    });
  } catch (err: any) {
    testResults.push({
      testName: 'Test G — LLM Consultation Capability',
      passed: false,
      executionTimeMs: Date.now() - tgStart,
      details: `LLM consultation exception: ${err?.message || String(err)}`,
    });
  }

  return testResults;
}
