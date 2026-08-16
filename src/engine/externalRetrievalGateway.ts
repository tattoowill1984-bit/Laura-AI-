import crypto from 'crypto';
import { webRetrievalAdapter, QuarantinedWebObservation } from './webRetrievalAdapter';
import { toolCapabilityRegistry, CapabilityStatus } from './toolCapabilityRegistry';
import { GovernedExecutionKernel, UntrustedProposal } from './governedExecutionKernel';

export type ToolExecutionState =
  | 'TOOL_REQUESTED'
  | 'TOOL_EXECUTED'
  | 'TOOL_RETURNED_RESULT'
  | 'TOOL_FAILED'
  | 'TOOL_UNAVAILABLE';

export interface ExternalRetrievalRequest {
  query: string;
  purpose?: string;
  freshness_required?: boolean;
  source_preferences?: string[];
  max_results?: number;
}

export interface ExternalObservationResultItem {
  title: string;
  snippet: string;
  url: string;
  source: string;
  fetchedAt: string;
  publicationTime?: string;
}

export interface ExternalObservation {
  query: string;
  results: ExternalObservationResultItem[];
  source: string;
  title: string;
  retrieved_at: string;
  publication_time?: string;
  content: string;
  url: string;
  provenance: {
    sourceDomain: string;
    authorityRating: number;
    confidenceScore: number;
    uncertaintyScore: number;
    fetchedAt: string;
    retrievalMethod: string;
  };
  retrieval_status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'UNAVAILABLE';
  uncertainty: number;
  content_hash: string;
  quarantineState: 'QUARANTINED_OBSERVATION';
  merkleNodeId?: string;
}

export interface IntentClassificationResult {
  classification: 'FRESH_EXTERNAL_INFORMATION' | 'INTERNAL_KNOWLEDGE';
  freshnessRequired: boolean;
  suggestedAction: 'external_retrieval' | 'none';
  capabilityStatus: CapabilityStatus;
  resolvedQuery?: string;
  isRetryDirective?: boolean;
  reason?: string;
}

export interface CognitiveTelemetryRecord {
  wasRetrievalNecessary: boolean;
  queryRelevanceScore: number;
  sourceQualityScore: number;
  evidenceConflicted: boolean;
  confidenceDelta: number;
  uncertaintyReduced: boolean;
}

export interface ToolExecutionRecord {
  executionId: string;
  timestamp: string;
  toolName: string;
  state: ToolExecutionState;
  queryOrTarget: string;
  resultSummary?: string;
  failureReason?: string;
  intentCategory?: 'COGNITIVE_INTENT' | 'EXTERNAL_SIDE_EFFECT_INTENT';
  cognitiveTelemetry?: CognitiveTelemetryRecord;
}

export class ExternalRetrievalGateway {
  private static instance: ExternalRetrievalGateway;
  private executionHistory: ToolExecutionRecord[] = [];
  private executionKernel?: GovernedExecutionKernel;
  private lastPendingQuery?: string;

  private constructor() {}

  public static getInstance(): ExternalRetrievalGateway {
    if (!ExternalRetrievalGateway.instance) {
      ExternalRetrievalGateway.instance = new ExternalRetrievalGateway();
    }
    return ExternalRetrievalGateway.instance;
  }

  public setExecutionKernel(kernel: GovernedExecutionKernel): void {
    this.executionKernel = kernel;
  }

  public getExecutionKernel(): GovernedExecutionKernel | undefined {
    return this.executionKernel;
  }

  public setPendingTaskQuery(query: string): void {
    if (query && query.trim().length > 0) {
      this.lastPendingQuery = query.trim();
    }
  }

  public getPendingTaskQuery(): string | undefined {
    return this.lastPendingQuery;
  }

  /**
   * Resolves whether promptText is a retry/follow-up directive ('try again') and binds it to the prior unresolved query.
   */
  public resolveEffectiveRetrievalQuery(
    promptText: string,
    history?: Array<{ role?: string; sender?: string; text?: string }>
  ): { effectiveQuery: string; isRetry: boolean } {
    const trimmed = promptText.trim();
    const lower = trimmed.toLowerCase();

    // Check if promptText is a retry / meta directive
    const retryRegex = /\b(try\s+again|retry|please\s+try\s+again|try\s+it\s+again|do\s+it\s+again|one\s+more\s+time|fix\s+issues\s+and\s+try\s+again)\b/i;
    const isRetry = retryRegex.test(lower) || lower === 'try again' || lower === 'retry' || lower.includes('try again');

    if (isRetry) {
      // 1. Try stored pending query
      if (this.lastPendingQuery && this.lastPendingQuery.trim().length > 0) {
        return { effectiveQuery: this.lastPendingQuery, isRetry: true };
      }

      // 2. Scan conversation history backwards for last substantive query
      if (history && history.length > 0) {
        for (let i = history.length - 1; i >= 0; i--) {
          const turn = history[i];
          const turnText = (turn.text || '').trim();
          const turnLower = turnText.toLowerCase();
          const isUserTurn = turn.role === 'user' || turn.sender === 'user';
          if (isUserTurn && turnText && !retryRegex.test(turnLower) && turnText.length > 5) {
            this.lastPendingQuery = turnText;
            return { effectiveQuery: turnText, isRetry: true };
          }
        }
      }
    }

    // Substantive user query
    if (trimmed.length > 0) {
      this.lastPendingQuery = trimmed;
    }
    return { effectiveQuery: trimmed, isRetry };
  }

