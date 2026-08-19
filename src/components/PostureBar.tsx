import React, { useEffect, useState } from 'react';
import { Shield, Lock, AlertTriangle, RefreshCw, Zap, Server, Activity, Eye } from 'lucide-react';
import { DefensivePosture, HealthMetrics } from '../types';

interface PostureBarProps {
  posture: DefensivePosture;
  healthMetrics: HealthMetrics | null;
  onSetPosture: (p: DefensivePosture) => void;
  onProposeRecovery: () => void;
  onInjectFault: (fault: string) => void;
  onClearFaults: () => void;
}

export const PostureBar: React.FC<PostureBarProps> = ({
  posture,
  healthMetrics,
  onSetPosture,
  onProposeRecovery,
  onInjectFault,
  onClearFaults,
}) => {
  const [visualPresence, setVisualPresence] = useState<{ verified: boolean; isCameraActive: boolean; operatorName: string } | null>(null);

  useEffect(() => {
    const fetchPresence = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetch('/api/governance/visual-presence')
        .then((res) => res.json())
        .then((data) => setVisualPresence(data))
        .catch(() => {});
    };
    fetchPresence();
    const interval = setInterval(fetchPresence, 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900/80 border-b border-slate-800 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Posture Controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono uppercase text-[11px] tracking-wider">Immune Posture:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => onSetPosture('NORMAL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                posture === 'NORMAL'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NORMAL
            </button>
            <button
              onClick={() => onSetPosture('DUCK')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                posture === 'DUCK'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DUCK
            </button>
            <button
              onClick={() => onSetPosture('RAPTOR')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                posture === 'RAPTOR'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RAPTOR
            </button>
            <button
              onClick={() => onSetPosture('STONEWALL')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                posture === 'STONEWALL'
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
                  : 'text-rose-400/70 hover:text-rose-300'
              }`}
            >
              <Lock className="w-3 h-3" />
              STONEWALL
            </button>
          </div>

          {posture === 'STONEWALL' && (
            <button
              onClick={onProposeRecovery}
              className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 rounded-lg font-medium flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
            >
              <RefreshCw className="w-3 h-3" />
              Propose Recovery
            </button>
          )}
        </div>

        {/* Telemetry Summary */}
        <div className="flex items-center gap-4 font-mono text-slate-300">
          <div className="flex items-center gap-1.5" title="Visual Session Verification (Capability Guard)">
            <Eye className={`w-3.5 h-3.5 ${visualPresence?.verified ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>Visual Guard: <strong className={visualPresence?.verified ? 'text-emerald-400' : 'text-amber-300'}>
              {visualPresence?.verified ? 'EYES VERIFIED' : 'REMOTE GUARD ACTIVE'}
            </strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Process: <strong className="text-emerald-400">{healthMetrics?.processHealth ?? 100}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>RAM: <strong className="text-purple-300">{healthMetrics?.memoryUsageMb ?? 42}MB</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Hash Integrity: <strong className={healthMetrics?.hashIntegrity === 'MISMATCH' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {healthMetrics?.hashIntegrity ?? 'VERIFIED'}
            </strong></span>
          </div>
        </div>

        {/* Fault Injection Simulation Tools */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-[10px] uppercase font-mono hidden lg:inline">Fault Simulator:</span>
          <button
            onClick={() => onInjectFault('MODEL_UNRESPONSIVE')}
            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500/40 hover:text-amber-300 text-[11px] transition-all cursor-pointer"
            title="Simulate model server unresponsiveness"
          >
            Model Lag
          </button>
          <button
            onClick={() => onInjectFault('HASH_MISMATCH')}
            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:border-rose-500/40 hover:text-rose-300 text-[11px] transition-all cursor-pointer"
            title="Simulate cryptographic mirror desync"
          >
            Hash Desync
          </button>
          <button
            onClick={onClearFaults}
            className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 text-[11px] transition-all cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
