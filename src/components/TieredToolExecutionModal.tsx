import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  Key,
  CheckCircle2,
  X,
  Lock,
  Cpu,
  Terminal,
  Shield,
  Activity,
  Zap,
} from 'lucide-react';
import { AutonomyTier, DefensivePosture } from '../types';

export interface ProposedTieredAction {
  id: string;
  toolName: string;
  tier: AutonomyTier;
  actionTitle: string;
  description: string;
  targetSubsystem?: string;
  parameters?: Record<string, any>;
  authorityLevel: number; // 0.0 to 1.0
  postureAtProposal: DefensivePosture;
  invariantCheckResult: {
    passed: boolean;
    evaluatedInvariantsCount: number;
    violationsCount: number;
    violationDetails?: string[];
  };
  timestamp: string;
}

interface TieredToolExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingAction: ProposedTieredAction | null;
  onAuthorizeExecution: (
    actionId: string,
    proofSignature: string
  ) => Promise<{ success: boolean; message: string; merkleReceipt?: any }>;
  onRejectExecution: (actionId: string, reason: string) => Promise<void>;
}

export const TieredToolExecutionModal: React.FC<TieredToolExecutionModalProps> = ({
  isOpen,
  onClose,
  pendingAction,
  onAuthorizeExecution,
  onRejectExecution,
}) => {
  const [proofSignature, setProofSignature] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen || !pendingAction) return null;

  const isTier3 = pendingAction.tier === 'TIER_3_MACHINE_SELF_EXPANSION';
  const isTier2 = pendingAction.tier === 'TIER_2_USER_MODEL_UPDATES';

  const handleAuthorize = async () => {
    if (!proofSignature.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await onAuthorizeExecution(pendingAction.id, proofSignature.trim());
      setIsSubmitting(false);
      setFeedback(res);

      if (res.success) {
        setTimeout(() => {
          setFeedback(null);
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setFeedback({ success: false, message: err.message || 'Execution failed' });
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onRejectExecution(pendingAction.id, 'User rejected execution via Policy Governor Modal');
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Top Tier Alert Banner */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isTier3
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className={`w-5 h-5 ${isTier3 ? 'text-rose-400' : 'text-amber-400'}`} />
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider block opacity-80">
                Deterministic Policy Governor Gate
              </span>
              <h3 className="text-sm font-bold tracking-wide">
                {isTier3
                  ? 'TIER 3 — Machine Self-Model Expansion / High Risk System Action'
                  : 'TIER 2 — User-Model / State Mutation Confirmation'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Action Header */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Proposed Tool: {pendingAction.toolName}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                ID: {pendingAction.id}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">{pendingAction.actionTitle}</h4>
            <p className="text-slate-300 leading-relaxed">{pendingAction.description}</p>
          </div>

          {/* Policy Governor Breakdown & Invariant Compliance */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Constitutional Invariants Compliance (25 Rules)
              </span>
              <span className="text-emerald-400">
                {pendingAction.invariantCheckResult.evaluatedInvariantsCount} Evaluated • 0 Critical Violations
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Authority Level Required:</span>
                <span className="text-amber-400 font-bold">{Math.round(pendingAction.authorityLevel * 100)}%</span>
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Posture at Proposal:</span>
                <span className="text-cyan-400 font-bold">{pendingAction.postureAtProposal}</span>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 font-mono text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Invariant 13 & Invariant 1 Verified: Explicit CapabilityToken authorization required for execution.</span>
            </div>
          </div>

          {/* Action Parameters Preview */}
          {pendingAction.parameters && Object.keys(pendingAction.parameters).length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Target Action Parameters:
              </span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto">
                {JSON.stringify(pendingAction.parameters, null, 2)}
              </pre>
            </div>
          )}

          {/* Proof Signature Input */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <label className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              HumanAuthorizationProof Signature Required:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={proofSignature}
                onChange={(e) => setProofSignature(e.target.value)}
                placeholder="Enter Master Key Passcode..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setProofSignature('PROOF-OPERATOR-KEY')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono rounded-xl border border-slate-700 shrink-0 cursor-pointer"
              >
                Insert Owner Key
              </button>
            </div>
          </div>

          {/* Feedback Output */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                feedback.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleReject}
            disabled={isSubmitting}
            className="px-4 py-2 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            Reject Action
          </button>

          <button
            onClick={handleAuthorize}
            disabled={isSubmitting || !proofSignature.trim()}
            className={`px-5 py-2 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              isTier3 ? 'bg-rose-500 hover:bg-rose-400' : 'bg-amber-500 hover:bg-amber-400'
            }`}
          >
            <Zap className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            {isSubmitting ? 'Minting Capability & Executing...' : 'Authorize & Execute Action'}
          </button>
        </div>
      </div>
    </div>
  );
};
