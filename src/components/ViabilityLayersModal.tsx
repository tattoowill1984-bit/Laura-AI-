import React from 'react';
import { X, Layers, CheckCircle2 } from 'lucide-react';

interface ViabilityLayersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ViabilityLayersModal: React.FC<ViabilityLayersModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const layers = [
    { num: '0', title: 'Thermodynamic Separation', desc: 'Establishes initial isolated state boundaries preventing non-equilibrium collapse.' },
    { num: '1', title: 'Boundary Regulation (Membrane)', desc: 'SHA-256 Observation Envelope forcing Capability ≠ Permission and Observation ≠ Truth.' },
    { num: '2', title: 'Observation / Sensing', desc: 'Filtered projections Ω(E) with Anti-Compression Lineage Receipts.' },
    { num: '3', title: 'Internal State (Epistemic Body)', desc: 'Tracks boundary health, confidence, authority, volatility, contradiction load, and friction.' },
    { num: '4', title: 'Prediction / Anticipation', desc: 'Echo & Shadow Simulator with mandatory Uncertainty Envelope (confidence bounds).' },
    { num: '5', title: 'Error Detection (Contradiction Kernel)', desc: 'First-class Error Objects that cannot be overwritten — only resolved or escalated.' },
    { num: '6', title: 'Adaptation (Governor)', desc: 'Rate-limited adaptation governed by current Boundary Health and Epistemic stability.' },
    { num: '7', title: 'Memory / Continuity (Anamnesis Ledger)', desc: 'Derivation ledger enforcing MemGate receipt validation prior to persistent writes.' },
    { num: '8', title: 'Action (Sentinel Governor Gate)', desc: 'Sole path to durable change requiring cryptographic Commit Receipts.' },
    { num: '9', title: 'Energy Management (Metabolism)', desc: 'Compute and attention budgets optimizing resource consumption.' },
    { num: '10', title: 'Repair / Maintenance', desc: 'Burn Log analysis and technical debt tracking generating repair candidates.' },
    { num: '11', title: 'Defense / Identity Protection', desc: 'Defensive postures: NORMAL → DUCK → RAPTOR → STONEWALL.' },
    { num: '12', title: 'Redundancy / Resilience', desc: 'PersistenceAnchor and Anti-Replay Ledger single-source-of-truth protection.' },
    { num: '13', title: 'Controlled Exploration', desc: 'Friction Map surfacing conceptual bottlenecks in controlled simulation chambers.' },
    { num: '14', title: 'Nested Systems (Cognitive Fabric)', desc: 'Roles (WILL, EINSTEIN, SABRINA, ECHO) operating as organs under constitutional law.' },
    { num: '15', title: 'Information Compression', desc: 'Anti-Compression receipts recording discarded data justifications.' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">15 Universal Viability Layers Substrate</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {layers.map((l) => (
            <div key={l.num} className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 font-mono text-xs font-bold flex items-center justify-center border border-purple-500/30">
                  {l.num}
                </span>
                <h3 className="text-xs font-bold text-slate-100">{l.title}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