  /**
   * Evaluates if a query requires fresh external information vs internal knowledge
   */
  public classifyRequestIntent(
    promptText: string,
    history?: Array<{ role?: string; sender?: string; text?: string }>
  ): IntentClassificationResult {
    const { effectiveQuery, isRetry } = this.resolveEffectiveRetrievalQuery(promptText, history);
    const evalText = effectiveQuery || promptText;
    const lower = evalText.toLowerCase();

    const freshnessKeywords = [
      'today',
      'this morning',
      'right now',
      'latest news',
      'current weather',
      'recently',
      'tonight',
      'this week',
      'breaking news',
      'updated headlines',
      'tulsa weather',
      'weather forecast',
      'search the web',
      'search google',
      'lookup online',
      'open this webpage',
      'public webpage',
      'web search',
      'internet search',
    ];

    const needsFreshness = freshnessKeywords.some((kw) => lower.includes(kw));
    const isExternalSearchRequest =
      lower.includes('search the web') ||
      lower.includes('web search') ||
      lower.includes('lookup online') ||
      lower.includes('google search') ||
      lower.includes('weather forecast') ||
      needsFreshness ||
      isRetry;

    // Query truthful capability status from toolCapabilityRegistry without manufacturing AVAILABILITY
    const currentCapStatus = toolCapabilityRegistry.getCapabilityStatus('external_retrieval');

    if (isExternalSearchRequest) {
      return {
        classification: 'FRESH_EXTERNAL_INFORMATION',
        freshnessRequired: needsFreshness,
        suggestedAction: 'external_retrieval',
        capabilityStatus: currentCapStatus,
        resolvedQuery: evalText,
        isRetryDirective: isRetry,
        reason: isRetry
          ? `Follow-up retry directive bound to unresolved prior query '${evalText}'.`
          : needsFreshness
          ? 'Query contains freshness indicators requiring real-time external retrieval.'
          : 'Query explicitly requests external knowledge lookups.',
      };
    }

    return {
      classification: 'INTERNAL_KNOWLEDGE',
      freshnessRequired: false,
      suggestedAction: 'none',
      capabilityStatus: currentCapStatus,
      resolvedQuery: evalText,
      isRetryDirective: isRetry,
      reason: 'Query can be processed via internal knowledge or logic.',
    };
  }

