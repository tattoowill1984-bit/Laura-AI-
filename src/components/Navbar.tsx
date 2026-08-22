import React from 'react';
import {
  Shield,
  ShieldAlert,
  Cpu,
  Activity,
  Lock,
  AlertTriangle,
  FileCheck,
  Layers,
  Sliders,
  Sparkles,
  ShieldCheck,
  Brain,
  HardDrive,
  AlarmClock,
  LayoutGrid,
  Columns,
  User,
  Key,
  ArrowRightLeft,
} from 'lucide-react';
import { AutonomyTier, DefensivePosture, HealthMetrics } from '../types';
import { UnifiedPanelTab } from './UnifiedSystemMatrix';

interface NavbarProps {
  posture: DefensivePosture;
  currentTier: AutonomyTier;
  healthMetrics: HealthMetrics | null;
  pendingProposalsCount: number;
  onOpenTiersModal: () => void;
  onOpenProposalsModal: () => void;
  onOpenLayersModal: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCleanUserMode: boolean;
  onToggleCleanUserMode: () => void;
  onOpenMasterKeyModal?: () => void;
  activeProfile?: any;
  onOpenProfileModal?: () => void;
  onOpenPersonalityModal?: () => void;
  onOpenMigrationModal?: () => void;
  onOpenDriveModal?: () => void;
  onOpenInterAIModal?: () => void;
  onOpenAutonomousHubModal?: () => void;
  onOpenReminderModal?: () => void;
  onOpenUnifiedMatrix?: (tab?: UnifiedPanelTab) => void;
  isWorkstationMode?: boolean;
  onToggleWorkstationMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  posture,
  currentTier,
  pendingProposalsCount,
  onOpenProposalsModal,
  onOpenLayersModal,
  onOpenTiersModal,
  activeTab,
  setActiveTab,
  isCleanUserMode,
  onToggleCleanUserMode,
  onOpenMasterKeyModal,
  activeProfile,
  onOpenProfileModal,
  onOpenPersonalityModal,
  onOpenDriveModal,
  onOpenInterAIModal,
  onOpenAutonomousHubModal,
  onOpenReminderModal,
  onOpenUnifiedMatrix,
  isWorkstationMode = false,
  onToggleWorkstationMode,
}) => {
  const getPostureBadge = () => {
    switch (posture) {
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Shield className="w-3 h-3 text-emerald-400" />
            NORMAL
          </span>
        );
      case 'DUCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            DUCK
          </span>
        );
      case 'RAPTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            <ShieldAlert className="w-3 h-3 text-orange-400" />
            RAPTOR
          </span>
        );
      case 'STONEWALL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <Lock className="w-3 h-3 text-rose-400" />
            STONEWALL
          </span>
        );
    }
  };

  const getTierLabel = () => {
    switch (currentTier) {
      case 'TIER_0_OBSERVATION_PREDICTION':
        return 'T0: Observe';
      case 'TIER_1_SOFT_MAINTENANCE':
        return 'T1: Soft-Repair';
      case 'TIER_2_USER_MODEL_UPDATES':
        return 'T2: Model-Update';
      case 'TIER_3_MACHINE_SELF_EXPANSION':
        return 'T3: Expansion';
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Unified Identity */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-500/20">
            L
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>Laura AI</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Unified System
                </span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Mind • Tasks & Reminders • Merkle Memory • 15 Survival Layers
            </p>
          </div>
        </div>

        {/* Live System Posture & Unified Status */}
        <div className="hidden md:flex items-center gap-2">
          {getPostureBadge()}

          <button
            onClick={() => onOpenUnifiedMatrix?.('MIND')}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-purple-300 bg-purple-950/40 border border-purple-500/30 hover:border-purple-400 transition-all cursor-pointer"
            title="Continuous Cognitive Loop: Online"
          >
            <Brain className="w-3 h-3 text-purple-400" />
            <span>Autonomous Mind: Active</span>
          </button>

          <button
            onClick={() => onOpenUnifiedMatrix?.('INVARIANTS')}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-emerald-300 bg-emerald-950/30 border border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer"
            title="15 Survival Layers: Enforced"
          >
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>15 Layers</span>
          </button>
        </div>

        {/* Unified Quick Access & Controls */}
        <div className="flex items-center gap-2">
          {/* Unified System Matrix Button */}
          {onOpenUnifiedMatrix && (
            <button
              onClick={() => onOpenUnifiedMatrix()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-900/60 via-indigo-900/60 to-cyan-900/60 border border-purple-500/40 text-purple-200 hover:border-purple-400 transition-all cursor-pointer shadow-sm shadow-purple-900/20"
              title="Open Unified System Matrix (Mind, Tasks, Memory, Layers, Tools)"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
              <span>Unified Matrix</span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
              </span>
            </button>
          )}

          {/* Workstation Docked Mode Toggle */}
          {onToggleWorkstationMode && (
            <button
              onClick={onToggleWorkstationMode}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                isWorkstationMode
                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-200'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={isWorkstationMode ? 'Collapse to single-pane Focus Chat' : 'Expand to Dual-Pane Unified Workstation'}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{isWorkstationMode ? 'Docked' : 'Split View'}</span>
            </button>
          )}

          {/* User Profile / Memory Anchor */}
          {onOpenProfileModal && (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
              title="User Profile & Explicit Merkle Facts"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="max-w-[100px] truncate">{activeProfile ? activeProfile.name : 'Will'}</span>
            </button>
          )}

          {/* Pending Proposals Indicator */}
          {pendingProposalsCount > 0 && (
            <button
              onClick={onOpenProposalsModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{pendingProposalsCount}</span>
            </button>
          )}

          {/* Engineering View Toggle */}
          <button
            onClick={onToggleCleanUserMode}
            title="Toggle Operator / Engineering Diagnostics"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer border border-slate-800 hover:border-slate-700"
          >
            <Sliders className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Engineering View Sub-tabs (Only in Engineering Mode) */}
      {!isCleanUserMode && (
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'assistant'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Unified Chat
          </button>
          <button
            onClick={() => setActiveTab('vnext')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'vnext'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            vNext Orchestrator
          </button>
          <button
            onClick={() => setActiveTab('gabby')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'gabby'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Substrate & DAG
          </button>
          <button
            onClick={() => setActiveTab('reality')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'reality'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reality Alignment
          </button>
          <button
            onClick={() => setActiveTab('epistemic')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'epistemic'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Epistemic State
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'ledger'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Burn Log & Ledger
          </button>
        </div>
      )}
    </header>
  );
};
