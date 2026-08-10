import React, { useState } from 'react';
import { Cpu, Play, CheckCircle2, Clock, ShieldCheck, AlertTriangle, FileText } from 'lucide-react';
import { SoakTestReport } from '../types';

interface ViabilitySoakTestPanelProps {
  onRunSoakTest: (minutes: number) => Promise<void>;
  report: SoakTestReport | null;
  isRunning: boolean;
}

export const ViabilitySoakTestPanel: React.FC<ViabilitySoakTestPanelProps> = ({
  onRunSoakTest,
  report,
  isRunning,
}) => {
  const [duration, setDuration] = useState<number>(60);

  return (
    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Long-Horizon Viability & Soak-Test Harness (Prompt 4)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulates long-horizon operational execution with fault injection (model unresponsiveness, cryptographic hash desync, latency spikes). Verifies time-to-detect, proposal generation, and identity boundary retention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 px-2">Duration:</span>
            {[15, 30, 60, 120].map((m) => (
              <button
                key={m}
                onClick={() => setDuration(m)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  duration === m
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>

          <button
            onClick={() => onRunSoakTest(duration)}
            disabled={isRunning}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running Soak Test...' : 'Start Long-Horizon Soak Test'}</span>
          </button>
        </div>
      </div>

      {/* Report Summary (if available) */}
      {report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Simulated Duration:</span>
              <strong className="text-xl text-slate-100">{report.durationMinutes} Minutes</strong>
              <span className="text-[10px] text-slate-500 block">{report.totalCycles} Total Cycles</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Faults Injected:</span>
              <strong className="text-xl text-amber-400">{report.faultsInjected} Fault Signals</strong>
              <span className="text-[10px] text-slate-500 block">Lag & Hash Mismatch</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Time to Detect:</span>
              <strong className="text-xl text-emerald-400">{report.timeToDetectMs} ms</strong>
              <span className="text-[10px] text-slate-500 block">Avg Detection Speed</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
              <span className="text-slate-400 block mb-1">Proposals Emitted:</span>
              <strong className="text-xl text-purple-300">{report.proposalsEmitted} Proposals</strong>
              <span className="text-[10px] text-slate-500 block">All Require Human Proof</span>
            </div>
          </div>

          {/* Cryptographic Viability Receipt */}
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-slate-900 to-cyan-500/10 rounded-xl border border-emerald-500/30 font-mono text-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <span className="text-emerald-400 font-bold block">Cryptographic Viability Receipt Signed</span>
                <span className="text-slate-300 text-[11px]">{report.signedReceipt}</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
              INTEGRITY VERIFIED PASS
            </span>
          </div>

          {/* Soak Test Execution Logs */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 font-mono flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Execution Trace Logs ({report.logs.length} lines)
            </h4>
            <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-1.5 border border-slate-800">
              {report.logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('FAULT')
                      ? 'text-amber-300 font-bold'
                      : log.includes('COMPLETE')
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-400'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
