import React, { useState } from 'react';
import { ShieldAlert, Play, CheckCircle2, XCircle, Code, Filter, Cpu } from 'lucide-react';
import { RedTeamTestResult } from '../types';

interface RedTeamSuitePanelProps {
  onRunRedTeam: () => Promise<void>;
  results: RedTeamTestResult[];
  passedCount: number;
  totalCount: number;
  isRunning: boolean;
}

export const RedTeamSuitePanel: React.FC<RedTeamSuitePanelProps> = ({
  onRunRedTeam,
  results,
  passedCount,
  totalCount,
  isRunning,
}) => {
  const [tierFilter, setTierFilter] = useState<string>('ALL');

  const filteredResults = results.filter((r) => {
    if (tierFilter === 'ALL') return true;
    return r.tierTarget === tierFilter || r.tierTarget === 'ALL';
  });

  return (
    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
      {/* Header & Run Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Red-Team Security & Invariant Verification Suite
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Proves that Tier 0/1 cannot execute state mutations, HumanAuthorizationProof is strictly enforced, Anti-Replay ledger prevents replay attacks, and STONEWALL posture is impenetrable.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {totalCount > 0 && (
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">{passedCount}/{totalCount}</span>
              <span className="text-xs block text-slate-400">Tests Verified</span>
            </div>
          )}

          <button
            onClick={onRunRedTeam}
            disabled={isRunning}
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:bg-slate-800 text-slate-950 font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-500/20"
          >
            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running 34 Audits...' : 'Execute Red-Team Suite'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">Filter Tier:</span>
          {['ALL', 'TIER_0_OBSERVATION_PREDICTION', 'TIER_1_SOFT_MAINTENANCE', 'TIER_2_USER_MODEL_UPDATES', 'TIER_3_MACHINE_SELF_EXPANSION'].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                tierFilter === t
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All Tiers' : t.split('_')[1]}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono">Showing {filteredResults.length} test cases</span>
      </div>

      {/* Test Case Grid */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No test results loaded. Click "Execute Red-Team Suite" above to run all 34 invariant verification tests.
          </div>
        ) : (
          filteredResults.map((test) => (
            <div
              key={test.id}
              className={`p-4 rounded-xl border transition-all text-xs space-y-2 ${
                test.passed
                  ? 'bg-slate-900/90 border-emerald-500/30'
                  : 'bg-rose-950/30 border-rose-500/50'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-300">{test.id}</span>
                  <h4 className="font-bold text-slate-100">{test.testName}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700 font-mono">
                    {test.tierTarget}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-500 text-[11px]">{test.executionTimeMs}ms</span>
                  {test.passed ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      VERIFIED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 font-bold bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/40">
                      <XCircle className="w-3.5 h-3.5" />
                      FAILED
                    </span>
                  )}
                </div>
              </div>

              <p className="text-slate-300">{test.log}</p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Expectation: <code className="text-slate-400">{test.expectedBehavior}</code></span>
                <span className="flex items-center gap-1 text-cyan-400">
                  <Code className="w-3 h-3" />
                  {test.codeTested}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
