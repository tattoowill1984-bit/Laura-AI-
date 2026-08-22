import React from 'react';
import { Shield, ShieldAlert, Cpu, Activity, Lock, AlertTriangle, FileCheck, Layers, Terminal, Sliders, Sparkles, Key, ShieldCheck, User, Brain, Volume2, HardDrive, ArrowRightLeft } from 'lucide-react';
import { AutonomyTier, DefensivePosture, HealthMetrics } from '../types';

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
}

export const Navbar: React.FC<NavbarProps> = ({
  posture,
  currentTier,
  healthMetrics,
  pendingProposalsCount,
  onOpenTiersModal,
  onOpenProposalsModal,
  onOpenLayersModal,
  activeTab,
  setActiveTab,
  isCleanUserMode,
  onToggleCleanUserMode,
  onOpenMasterKeyModal,
  activeProfile,
  onOpenProfileModal,
  onOpenPersonalityModal,
  onOpenMigrationModal,
  onOpenDriveModal,
  onOpenInterAIModal,
  onOpenAutonomousHubModal,
}) => {
  const getPostureBadge = () => {
    switch (posture) {
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            NORMAL
          </span>
        );
      case 'DUCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            DUCK
          </span>
        );
      case 'RAPTOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
            RAPTOR
          </span>
        );
      case 'STONEWALL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            STONEWALL (ISOLATED)
          </span>
        );
    }
  };

  const getTierLabel = () => {
    switch (currentTier) {
      case 'TIER_0_OBSERVATION_PREDICTION':
        return 'Tier 0: Observation';
      case 'TIER_1_SOFT_MAINTENANCE':
        return 'Tier 1: Soft-Repair';
      case 'TIER_2_USER_MODEL_UPDATES':
        return 'Tier 2: Model-Update';
      case 'TIER_3_MACHINE_SELF_EXPANSION':
        return 'Tier 3: Machine-Expansion';
    }
  };

  if (isCleanUserMode) {
    return (
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Simple Clean Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-500/20">
              L
            </div>
            <span className="text-lg font-bold text-slate-100 tracking-tight">Laura AI</span>
          </div>

          {/* Quick Actions & Profile Memory Button */}
          <div className="flex items-center gap-2">
            {onOpenAutonomousHubModal && (
              <button
                onClick={onOpenAutonomousHubModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-cyan-950/70 border border-purple-500/40 text-purple-200 hover:border-purple-400 transition-all cursor-pointer shadow-sm relative"
                title="Open 5-Pillar Autonomous Cognitive Hub (Continuous Loop, Epistemic Goals, Dream Cycles, Tool Synthesis)"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>Autonomous Core</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              </button>
            )}

            {onOpenPersonalityModal && (
              <button
                onClick={onOpenPersonalityModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-950/60 to-pink-950/60 border border-purple-500/40 text-purple-200 hover:bg-purple-900/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm shadow-purple-500/10"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Personality & Context</span>
              </button>
            )}

            {onOpenDriveModal && (
              <button
                onClick={onOpenDriveModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/50 hover:border-cyan-400/60 transition-all cursor-pointer shadow-sm shadow-cyan-500/10"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Google Drive</span>
              </button>
            )}

            {onOpenProfileModal && (
              <button
                onClick={onOpenProfileModal}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/40 border border-purple-500/30 text-purple-200 hover:bg-purple-900/40 hover:border-purple-500/50 transition-all cursor-pointer shadow-sm"
              >
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span>{activeProfile ? activeProfile.name : "Will's Laura AI"}</span>
              </button>
            )}

            {pendingProposalsCount > 0 && (
              <button
                onClick={onOpenProposalsModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                {pendingProposalsCount} Approval Pending
              </button>
            )}

            <button
              onClick={onToggleCleanUserMode}
              title="Switch to Operator & Engineering View"
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer border border-slate-800 hover:border-slate-700 flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline text-slate-400 text-[11px]">Engineering Mode</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                Laura Cognitive Substrate
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                v2.0 KMS + Merkle DAG
              </span>
            </div>
            <p className="text-xs text-slate-400">Identity-Preserving Cognitive AI Machine & Viability Organism</p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex items-center flex-wrap gap-2">
          {getPostureBadge()}

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10">
            <Brain className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Advanced Thinking: ACTIVE (16K)
          </span>

          {onOpenDriveModal && (
            <button
              onClick={onOpenDriveModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/60 transition-all cursor-pointer shadow-sm shadow-cyan-500/10"
            >
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              Google Drive Bridge
            </button>
          )}

          <button
            onClick={onOpenTiersModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-slate-800 text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/50 transition-all cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            {getTierLabel()}
          </button>

          <button
            onClick={onOpenLayersModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-slate-300 bg-slate-800/80 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            15 Survival Layers
          </button>

          {onOpenAutonomousHubModal && (
            <button
              onClick={onOpenAutonomousHubModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-gradient-to-r from-purple-950/90 via-indigo-950/90 to-cyan-950/90 text-purple-200 border border-purple-500/40 hover:border-purple-400 transition-all cursor-pointer shadow-sm shadow-purple-500/10"
              title="Open 5-Pillar Autonomous Cognitive Hub"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>Autonomous Core</span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
              </span>
            </button>
          )}

          {onOpenInterAIModal && (
            <button
              onClick={onOpenInterAIModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-purple-300 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
              Inter-AI Channel
            </button>
          )}

          {onOpenPersonalityModal && (
            <button
              onClick={onOpenPersonalityModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-purple-300 bg-gradient-to-r from-purple-950/80 to-pink-950/80 border border-purple-500/40 hover:bg-purple-900/60 hover:border-purple-400 transition-all cursor-pointer shadow-sm shadow-purple-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Personality & Context Hub
            </button>
          )}

          {onOpenMasterKeyModal && (
            <button
              onClick={onOpenMasterKeyModal}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Owner Key
            </button>
          )}

          <button
            onClick={onOpenProposalsModal}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              pendingProposalsCount > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-bounce'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-amber-400" />
            {pendingProposalsCount} Proof Pending
          </button>

          <button
            onClick={onToggleCleanUserMode}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Simplified AI View
          </button>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab('vnext')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'vnext'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Laura vNext OS
          </button>
          <button
            onClick={() => setActiveTab('gabby')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gabby'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            Laura Substrate V2
          </button>
          <button
            onClick={() => setActiveTab('reality')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reality'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-purple-400" />
            Reality Audit & TAU
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'assistant'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            AI Helper Chat
          </button>
          <button
            onClick={() => setActiveTab('epistemic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'epistemic'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Epistemic Body
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ledger'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Burn & MemGate Log
          </button>
        </nav>
      </div>
    </header>
  );
};
