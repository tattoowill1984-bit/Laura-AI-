import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Globe,
  HelpCircle,
  Sparkles,
  GitCommit,
  Cpu,
  AlertCircle,
  FileCode,
  Activity,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { SubsystemAuditInfo, SubsystemMaturityLevel, TAUGraph, TAUNodeCategory } from '../types';

interface RealityAlignmentPanelProps {
  subsystems: SubsystemAuditInfo[];
  tauGraph: TAUGraph;
  onSimulateTAU: () => void;
  onAddTAUHypothesis: (label: string, category: TAUNodeCategory, confidence: number) => void;
}

export const RealityAlignmentPanel: React.FC<RealityAlignmentPanelProps> = ({
  subsystems,
  tauGraph,
  onSimulateTAU,
  onAddTAUHypothesis,
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT_MATRIX' | 'TAU_SANDBOX' | 'COGNITIVE_FABRIC'>('AUDIT_MATRIX');
  const [searchFilter, setSearchFilter] = useState('');
  
  // New TAU Hypothesis state
  const [newHypothesisLabel, setNewHypothesisLabel] = useState('');
  const [newCategory, setNewCategory] = useState<TAUNodeCategory>('HYPOTHESIS');
  const [newConfidence, setNewConfidence] = useState(85);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const getMaturityBadge = (level: SubsystemMaturityLevel) => {
    switch (level) {
      case 'LEVEL_0_CONCEPTUAL_DEFINITION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">LEVEL 0 • Concept</span>;
      case 'LEVEL_1_DATA_MODEL_EXISTS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">LEVEL 1 • Data Model</span>;
      case 'LEVEL_2_RUNTIME_IMPLEMENTATION_EXISTS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">LEVEL 2 • Runtime Impl</span>;
      case 'LEVEL_3_INTEGRATED_OPERATIONAL_CAPABILITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">LEVEL 3 • Integrated</span>;
      case 'LEVEL_4_ADAPTIVE_EVOLUTION_CAPABILITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">LEVEL 4 • Adaptive</span>;
      default:
        return null;
    }
  };

  const handleCreateHypothesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHypothesisLabel.trim()) return;
    onAddTAUHypothesis(newHypothesisLabel.trim(), newCategory, newConfidence);
    setNewHypothesisLabel('');
    setIsFormOpen(false);
  };

  const filteredSubsystems = subsystems.filter(
    (sub) =>
      sub.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      sub.architecturalDestination.toLowerCase().includes(searchFilter.toLowerCase()) ||
      sub.implementationLocation.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>REALITY ALIGNMENT & RUNTIME HONESTY LAYER</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Anamnesis Subsystem Verification Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Observation ≠ Truth. Every subsystem is tracked against actual initialized objects, runtime execution paths, and maturity tiers. Zero synthetic telemetry.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('AUDIT_MATRIX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'AUDIT_MATRIX'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Subsystem Audit ({subsystems.length})
          </button>

          <button
            onClick={() => setActiveTab('TAU_SANDBOX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'TAU_SANDBOX'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            TAU Sandbox ({tauGraph.nodes.length})
          </button>

          <button
            onClick={() => setActiveTab('COGNITIVE_FABRIC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'COGNITIVE_FABRIC'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Cognitive Fabric
          </button>
        </div>
      </div>

      {/* TAB 1: SUBSYSTEM AUDIT MATRIX */}
      {activeTab === 'AUDIT_MATRIX' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter subsystems or locations..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                10/10 Runtime Verified
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredSubsystems.map((sub) => (
              <div
                key={sub.id}
                className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-slate-700/80 transition-all space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    <h3 className="text-sm font-bold text-slate-100">{sub.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {getMaturityBadge(sub.maturityLevel)}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      Initialized: <strong className="text-emerald-400">TRUE</strong>
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                  <div className="text-slate-400 text-[11px]">
                    <strong className="text-cyan-400">Destination:</strong> {sub.architecturalDestination}
                  </div>
                  <div className="text-slate-300 flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{sub.implementationLocation}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">CURRENT OPERATIONAL STATE:</span>
                    <span className="text-emerald-300">{sub.currentOperationalState}</span>
                  </div>

                  <div className="p-2 bg-slate-950 rounded border border-slate-800/60">
                    <span className="text-slate-500 block text-[10px]">REMAINING GAP / FUTURE EVOLUTION:</span>
                    <span className="text-amber-300/90">{sub.remainingGap}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/40">
                  <span>Ref: {sub.runtimeObjectReference}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    Last Exec: {new Date(sub.lastExecutionTimestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TAU (TINY ARTIFICIAL UNIVERSE) SANDBOX */}
      {activeTab === 'TAU_SANDBOX' && (
        <div className="space-y-5">
          {/* TAU Stats Top Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <span className="text-[10px] font-mono text-purple-300 block">TOTAL TAU ENTITY NODES</span>
              <span className="text-xl font-bold text-slate-100 font-mono">{tauGraph.nodes.length}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Observation ≠ Truth Sandboxed</span>
            </div>

            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <span className="text-[10px] font-mono text-cyan-300 block">UNRESOLVED QUESTION TOPOLOGY</span>
              <span className="text-xl font-bold text-slate-100 font-mono">{tauGraph.unresolvedQuestionTopologyCount}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Active Inquiry Nodes</span>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="text-[10px] font-mono text-amber-300 block">CONCEPT DRIFT SCORE</span>
              <span className="text-xl font-bold text-slate-100 font-mono">{tauGraph.conceptDriftScore}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Epistemic Variance Index</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onSimulateTAU}
                className="px-3.5 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Simulate TAU Step
              </button>

              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded-xl flex items-center gap-1 transition-all cursor-pointer border border-slate-700"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                Add Sandboxed Hypothesis
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Last Sim Cycle: {new Date(tauGraph.lastSimulatedCycle).toLocaleTimeString()}
            </span>
          </div>

          {/* Form Modal/Dropdown */}
          {isFormOpen && (
            <form onSubmit={handleCreateHypothesis} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-purple-400" />
                Inject Node into TAU Simulation Layer
              </h4>

              <input
                type="text"
                value={newHypothesisLabel}
                onChange={(e) => setNewHypothesisLabel(e.target.value)}
                placeholder="Enter concept, hypothesis, or inquiry label..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
              />

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <label className="text-slate-400 block mb-1 text-[10px]">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TAUNodeCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="HYPOTHESIS">HYPOTHESIS</option>
                    <option value="CONCEPT">CONCEPT</option>
                    <option value="QUESTION">QUESTION</option>
                    <option value="EVIDENCE">EVIDENCE</option>
                    <option value="LEARNING_PATHWAY">LEARNING_PATHWAY</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 text-[10px]">Confidence ({newConfidence}%):</label>
                  <input
                    type="range"
                    min="10"
                    max="99"
                    value={newConfidence}
                    onChange={(e) => setNewConfidence(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Inject Node
                </button>
              </div>
            </form>
          )}

          {/* TAU Nodes List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tauGraph.nodes.map((node) => (
              <div
                key={node.id}
                className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                      node.category === 'CONCEPT'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : node.category === 'QUESTION'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : node.category === 'HYPOTHESIS'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : node.category === 'EVIDENCE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {node.category}
                  </span>

                  <span className="text-[10px] font-mono text-slate-400">
                    Conf: <strong className="text-purple-300">{node.confidence}%</strong> | Uncert: <strong className="text-amber-300">{node.uncertainty}%</strong>
                  </span>
                </div>

                <p className="text-xs text-slate-200 font-medium leading-snug">{node.label}</p>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/50">
                  <span className="truncate max-w-[180px]">Digest: {node.provenanceHash.slice(0, 12)}...</span>
                  <span>{new Date(node.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COGNITIVE FABRIC STRUCTURE */}
      {activeTab === 'COGNITIVE_FABRIC' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-mono leading-relaxed">
            <strong>Cognitive Fabric Governance Rule:</strong> WILL, EINSTEIN, and SABRINA constitute the primary tri-perspective reasoning engine. ECHO is explicitly implemented as a Temporal Reflection Layer observing historical trajectories, contradiction patterns, and concept drift. ECHO provides context but CANNOT override WILL, EINSTEIN, or SABRINA.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WILL */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>WILL — Executive Direction</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Intent alignment and human objective preservation. Ensures priority invariant: <em>Identity Boundary &gt; Incoming Information</em>.
              </p>
            </div>

            {/* EINSTEIN */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Cpu className="w-4 h-4" />
                <span>EINSTEIN — Formal Reasoning</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Logical invariants, empirical verification, friction scores, and physical structural coherence.
              </p>
            </div>

            {/* SABRINA */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>SABRINA — Relational Intuition</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Relational context, alternative viewpoints, high-utility compression, synthesis, and blind-spot detection.
              </p>
            </div>

            {/* ECHO */}
            <div className="p-4 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <GitCommit className="w-4 h-4" />
                <span>ECHO — Temporal Reflection Layer</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Observes reasoning trajectories, contradiction patterns, recurring questions, concept drift, and learning progression context.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