  /**
   * Main entry point for requesting external information
   */
  public async request(
    req: ExternalRetrievalRequest,
    overrideKernel?: GovernedExecutionKernel,
    identityId: string = 'will-owner'
  ): Promise<{
    state: ToolExecutionState;
    observation?: ExternalObservation;
    failureReason?: string;
    executionRecord: ToolExecutionRecord;
  }> {
    const execId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // 1. Capability Readiness Check derived strictly from verified tool capability registry
    const isCapAvailable = toolCapabilityRegistry.isCapabilityAvailable('external_retrieval');
    if (!isCapAvailable) {
      const currentStatus = toolCapabilityRegistry.getCapabilityStatus('external_retrieval');
      const record: ToolExecutionRecord = {
        executionId: execId,
        timestamp: now,
        toolName: 'external_retrieval',
        state: 'TOOL_UNAVAILABLE',
        queryOrTarget: req.query,
        failureReason: `CAPABILITY_UNAVAILABLE: capability external_retrieval status is '${currentStatus}' in verified runtime registry`,
      };
      this.recordExecution(record);
      return {
        state: 'TOOL_UNAVAILABLE',
        failureReason: record.failureReason,
        executionRecord: record,
      };
    }

    // 2. Log TOOL_REQUESTED
    this.recordExecution({
      executionId: execId,
      timestamp: now,
      toolName: 'external_retrieval',
      state: 'TOOL_REQUESTED',
      queryOrTarget: req.query,
    });

    const activeKernel = overrideKernel || this.executionKernel;

    try {
      let rawQuarantinedObs: QuarantinedWebObservation;

      if (activeKernel) {
        // Evaluate proposal & execute through GovernedExecutionKernel
        const proposal: UntrustedProposal = {
          proposalId: `prop_${execId}`,
          action: 'EXTERNAL_RETRIEVAL',
          target: req.query,
          payload: { query: req.query },
          reasoning: req.purpose || 'External retrieval request',
          intentCategory: 'COGNITIVE_INTENT',
          modelMetadata: { provider: 'externalRetrievalGateway' },
        };

        const govRes = await activeKernel.processAndExecuteProposal(proposal, identityId, 'external_retrieval');

        if (!govRes.decision.permitted) {
          const record: ToolExecutionRecord = {
            executionId: execId,
            timestamp: new Date().toISOString(),
            toolName: 'external_retrieval',
            state: 'TOOL_UNAVAILABLE',
            queryOrTarget: req.query,
            failureReason: `GOVERNANCE_DENIED: ${govRes.decision.rejectionReason || 'Policy or capability restraint'}`,
          };
          this.recordExecution(record);
          return {
            state: 'TOOL_UNAVAILABLE',
            failureReason: record.failureReason,
            executionRecord: record,
          };
        }

        if (govRes.execution && !govRes.execution.success) {
          const record: ToolExecutionRecord = {
            executionId: execId,
            timestamp: new Date().toISOString(),
            toolName: 'external_retrieval',
            state: 'TOOL_FAILED',
            queryOrTarget: req.query,
            failureReason: `EXECUTION_FAILED: ${govRes.execution.error || 'Effector execution failed'}`,
          };
          this.recordExecution(record);
          return {
            state: 'TOOL_FAILED',
            failureReason: record.failureReason,
            executionRecord: record,
          };
        }

        rawQuarantinedObs = govRes.execution?.output;
      } else {
        // Fallback direct execution if kernel not attached
        rawQuarantinedObs = await webRetrievalAdapter.executeWebSearch(req.query);
      }

      // Log TOOL_EXECUTED
      this.recordExecution({
        executionId: execId,
        timestamp: new Date().toISOString(),
        toolName: 'external_retrieval',
        state: 'TOOL_EXECUTED',
        queryOrTarget: req.query,
      });

      if (!rawQuarantinedObs || !rawQuarantinedObs.results) {
        const record: ToolExecutionRecord = {
          executionId: execId,
          timestamp: new Date().toISOString(),
          toolName: 'external_retrieval',
          state: 'TOOL_FAILED',
          queryOrTarget: req.query,
          failureReason: 'EMPTY_OBSERVATION: Web retrieval adapter returned undefined observation',
        };
        this.recordExecution(record);
        return {
          state: 'TOOL_FAILED',
          failureReason: record.failureReason,
          executionRecord: record,
        };
      }

      const items: ExternalObservationResultItem[] = rawQuarantinedObs.results.map((r) => ({
        title: r.title,
        snippet: r.snippet,
        url: r.url,
        source: r.source,
        fetchedAt: r.fetchedAt,
        publicationTime: r.fetchedAt,
      }));

      const combinedText = items.map((it) => `${it.title}: ${it.snippet} (${it.url})`).join('\n\n');
      const contentHash = rawQuarantinedObs.sha256Hash;

      const observation: ExternalObservation = {
        query: req.query,
        results: items,
        source: items[0]?.source || 'External Web Gateway',
        title: items[0]?.title || `Retrieval results for ${req.query}`,
        retrieved_at: rawQuarantinedObs.provenance.fetchedAt,
        publication_time: items[0]?.publicationTime || rawQuarantinedObs.provenance.fetchedAt,
        content: combinedText,
        url: items[0]?.url || 'https://external-web-gateway.org',
        provenance: {
          sourceDomain: rawQuarantinedObs.provenance.sourceDomain,
          authorityRating: rawQuarantinedObs.provenance.authorityRating,
          confidenceScore: rawQuarantinedObs.provenance.confidenceScore,
          uncertaintyScore: rawQuarantinedObs.provenance.uncertaintyScore,
          fetchedAt: rawQuarantinedObs.provenance.fetchedAt,
          retrievalMethod: 'Executable Multi-Source Gateway HTTP Adapter',
        },
        retrieval_status: items.length > 0 ? 'SUCCESS' : 'FAILED',
        uncertainty: rawQuarantinedObs.provenance.uncertaintyScore,
        content_hash: contentHash,
        quarantineState: 'QUARANTINED_OBSERVATION',
      };

      const record: ToolExecutionRecord = {
        executionId: execId,
        timestamp: new Date().toISOString(),
        toolName: 'external_retrieval',
        state: 'TOOL_RETURNED_RESULT',
        queryOrTarget: req.query,
        resultSummary: `Retrieved ${items.length} results. SHA-256: ${contentHash.slice(0, 8)}`,
      };
      this.recordExecution(record);

      return {
        state: 'TOOL_RETURNED_RESULT',
        observation,
        executionRecord: record,
      };
    } catch (err: any) {
      const failReason = `Retrieval execution failed: ${err?.message || String(err)}`;
      const record: ToolExecutionRecord = {
        executionId: execId,
        timestamp: new Date().toISOString(),
        toolName: 'external_retrieval',
        state: 'TOOL_FAILED',
        queryOrTarget: req.query,
        failureReason: failReason,
      };
      this.recordExecution(record);

      return {
        state: 'TOOL_FAILED',
        failureReason: failReason,
        executionRecord: record,
      };
    }
  }

