import React, { useState, useEffect } from 'react';
import { X, Server, Globe, Cpu, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, Lock, RefreshCw, Sparkles, Terminal } from 'lucide-react';

interface GovernedMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  posture: string;
}

export const GovernedMigrationModal: React.FC<GovernedMigrationModalProps> = ({ isOpen, onClose, posture }) => {
  const [activeTab, setActiveTab] = useState<'MIGRATION' | 'WEB_RETRIEVAL'>('MIGRATION');
  const [runtimeMetrics, setRuntimeMetrics] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [proofSignature, setProofSignature] = useState('');
  const [webQuery, setWebQuery] = useState('Anamnesis Sentinel AI architecture 2026');
  const [webObservation, setWebObservation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRuntimeMetrics();
    }
  }, [isOpen]);

  const fetchRuntimeMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/migration/status');
      const data = await res.json();
      if (data.success) {
        setRuntimeMetrics(data.runtimeMetrics);
        setProposal(data.activeProposal);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch runtime metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateNorthStar = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/migration/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'Operator invoked North Star Decision Test evaluation' }),
      });
      const data = await res.json();
      if (data.success) {
        setEvaluation(data.evaluation);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message || 'Evaluation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConstructProposal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/migration/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Operator requested formal migration proposal' }),
      });
      const data = await res.json();
      if (data.success) {
        setProposal(data.proposal);
        setSuccessMsg(`Proposal ${data.proposal.proposalId} constructed successfully.`);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message || 'Proposal construction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteMigration = async () => {
    if (!proposal) return;
    if (!proofSignature.trim()) {
      setError('HumanAuthorizationProof signature is required to execute migration.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/migration/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.proposalId,
          humanProofSignature: proofSignature.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProposal(data.proposal);
        setSuccessMsg(`Migration proposal ${proposal.proposalId} verified and executed successfully.`);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message || 'Migration execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebRetrieval = async () => {
    if (!webQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/web-retrieval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: webQuery.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setWebObservation(data.observation);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message || 'Web retrieval failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Governed Migration & Web Retrieval Engine
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  REAL RUNTIME CAPABLE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Capability ≠ Permission | Observation ≠ Adoption | Enforced by Sentinel Governance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-5 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('MIGRATION')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'MIGRATION'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            Governed Self-Migration & North Star Test
          </button>
          <button
            onClick={() => setActiveTab('WEB_RETRIEVAL')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'WEB_RETRIEVAL'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Online Web Retrieval Adapter
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'MIGRATION' && (
            <div className="space-y-6">
              {/* Runtime Metrics Snapshot */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    Current Container Runtime Metrics
                  </h3>
                  <button
                    onClick={fetchRuntimeMetrics}
                    disabled={loading}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Metrics
                  </button>
                </div>

                {runtimeMetrics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 block">Node Runtime</span>
                      <span className="font-mono text-slate-100 font-semibold">{runtimeMetrics.nodeVersion} ({runtimeMetrics.platform})</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 block">Process Uptime</span>
                      <span className="font-mono text-slate-100 font-semibold">{runtimeMetrics.uptimeSeconds}s</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 block">Heap Memory</span>
                      <span className="font-mono text-slate-100 font-semibold">{runtimeMetrics.memoryUsageMb.heapUsed}MB / {runtimeMetrics.memoryUsageMb.heapTotal}MB</span>
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/60">
                      <span className="text-slate-400 block">Posture / Tier</span>
                      <span className="font-mono text-emerald-400 font-semibold">{runtimeMetrics.posture} ({runtimeMetrics.activeTier.split('_')[0]})</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Loading container metrics...</p>
                )}
              </div>

              {/* 9-Point North Star Decision Test */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    9-Point North Star Decision Framework
                  </h3>
                  <button
                    onClick={handleEvaluateNorthStar}
                    disabled={loading}
                    className="px-3 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    Run Decision Test
                  </button>
                </div>

                {evaluation && (
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-bold text-slate-200">Evaluation Recommendation:</span>
                      <span className={`px-2 py-0.5 rounded-full font-mono font-bold ${
                        evaluation.recommendation === 'MIGRATION_UNNECESSARY'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {evaluation.recommendation}
                      </span>
                    </div>
                    <p className="text-slate-300"><strong className="text-slate-400">Justification:</strong> {evaluation.justification}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-400 pt-2 border-t border-slate-800/60">
                      <div>• Current Problem: <span className="text-slate-200">{evaluation.currentProblem}</span></div>
                      <div>• Blocks North Star?: <span className="text-slate-200">{evaluation.isBlockingNorthStar ? 'YES' : 'NO'}</span></div>
                      <div>• Solvable Without Migration?: <span className="text-slate-200">{evaluation.canSolveWithoutMigration ? 'YES' : 'NO'}</span></div>
                      <div>• Doing Nothing Preferable?: <span className="text-slate-200">{evaluation.isDoingNothingPreferable ? 'YES' : 'NO'}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Proposal Construction & Execution */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    Formal Migration Proposal & Authorization Gate
                  </h3>
                  <button
                    onClick={handleConstructProposal}
                    disabled={loading}
                    className="px-3 py-1.5 bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Construct Migration Proposal
                  </button>
                </div>

                {proposal && (
                  <div className="space-y-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-300 font-bold">ID: {proposal.proposalId}</span>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded font-semibold">
                        {proposal.authorizationState}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-400 font-bold">Proposed Migration Steps:</p>
                      {proposal.planSteps.map((step: any) => (
                        <div key={step.stepNumber} className="flex items-start gap-2 text-slate-300 bg-slate-950/40 p-2 rounded border border-slate-800/40">
                          <span className="font-mono text-cyan-400 shrink-0">{step.stepNumber}.</span>
                          <div>
                            <span className="font-semibold text-slate-200">{step.name}</span> — {step.description}
                            {step.isIrreversible && <span className="ml-2 text-rose-400 text-[10px] font-bold">[IRREVERSIBLE STEP]</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {proposal.authorizationState === 'REQUIRES_HUMAN_PROOF' && (
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <label className="block text-slate-300 font-semibold">
                          HumanAuthorizationProof Signature required for execution:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={proofSignature}
                            onChange={(e) => setProofSignature(e.target.value)}
                            placeholder="Type HumanAuthorizationProof signature (e.g. PROOF_WILL_AUTHORIZE_MIGRATION)"
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                          />
                          <button
                            onClick={handleExecuteMigration}
                            disabled={loading || !proofSignature.trim()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            Execute Migration
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'WEB_RETRIEVAL' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Live Web Retrieval & SHA-256 Quarantine Evidence Test
                </h3>
                <p className="text-xs text-slate-400">
                  Executes genuine external HTTP web search across live APIs (Wikipedia, DuckDuckGo, Grounding), hashes the result with SHA-256, and stores it as a QUARANTINED_OBSERVATION in the Merkle Evidence DAG.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webQuery}
                    onChange={(e) => setWebQuery(e.target.value)}
                    placeholder="Enter search query..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleTestWebRetrieval}
                    disabled={loading || !webQuery.trim()}
                    className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-4 h-4" />
                    Execute Search
                  </button>
                </div>

                {webObservation && (
                  <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-bold text-slate-200">Observation ID: {webObservation.observationId}</span>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded font-mono font-semibold">
                        {webObservation.quarantineState}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-cyan-400">
                      SHA-256 Hash: {webObservation.sha256Hash}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/60">
                      <span className="font-bold text-slate-300">Retrieved External Hits ({webObservation.results.length}):</span>
                      {webObservation.results.map((res: any, idx: number) => (
                        <div key={idx} className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50 space-y-1">
                          <a href={res.url} target="_blank" rel="noopener noreferrer" className="font-bold text-cyan-300 hover:underline block">
                            {res.title}
                          </a>
                          <p className="text-slate-300">{res.snippet}</p>
                          <span className="text-[10px] text-slate-500 block font-mono">Source: {res.source} | URL: {res.url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
