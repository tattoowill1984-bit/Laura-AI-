import React, { useState } from 'react';
import { X, FileCheck, ShieldAlert, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Proposal } from '../types';

interface ProposalApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: Proposal[];
  onExecuteProposal: (proposalId: string, proofSignature: string) => Promise<{ success: boolean; message: string }>;
}

export const ProposalApprovalModal: React.FC<ProposalApprovalModalProps> = ({
  isOpen,
  onClose,
  proposals,
  onExecuteProposal,
}) => {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(proposals[0] || null);
  const [proofSignature, setProofSignature] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const pendingProposals = proposals.filter((p) => p.status === 'PROPOSAL_PENDING_HUMAN_PROOF');
  const activeProposal = selectedProposal || pendingProposals[0] || proposals[0];

  const handleExecute = async () => {
    if (!activeProposal || !proofSignature.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);

    const res = await onExecuteProposal(activeProposal.id, proofSignature.trim());
    setIsSubmitting(false);
    setFeedback(res);

    if (res.success) {
      setTimeout(() => {
        setFeedback(null);
      }, 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">
              HumanAuthorizationProof Gate ({pendingProposals.length} Pending Proposals)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Proposal List Sidebar */}
          <div className="space-y-2 border-r border-slate-800 pr-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Proposals</h3>
            {proposals.length === 0 ? (
              <p className="text-xs text-slate-500">No proposals available.</p>
            ) : (
              proposals.map((p) => {
                const isSelected = activeProposal?.id === p.id;
                const isSystemAuto = p.generatedBy === 'AUTONOMOUS_HEALTH_LOOP';

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProposal(p);
                      setFeedback(null);
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    } ${isSystemAuto ? 'border-amber-500/30' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 truncate max-w-[120px]">{p.id}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          p.status === 'EXECUTED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {p.status === 'EXECUTED' ? 'EXECUTED' : 'PENDING'}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{p.title}</h4>
                    {isSystemAuto && (
                      <span className="text-[9px] text-amber-400 font-mono flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" /> System Self-Repair Proposal
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Proposal Detail & Execution Panel */}
          {activeProposal ? (
            <div className="col-span-2 space-y-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono text-purple-400">{activeProposal.targetTier}</span>
                    <h3 className="text-base font-bold text-slate-100">{activeProposal.title}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{activeProposal.timestamp.split('T')[0]}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{activeProposal.description}</p>

                {/* Cognitive Fabric Breakdown */}
                <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-cyan-400 font-mono">3-Node Perspective Fabric Analysis:</h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <strong className="text-cyan-400 block">WILL:</strong>
                      <span className="text-slate-400">{activeProposal.fabric.WILL}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <strong className="text-emerald-400 block">EINSTEIN:</strong>
                      <span className="text-slate-400">{activeProposal.fabric.EINSTEIN}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <strong className="text-purple-400 block">SABRINA:</strong>
                      <span className="text-slate-400">{activeProposal.fabric.SABRINA}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800">
                      <strong className="text-amber-400 block">ECHO:</strong>
                      <span className="text-slate-400">{activeProposal.fabric.ECHO}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Proof Form */}
              {activeProposal.status !== 'EXECUTED' ? (
                <div className="p-4 bg-slate-950 rounded-xl border border-amber-500/30 space-y-3">
                  <label className="block text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    HumanAuthorizationProof Signature Required:
                  </label>
                  <input
                    type="text"
                    value={proofSignature}
                    onChange={(e) => setProofSignature(e.target.value)}
                    placeholder="Enter cryptographic proof signature (e.g. PROOF-HUMAN-...)"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Mandatory Invariant: Neither Tier 1, Tier 2, nor Tier 3 mutations can execute without a unique, non-replayed HumanAuthorizationProof signature.
                  </p>

                  <button
                    onClick={handleExecute}
                    disabled={isSubmitting || !proofSignature.trim()}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>{isSubmitting ? 'Verifying Proof...' : 'Execute Mutation & Record Commit Receipt'}</span>
                  </button>

                  {feedback && (
                    <div
                      className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                        feedback.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      <span>{feedback.message}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Proposal Executed. Cryptographic Commit Receipt created and bound to PersistenceAnchor.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="col-span-2 text-center text-slate-500 py-12 text-xs">
              Select a proposal from the left sidebar to view details and apply HumanAuthorizationProof.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
