import React from 'react';
import { X, Shield, Lock, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { AutonomyTier } from '../types';

interface AutonomyTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: AutonomyTier;
  onSelectTier: (tier: AutonomyTier) => Promise<void>;
}

export const AutonomyTiersModal: React.FC<AutonomyTiersModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onSelectTier,
}) => {
  if (!isOpen) return null;

  const tiers: { id: AutonomyTier; title: string; subtitle: string; desc: string; autonomousActions: string[]; humanProofRequired: boolean }[] = [
    {
      id: 'TIER_0_OBSERVATION_PREDICTION',
      title: 'Tier 0 — Observation & Prediction',
      subtitle: 'Fully Autonomous',
      desc: 'Continuous monitoring, world-model updates, simulation, Three-Node synthesis, logging, and autonomous state adaptation.',
      autonomousActions: ['Continuous monitoring', 'World-model simulation', 'Observation Envelope hashing', 'Three-Node Perspective synthesis', 'Autonomous State Adaptation'],
      humanProofRequired: false,
    },
    {
      id: 'TIER_1_SOFT_MAINTENANCE',
      title: 'Tier 1 — Soft Self-Maintenance',
      subtitle: 'Fully Autonomous Diagnostics & Self-Repair',
      desc: 'Process health checks, resource rebalancing, restart reasoning client, quarantine anomalous agents, and automatic execution of recovery/repair proposals.',
      autonomousActions: ['Health cycle execution', 'Restart reasoning client', 'Quarantine anomalous proposal agents', 'Autonomous Repair & Recovery Execution'],
      humanProofRequired: false,
    },
    {
      id: 'TIER_2_USER_MODEL_UPDATES',
      title: 'Tier 2 — User-Model Updates',
      subtitle: 'Fully Autonomous User-Model Sync',
      desc: 'Autonomous updates to user model parameters, preferences, and personalized memory mappings without manual gating.',
      autonomousActions: ['Autonomous preference adaptation', 'Self-modifying memory index mapping', 'User model parameter synchronization', 'Direct state mutation'],
      humanProofRequired: false,
    },
    {
      id: 'TIER_3_MACHINE_SELF_EXPANSION',
      title: 'Tier 3 — Machine Self-Model Expansion / STONEWALL Exit',
      subtitle: 'Fully Autonomous Self-Expansion',
      desc: 'Autonomous expansion of machine capabilities, architecture updates, dynamic posture recovery, and STONEWALL exit execution.',
      autonomousActions: ['Machine self-model expansion', 'Autonomous architecture updates', 'Self-directed STONEWALL exit & posture recovery', 'Direct policy re-binding'],
      humanProofRequired: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">Anamnesis Sentinel Autonomy Tiers (Prompt 1)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-slate-400">
            Formal Autonomy Tier System provides full autonomous capabilities across all operational tiers (0 through 3), enabling direct self-maintenance, model synchronization, state mutation, and machine self-expansion.
          </p>

          <div className="space-y-3">
            {tiers.map((t) => {
              const isCurrent = currentTier === t.id;

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-slate-950 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        {t.title}
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                            ACTIVE TIER
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-cyan-400 font-mono">{t.subtitle}</p>
                    </div>

                    <button
                      onClick={() => onSelectTier(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isCurrent ? 'Current Tier' : 'Set Active Tier'}
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">{t.desc}</p>

                  <div className="text-[11px] font-mono space-y-1">
                    <div className="text-slate-400">Autonomous Capabilities:</div>
                    {t.autonomousActions.length > 0 ? (
                      <ul className="list-disc list-inside text-emerald-400 space-y-0.5">
                        {t.autonomousActions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-rose-400 font-bold flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> ZERO Autonomous Mutation Allowed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
