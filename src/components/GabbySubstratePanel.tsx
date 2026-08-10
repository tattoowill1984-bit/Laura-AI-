import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  GitBranch,
  Cpu,
  AlertTriangle,
  RefreshCw,
  Plus,
  Lock,
  CheckCircle2,
  FileCode,
  Layers,
  Sparkles,
  BookOpen,
  Activity,
  Award,
  Zap,
  Scale,
  Clock,
  Compass,
  Sliders,
  Shield,
  Search,
} from 'lucide-react';

export interface UncertaintyHeatMap {
  facts: number;
  assumptions: number;
  predictions: number;
  causalLinks: number;
  missingEvidence: number;
}

export interface EpistemicMetrics {
  confidence: number;
  evidenceStrength: number;
  authority: number;
  uncertainty: number;
  novelty: number;
  bayesianPrior?: number;
  bayesianPosterior?: number;
  uncertaintyHeatMap?: UncertaintyHeatMap;
}

export interface CounterfactualHypothesis {
  hypothesisId: string;
  claimId: string;
  competingTheory: string;
  falsificationCondition: string;
  plausibilityScore: number;
}

export interface CausalSimulationResult {
  action: string;
  target: string;
  simulatedRiskScore: number;
  potentialFailureModes: string[];
  expectedConsequences: string[];
  digitalTwinVerdict: 'RECOMMENDED' | 'PROCEED_WITH_CAUTION' | 'REJECTED_HIGH_RISK';
}

export interface ToolCalibration {
  toolId: string;
  totalExecutions: number;
  successfulExecutions: number;
  calibratedAuthority: number;
  accuracyPercentage: number;
}

export interface MemoryDecayAudit {
  artifactId: string;
  type: string;
  initialStrength: number;
  decayedStrength: number;
  reinforcementCount: number;
  sourceTier: string;
}

export interface OperationalGuarantee {
  component: string;
  implementation: string;
  guarantee: string;
  status: string;
  details: string;
}

export interface GabbySubstrateAudit {
  evalStatus: string;
  merkleDagIntegrity: string;
  kmsAudit: Array<{ timestamp: number; action: string; details: string }>;
  registeredPrompts: Array<{ artifactId: string; version: string; content: string; contentHash: string }>;
  dagNodes: Array<{
    artifact: {
      artifactId: string;
      artifactType: string;
      payload: any;
      metrics: EpistemicMetrics;
      parentIds: string[];
      sourceTier?: string;
      lastReinforcedAt?: number;
      reinforcementCount?: number;
    };
    parentMerkleHashes: string[];
    kid: string;
    hmacSignature: string;
    merkleHash: string;
  }>;
  irClaims: Array<{
    claimId: string;
    artifactType: string;
    causalParents: string[];
    payload: any;
    metrics: EpistemicMetrics;
    sourceTier?: string;
  }>;
  contradictions: Array<{ code: string; claimId: string; detail: string }>;
  counterfactuals?: CounterfactualHypothesis[];
  causalSimulation?: CausalSimulationResult | null;
  explanationGraph?: Record<string, string> | null;
  memoryDecayAudits?: MemoryDecayAudit[];
  toolTrustCalibrations?: ToolCalibration[];
  operationalGuarantees?: OperationalGuarantee[];
  governanceStatus: string;
  governanceReason: string;
}