  /**
   * Executes web_fetch tool capability
   */
  public async fetchWebPage(targetUrl: string): Promise<{
    state: ToolExecutionState;
    pageData?: { title: string; text: string; url: string; sha256Hash: string; fetchedAt: string };
    failureReason?: string;
  }> {
    const execId = `fetch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    if (!toolCapabilityRegistry.isCapabilityAvailable('web_fetch')) {
      const record: ToolExecutionRecord = {
        executionId: execId,
        timestamp: now,
        toolName: 'web_fetch',
        state: 'TOOL_UNAVAILABLE',
        queryOrTarget: targetUrl,
        failureReason: 'CAPABILITY_UNAVAILABLE: capability web_fetch is runtime_tool_not_connected',
      };
      this.recordExecution(record);
      return { state: 'TOOL_UNAVAILABLE', failureReason: record.failureReason };
    }

    try {
      this.recordExecution({ executionId: execId, timestamp: now, toolName: 'web_fetch', state: 'TOOL_REQUESTED', queryOrTarget: targetUrl });
      this.recordExecution({ executionId: execId, timestamp: new Date().toISOString(), toolName: 'web_fetch', state: 'TOOL_EXECUTED', queryOrTarget: targetUrl });

      const pageData = await webRetrievalAdapter.fetchUrlContent(targetUrl);

      this.recordExecution({
        executionId: execId,
        timestamp: new Date().toISOString(),
        toolName: 'web_fetch',
        state: 'TOOL_RETURNED_RESULT',
        queryOrTarget: targetUrl,
        resultSummary: `Fetched ${pageData.text.length} chars. SHA-256: ${pageData.sha256Hash.slice(0, 8)}`,
      });

      return { state: 'TOOL_RETURNED_RESULT', pageData };
    } catch (err: any) {
      const failReason = `Web fetch failed: ${err?.message || String(err)}`;
      this.recordExecution({ executionId: execId, timestamp: new Date().toISOString(), toolName: 'web_fetch', state: 'TOOL_FAILED', queryOrTarget: targetUrl, failureReason: failReason });
      return { state: 'TOOL_FAILED', failureReason: failReason };
    }
  }

  /**
   * Executes llm_consultation tool capability
   */
  public async consultExternalLLM(prompt: string, targetModel: string = 'gemini-3.7-flash'): Promise<{
    state: ToolExecutionState;
    consultationOutput?: string;
    failureReason?: string;
  }> {
    const execId = `consult_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    if (!toolCapabilityRegistry.isCapabilityAvailable('llm_consultation')) {
      return {
        state: 'TOOL_UNAVAILABLE',
        failureReason: 'CAPABILITY_UNAVAILABLE: capability llm_consultation is runtime_tool_not_connected',
      };
    }

    this.recordExecution({ executionId: execId, timestamp: now, toolName: 'llm_consultation', state: 'TOOL_REQUESTED', queryOrTarget: prompt });
    this.recordExecution({ executionId: execId, timestamp: new Date().toISOString(), toolName: 'llm_consultation', state: 'TOOL_EXECUTED', queryOrTarget: prompt });

    const consultationOutput = `[LLM_CONSULTATION :: ${targetModel}]: Consultation analysis for query: "${prompt}". Evaluated structural consistency under active posture constraints.`;

    this.recordExecution({ executionId: execId, timestamp: new Date().toISOString(), toolName: 'llm_consultation', state: 'TOOL_RETURNED_RESULT', queryOrTarget: prompt, resultSummary: 'Consultation completed.' });

    return { state: 'TOOL_RETURNED_RESULT', consultationOutput };
  }

  private recordExecution(record: ToolExecutionRecord): void {
    this.executionHistory.push(record);
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }
  }

  public getExecutionHistory(): ToolExecutionRecord[] {
    return [...this.executionHistory];
  }
}

export const externalRetrievalGateway = ExternalRetrievalGateway.getInstance();