export const GabbySubstratePanel: React.FC = () => {
  const [auditData, setAuditData] = useState<GabbySubstrateAudit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [newClaimContent, setNewClaimContent] = useState<string>('');
  const [authorityRating, setAuthorityRating] = useState<number>(0.9);
  const [sourceTier, setSourceTier] = useState<string>('PEER_REVIEWED_PAPER');
  const [selectedExplanationLevel, setSelectedExplanationLevel] = useState<string>('UNDERGRADUATE');
  const [customExplanationText, setCustomExplanationText] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'guarantees' | 'pipeline' | 'bayesian' | 'decay' | 'simulation' | 'explanations' | 'heatmap' | 'trust' | 'kms'>('guarantees');
  const [isReinforcing, setIsReinforcing] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchSubstrate = async () => {
    try {
      const res = await fetch('/api/gabby/substrate');
      if (res.ok) {
        const data: GabbySubstrateAudit = await res.json();
        setAuditData(data);
      }
    } catch (err) {
      console.warn('Gabby substrate fetch pending backend readiness');
    } finally {
      setLoading(false);
    }
  };

  const handleRotateKms = async () => {
    try {
      setActionFeedback('Rotating KMS key...');
      const res = await fetch('/api/gabby/kms/rotate', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionFeedback(`Success! Rotated key to ${data.newKid}`);
        await fetchSubstrate();
      }
    } catch (err) {
      setActionFeedback('KMS rotation failed.');
    }
  };

  const handleMintCapability = async () => {
    try {
      setActionFeedback('Minting capability token...');
      const res = await fetch('/api/gabby/capability/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantedTo: 'interactive_auditor', namespaces: ['cap:telemetry', 'cap:diagnostics', 'cap:replay'] }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionFeedback(`Success! Minted token ${data.token.tokenId}`);
        await fetchSubstrate();
      }
    } catch (err) {
      setActionFeedback('Capability token mint failed.');
    }
  };

  const handleRunReplay = async () => {
    try {
      setActionFeedback('Running Replay Harness evaluation...');
      const res = await fetch('/api/gabby/replay/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setActionFeedback(`Replay complete! Status: ${data.replay.evalStatus}, Merkle: ${data.replay.merkleDagIntegrity}`);
        await fetchSubstrate();
      }
    } catch (err) {
      setActionFeedback('Replay run failed.');
    }
  };

  useEffect(() => {
    fetchSubstrate();
    const interval = setInterval(fetchSubstrate, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleReinforceMemory = async (artifactId: string, type: string) => {
    setIsReinforcing(artifactId);
    try {
      const res = await fetch('/api/gabby/reinforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId, type }),
      });
      if (res.ok) {
        await fetchSubstrate();
      }
    } catch (err) {
      console.error('Memory reinforcement error:', err);
    } finally {
      setIsReinforcing(null);
    }
  };

  const handleFetchExplanation = async (level: string) => {
    setSelectedExplanationLevel(level);
    try {
      const res = await fetch('/api/gabby/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomExplanationText(data.explanation);
      }
    } catch (err) {
      console.error('Explanation fetch error:', err);
    }
  };

  const handleToolTrustTest = async (toolId: string, success: boolean) => {
    try {
      const res = await fetch('/api/gabby/trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, success }),
      });
      if (res.ok) {
        await fetchSubstrate();
      }
    } catch (err) {
      console.error('Trust test error:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 animate-pulse">
        <Cpu className="w-8 h-8 text-purple-400 mx-auto mb-2 animate-spin" />
        <p className="text-sm font-mono">Loading Laura Reasoning Compiler & Cognitive Substrate...</p>
      </div>
    );
  }

  const primaryClaim = auditData?.irClaims?.[auditData.irClaims.length - 1];
  const activeExplanation = customExplanationText || auditData?.explanationGraph?.[selectedExplanationLevel] || 'Explanation compiled dynamically.';

  return (
    <div className="space-y-6">
      {/* Substrate Header Banner */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <GitBranch className="w-48 h-48 text-purple-400" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-purple-500/20 border border-purple-500/40 rounded-2xl text-purple-300 shadow-lg shadow-purple-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">Laura Cognitive Substrate V2</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  REASONING COMPILER CENTRAL
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Centralized Architecture: Observation → Parser → Typed IR → Reasoning Compiler (Counterfactuals) → Policy Governor → Natural Language Generator.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Deterministic Policy Governor</div>
              <div
                className={`text-xs font-bold font-mono flex items-center justify-end gap-1.5 ${
                  auditData?.governanceStatus === 'PASSED' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {auditData?.governanceStatus === 'PASSED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {auditData?.governanceStatus}
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2 text-right">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Merkle DAG Integrity</div>
              <div className="text-xs font-bold font-mono text-purple-300 flex items-center justify-end gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                {auditData?.merkleDagIntegrity}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs across the 8 Reasoning Compiler Capabilities */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('guarantees')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'guarantees'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          Operational Guarantees Matrix
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'pipeline'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          Pipeline & Counterfactuals
        </button>

        <button
          onClick={() => setActiveTab('bayesian')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'bayesian'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          Bayesian & Source Tiers
        </button>

        <button
          onClick={() => setActiveTab('decay')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'decay'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Temporal Memory Decay
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'simulation'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Causal Twin Sandbox
        </button>

        <button
          onClick={() => setActiveTab('explanations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'explanations'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Explanation Compiler
        </button>

        <button
          onClick={() => setActiveTab('heatmap')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'heatmap'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Uncertainty Heatmap
        </button>

        <button
          onClick={() => setActiveTab('trust')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'trust'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Trust Calibration
        </button>

        <button
          onClick={() => setActiveTab('kms')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'kms'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          Hardware KMS & Ledger
        </button>
      </div>

      {/* Tab 0: Operational Guarantees Matrix & Cryptographic Verification Suite */}
      {activeTab === 'guarantees' && (
        <div className="space-y-6">
          {/* Header Action Suite */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Cognitive Substrate Operational Guarantees
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  8-Tier Mathematical & Cryptographic Assurance Framework governing Gabby and Anamnesis Sentinel execution.
                </p>
              </div>

              {/* Interactive Execution Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRotateKms}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Key className="w-3.5 h-3.5" />
                  Rotate KMS Key
                </button>
                <button
                  onClick={handleMintCapability}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Mint Capability Token
                </button>
                <button
                  onClick={handleRunReplay}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Run Replay Harness
                </button>
              </div>
            </div>

            {actionFeedback && (
              <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl text-xs font-mono text-purple-300 flex items-center justify-between animate-fadeIn mb-4">
                <span>{actionFeedback}</span>
                <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">×</button>
              </div>
            )}

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                    <th className="py-3 px-4 font-semibold">Component</th>
                    <th className="py-3 px-4 font-semibold">Technical Implementation</th>
                    <th className="py-3 px-4 font-semibold">Operational Guarantee</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold">Telemetry & Verified State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {(auditData?.operationalGuarantees || [
                    {
                      component: 'Key Management (KMS)',
                      implementation: 'Rotatable Key Storage with Key IDs (KID)',
                      guarantee: 'Signing keys are not hardcoded in source. Historical nodes stay verifiable across key rotations.',
                      status: 'ACTIVE',
                      details: `Active KID: ${auditData?.kmsAudit?.[auditData.kmsAudit.length - 1]?.details || 'kid-2026-q3-001'}`,
                    },
                    {
                      component: 'Capability Guard (CBAC)',
                      implementation: 'HMAC-signed CapabilityToken with namespaces',
                      guarantee: 'Prevents unauthorized tool execution and capability escalation.',
                      status: 'ENFORCED',
                      details: 'Enforcing cap:telemetry, cap:diagnostics, cap:reboot',
                    },
                    {
                      component: 'Formal Artifacts',
                      implementation: 'Immutable FormalArtifact & EpistemicMetrics',
                      guarantee: 'Replaces untyped runtime objects with strictly validated structures.',
                      status: 'VALIDATED',
                      details: `Strict ADT Schema V2.0 | Total Formal Artifacts: ${auditData?.dagNodes?.length || 0}`,
                    },
                    {
                      component: 'Merkle Evidence DAG',
                      implementation: 'Parent-linked SHA-256 Merkle hashes',
                      guarantee: 'Any alteration of payload data or lineage invalidates the graph hash.',
                      status: auditData?.merkleDagIntegrity === 'VALID' ? 'VERIFIED' : 'CORRUPTED',
                      details: `SHA-256 Hash Verification: ${auditData?.merkleDagIntegrity}`,
                    },
                    {
                      component: 'Immutable Ledger',
                      implementation: 'Append-only store with Merkle indexing',
                      guarantee: 'Guarantees deterministic state ordering for full auditability.',
                      status: 'APPEND_ONLY',
                      details: `Total Merkle Nodes: ${auditData?.dagNodes?.length || 0} | Indexing: Deterministic Sequence`,
                    },
                    {
                      component: 'Reasoning Compiler',
                      implementation: 'Intermediate Representation (TypedIRClaim)',
                      guarantee: 'Decouples logical reasoning from natural language generation.',
                      status: 'COMPILED',
                      details: `Typed IR Claims Compiled: ${auditData?.irClaims?.length || 0}`,
                    },
                    {
                      component: 'Policy Invariants',
                      implementation: 'Code assertions over IR state',
                      guarantee: 'Blocks ungrounded high-confidence statements before execution.',
                      status: auditData?.governanceStatus === 'PASSED' ? 'PASSED' : 'HALTED',
                      details: auditData?.governanceReason || 'All policy checks enforced.',
                    },
                    {
                      component: 'Replay Harness',
                      implementation: 'End-to-end replay engine',
                      guarantee: 'Validates full system state, prompt byte hashes, and cryptographic graph integrity.',
                      status: auditData?.evalStatus === 'SUCCESS' ? 'HEALTHY' : 'FAILED',
                      details: `Audit Status: ${auditData?.evalStatus}`,
                    },
                  ]).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-purple-300 font-mono whitespace-nowrap">
                        {item.component}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-medium">
                        {item.implementation}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-[11px] leading-relaxed max-w-md">
                        {item.guarantee}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                            item.status === 'ACTIVE' || item.status === 'ENFORCED' || item.status === 'VALIDATED' || item.status === 'VERIFIED' || item.status === 'APPEND_ONLY' || item.status === 'COMPILED' || item.status === 'PASSED' || item.status === 'HEALTHY'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {item.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Pipeline & Counterfactual Reasoning Engine */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Centralized Pipeline Diagram */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-purple-400" />
              Centralized Pipeline Execution Flow
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-center">
              <div className="p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Step 1</div>
                <div className="text-xs font-bold text-slate-200 mt-1">Observation</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Raw user or telemetry input</div>
              </div>

              <div className="p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Step 2</div>
                <div className="text-xs font-bold text-slate-200 mt-1">Parser</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Extracts entities & bounds</div>
              </div>

              <div className="p-3 bg-purple-950/40 border border-purple-500/50 rounded-xl shadow-lg shadow-purple-500/10">
                <div className="text-[10px] font-mono text-purple-300 uppercase">Step 3</div>
                <div className="text-xs font-bold text-purple-200 mt-1">Typed IR</div>
                <div className="text-[10px] text-purple-400 mt-0.5">Structured ADT Claims</div>
              </div>

              <div className="p-3 bg-purple-900/60 border border-purple-400 rounded-xl shadow-lg shadow-purple-500/20 ring-1 ring-purple-400/50">
                <div className="text-[10px] font-mono text-purple-200 uppercase font-bold">CORE STEP 4</div>
                <div className="text-xs font-bold text-white mt-1">Reasoning Compiler</div>
                <div className="text-[10px] text-purple-200 mt-0.5">Counterfactuals & DAG</div>
              </div>

              <div className="p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Step 5</div>
                <div className="text-xs font-bold text-slate-200 mt-1">Policy Governor</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Deterministic Invariants</div>
              </div>

              <div className="p-3 bg-slate-950/90 border border-purple-500/30 rounded-xl">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Step 6</div>
                <div className="text-xs font-bold text-slate-200 mt-1">LLM NLG Generator</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Gabby Verified Synthesis</div>
              </div>
            </div>
          </div>

          {/* Counterfactual Hypotheses Engine */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  Counterfactual Reasoning Engine (Anti-Tunnel Vision)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automatically generates competing hypotheses to ask: "What evidence would make this conclusion false?"
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                {auditData?.counterfactuals?.length || 0} Hypotheses Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auditData?.counterfactuals?.map((hyp) => (
                <div key={hyp.hypothesisId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-purple-400 uppercase px-2 py-0.5 bg-purple-950/60 rounded border border-purple-800">
                      Target: {hyp.claimId}
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      Plausibility: {(hyp.plausibilityScore * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div>
                    <div className="text-xs font-bold text-slate-200">Competing Theory:</div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      {hyp.competingTheory}
                    </p>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Search className="w-3 h-3 text-purple-400" />
                      Falsification Condition:
                    </div>
                    <p className="text-xs font-mono text-purple-300 mt-0.5">{hyp.falsificationCondition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Bayesian Belief Manager & Scientific Evidence Ranking */}
      {activeTab === 'bayesian' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scientific Evidence Source Tiers */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                Scientific Evidence Ranking Tiers
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                Gabby differentiates evidence sources to weight conclusions with mathematical rigor rather than naive trust:
              </p>

              <div className="space-y-2">
                {[
                  { name: 'Peer-Reviewed Paper', tier: 'PEER_REVIEWED_PAPER', weight: '1.00', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
                  { name: 'Government Publication', tier: 'GOVERNMENT_PUB', weight: '0.90', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
                  { name: 'Academic Textbook', tier: 'TEXTBOOK', weight: '0.85', color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10' },
                  { name: 'Expert Verified', tier: 'EXPERT_VERIFIED', weight: '0.80', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
                  { name: 'News Article', tier: 'NEWS_ARTICLE', weight: '0.60', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                  { name: 'Social Media', tier: 'SOCIAL_MEDIA', weight: '0.30', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
                  { name: 'Anonymous Web Page', tier: 'ANONYMOUS_WEB', weight: '0.15', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
                ].map((item) => (
                  <div key={item.tier} className={`flex items-center justify-between p-2.5 rounded-xl border ${item.color}`}>
                    <span className="text-xs font-medium">{item.name}</span>
                    <span className="text-xs font-mono font-bold">Weight {item.weight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bayesian Posterior Belief Manager */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-400" />
                Bayesian Belief Distributions P(H|E)
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                Maintains dynamic probability distributions that update as new observations arrive:
              </p>

              {auditData?.irClaims?.map((claim) => (
                <div key={claim.claimId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-purple-300 font-bold">{claim.claimId}</span>
                    <span className="text-slate-400 text-[10px] uppercase">{claim.sourceTier || 'EXPERT_VERIFIED'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">Prior P(H)</div>
                      <div className="font-mono font-bold text-slate-200">
                        {((claim.metrics.bayesianPrior || 0.5) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-purple-950/50 p-2 rounded border border-purple-800">
                      <div className="text-[10px] text-purple-300">Posterior P(H|E)</div>
                      <div className="font-mono font-bold text-purple-200">
                        {((claim.metrics.bayesianPosterior || claim.metrics.confidence) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(claim.metrics.bayesianPosterior || claim.metrics.confidence) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Temporal Memory Decay & Reinforcement */}
      {activeTab === 'decay' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                Temporal Memory Decay & Reinforcement Engine
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Knowledge decays via exponential half-life function unless reinforced by repeated observation, user confirmation, or external verification.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auditData?.memoryDecayAudits?.map((item) => (
              <div key={item.artifactId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-300">{item.artifactId}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Reinforced {item.reinforcementCount}x
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="text-[10px] text-slate-400">Initial Strength</div>
                    <div className="font-mono font-bold text-slate-200">{(item.initialStrength * 100).toFixed(1)}%</div>
                  </div>

                  <div className="bg-purple-950/40 p-2.5 rounded border border-purple-800">
                    <div className="text-[10px] text-purple-300">Current Decayed Strength</div>
                    <div className="font-mono font-bold text-purple-200">{(item.decayedStrength * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    disabled={isReinforcing === item.artifactId}
                    onClick={() => handleReinforceMemory(item.artifactId, 'USER_CONFIRMATION')}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReinforcing === item.artifactId ? 'animate-spin' : ''}`} />
                    Reinforce Memory (+25%)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Causal Simulation Sandbox (Digital Twin) */}
      {activeTab === 'simulation' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" />
              Causal Simulation Sandbox (Digital Twin)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates outcomes, estimates risk scores, and detects failure modes before state commitment.
            </p>
          </div>

          {auditData?.causalSimulation ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs text-slate-400 font-mono">Action Under Digital Twin Simulation:</div>
                  <div className="text-sm font-bold text-purple-300 mt-0.5">
                    {auditData.causalSimulation.action} → {auditData.causalSimulation.target}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-mono">Simulated Risk Score</div>
                    <div className="text-sm font-bold font-mono text-amber-400">
                      {auditData.causalSimulation.simulatedRiskScore}/100
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {auditData.causalSimulation.digitalTwinVerdict}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Potential Failure Modes Identified
                  </div>
                  <ul className="space-y-1">
                    {auditData.causalSimulation.potentialFailureModes.map((fm, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-slate-500">•</span>
                        {fm}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Expected System Consequences
                  </div>
                  <ul className="space-y-1">
                    {auditData.causalSimulation.expectedConsequences.map((ec, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                        <span className="text-slate-500">•</span>
                        {ec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 p-4 bg-slate-950 rounded-xl text-center">
              No active action simulation running. Submit a prompt or claim to trigger the Digital Twin Sandbox.
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Formal Explanation Compiler */}
      {activeTab === 'explanations' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              Formal Explanation Compiler (6 Abstraction Levels)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Renders explanations for any reasoning step across 6 distinct audience levels derived from the exact same evidence graph:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['ELI5', 'STUDENT', 'UNDERGRADUATE', 'GRADUATE', 'RESEARCHER', 'ENGINEER'].map((level) => (
              <button
                key={level}
                onClick={() => handleFetchExplanation(level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  selectedExplanationLevel === level
                    ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-5 shadow-inner space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Target Claim: {primaryClaim?.claimId || 'Active Observation'}</span>
              <span className="text-purple-400 font-bold">Level: {selectedExplanationLevel}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              {activeExplanation}
            </p>
          </div>
        </div>
      )}

      {/* Tab 6: Granular Uncertainty Heat Map */}
      {activeTab === 'heatmap' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Granular Uncertainty Heat Map
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deconstructs uncertainty across 5 explicit dimensions rather than relying on a single scalar value:
            </p>
          </div>

          <div className="space-y-4">
            {auditData?.irClaims?.map((claim) => {
              const hm: UncertaintyHeatMap = claim.metrics.uncertaintyHeatMap || {
                facts: 0.05,
                assumptions: 0.12,
                predictions: 0.18,
                causalLinks: 0.08,
                missingEvidence: 0.10,
              };

              return (
                <div key={claim.claimId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-purple-300">{claim.claimId}</span>
                    <span className="text-slate-400">Total Uncertainty: {(claim.metrics.uncertainty * 100).toFixed(0)}%</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {[
                      { label: 'Facts', val: hm.facts },
                      { label: 'Assumptions', val: hm.assumptions },
                      { label: 'Predictions', val: hm.predictions },
                      { label: 'Causal Links', val: hm.causalLinks },
                      { label: 'Missing Evidence', val: hm.missingEvidence },
                    ].map((item) => (
                      <div key={item.label} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80 text-center">
                        <div className="text-[10px] text-slate-400 font-mono">{item.label}</div>
                        <div className="text-xs font-mono font-bold text-purple-300 mt-1">{(item.val * 100).toFixed(1)}%</div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                          <div className="bg-purple-400 h-full rounded-full" style={{ width: `${item.val * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 7: Trust Calibration Engine */}
      {activeTab === 'trust' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Tool Trust Calibration Engine
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks tool and sensor reliability over time and dynamically recalibrates effective authority:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {auditData?.toolTrustCalibrations?.map((tool) => (
              <div key={tool.toolId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-purple-300">{tool.toolId}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{tool.accuracyPercentage}% Accuracy</span>
                </div>

                <div className="text-xs text-slate-400">
                  Executions: <span className="font-mono text-slate-200">{tool.successfulExecutions}/{tool.totalExecutions}</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Calibrated Authority</span>
                  <span className="text-xs font-mono font-bold text-purple-200">{tool.calibratedAuthority}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleToolTrustTest(tool.toolId, true)}
                    className="flex-1 py-1 text-[11px] rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 hover:bg-emerald-900"
                  >
                    + Success
                  </button>
                  <button
                    onClick={() => handleToolTrustTest(tool.toolId, false)}
                    className="flex-1 py-1 text-[11px] rounded bg-rose-950/60 text-rose-400 border border-rose-800 hover:bg-rose-900"
                  >
                    + Failure
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: Hardware KMS & Ledger */}
      {activeTab === 'kms' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400" />
              Hardware KMS Audit Trail
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {auditData?.kmsAudit?.map((log, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-400">{log.action}</span>
                  <span className="text-slate-300">{log.details}</span>
                  <span className="text-[10px] text-slate-500">{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
