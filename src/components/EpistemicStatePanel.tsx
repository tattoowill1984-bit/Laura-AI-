import React, { useState, useEffect } from 'react';
import {
  Activity,
  Shield,
  Server,
  BarChart3,
  CheckCircle2,
  Clock,
  Zap,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  GitCommit,
  Sparkles,
  Filter,
} from 'lucide-react';
import { EpistemicState, HealthMetrics } from '../types';
import { PredictionErrorRecord } from '../engine/vnext/types';

interface EpistemicStatePanelProps {
  epistemicState: EpistemicState | null;
  healthMetrics: HealthMetrics | null;
  onInjectFault: (fault: string) => void;
  onClearFaults: () => void;
  predictionErrors?: PredictionErrorRecord[];
}

export const EpistemicStatePanel: React.FC<EpistemicStatePanelProps> = ({
  epistemicState,
  healthMetrics,
  onInjectFault,
  onClearFaults,
  predictionErrors,
}) => {
  const [predictionRecords, setPredictionRecords] = useState<PredictionErrorRecord[]>(predictionErrors || []);
  const [filter, setFilter] = useState<'ALL' | 'HIGH_ERROR' | 'PARADIGM_SHIFT'>('ALL');
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchTensors = async () => {
    try {
      const res = await fetch('/api/vnext/world-model-tensors');
      if (res.ok) {
        const data = await res.json();
        if (data?.recentPredictionErrors && Array.isArray(data.recentPredictionErrors)) {
          setPredictionRecords(data.recentPredictionErrors);
        }
      }
    } catch (e) {
      // Fallback to local state
    }
  };

  useEffect(() => {
    fetchTensors();
    const interval = setInterval(fetchTensors, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (predictionErrors && predictionErrors.length > 0) {
      setPredictionRecords(predictionErrors);
    }
  }, [predictionErrors]);

  const handleSimulateError = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/vnext/simulate-prediction-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictedNeed: 'Passive Observational Monitoring',
          actualAction: 'Requested Entity Attribution, Temporal Anchors & Active Model Revision Engine',
          errorDelta: 0.91,
          signalType: 'PARADIGM_SHIFT',
          reason: 'High-friction user prompt requested full-stack continuous runtime temporal expansion, triggering immediate World Model revision and prior re-weighting.',
        }),
      });
      if (res.ok) {
        await fetchTensors();
      }
    } catch (e) {
      console.error('Failed simulating prediction error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!epistemicState) return null;

  const getTrajectoryBadge = () => {
    switch (epistemicState.persistenceTrajectory) {
      case 'STABLE':
        return <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">STABLE TRAJECTORY</span>;
      case 'DEFENSIVE':
        return <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">DEFENSIVE TRAJECTORY</span>;
      case 'EXPANDING':
        return <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">EXPANDING TRAJECTORY</span>;
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold animate-pulse">CRITICAL TRAJECTORY</span>;
    }
  };

  const MetricGauge = ({ label, value, color, unit = '%' }: { label: string; value: number; color: string; unit?: string }) => (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="font-mono font-bold text-slate-100">{value}{unit}</span>
      </div>
      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );

  const filteredRecords = predictionRecords.filter((rec) => {
    if (filter === 'HIGH_ERROR') return rec.predictionErrorDelta >= 0.50;
    if (filter === 'PARADIGM_SHIFT') return rec.errorSignalType === 'PARADIGM_SHIFT' || rec.errorSignalType === 'MISPREDICTION';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Boundary Health Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Boundary Health
            </span>
            {getTrajectoryBadge()}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100 font-mono">{epistemicState.boundaryHealth}%</span>
            <span className="text-xs text-slate-400">Identity Envelope Status</span>
          </div>
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                epistemicState.boundaryHealth > 80
                  ? 'bg-emerald-500'
                  : epistemicState.boundaryHealth > 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${epistemicState.boundaryHealth}%` }}
            />
          </div>
        </div>

        {/* Autonomous Health Loop Status */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-cyan-400" />
              Health Loop Telemetry
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              ACTIVE (5s loop)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-slate-500 block">RAM Usage:</span>
              <strong className="text-slate-200">{healthMetrics?.memoryUsageMb ?? 42} MB</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Reasoning Model:</span>
              <strong className={healthMetrics?.reasoningModelStatus === 'HEALTHY' ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                {healthMetrics?.reasoningModelStatus ?? 'HEALTHY'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Latency:</span>
              <strong className="text-cyan-300">{healthMetrics?.proposalLatencyMs ?? 120} ms</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Hash Mirror:</span>
              <strong className={healthMetrics?.hashIntegrity === 'VERIFIED' ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                {healthMetrics?.hashIntegrity ?? 'VERIFIED'}
              </strong>
            </div>
          </div>
        </div>

        {/* Epistemic Age & Compute Budget */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-400" />
              Epistemic Continuity
            </span>
            <span className="text-xs font-mono text-slate-400">Cycles: {epistemicState.ageCycles}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Compute Budget Remaining:</span>
              <span className="font-mono text-purple-300 font-bold">{epistemicState.computeBudgetRemaining}%</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-purple-500 transition-all duration-500 rounded-full"
                style={{ width: `${epistemicState.computeBudgetRemaining}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Metabolism Layer 9: Routine queries use cheap fast paths; expensive simulations require high friction authorization.
            </p>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Model Revisions & Prediction Error Events */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Recent Model Revision Events (Prediction Error Triggers)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tracks runtime model weight revisions triggered when prediction error deltas (Δ) exceed learning thresholds. High prediction error prompts automatic prior re-weighting and reason logging.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateError}
              disabled={isSimulating}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Revising Model...' : 'Simulate Model Revision'}
            </button>

            <button
              onClick={fetchTensors}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-all cursor-pointer"
              title="Refresh Prediction Records"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-mono flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter:
          </span>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-mono transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-slate-800 text-slate-100 font-bold border border-slate-700'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/60'
            }`}
          >
            All Events ({predictionRecords.length})
          </button>
          <button
            onClick={() => setFilter('HIGH_ERROR')}
            className={`px-3 py-1 rounded-lg font-mono transition-all cursor-pointer ${
              filter === 'HIGH_ERROR'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/60'
            }`}
          >
            High Error (Δ ≥ 0.50)
          </button>
          <button
            onClick={() => setFilter('PARADIGM_SHIFT')}
            className={`px-3 py-1 rounded-lg font-mono transition-all cursor-pointer ${
              filter === 'PARADIGM_SHIFT'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/60'
            }`}
          >
            Paradigm Shifts
          </button>
        </div>

        {/* Revision Cards Grid / List */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 text-xs font-mono">
              No recent model revision events match the selected filter.
            </div>
          ) : (
            filteredRecords.map((record) => {
              const errorPercent = Math.round(record.predictionErrorDelta * 100);
              const isHighError = record.predictionErrorDelta >= 0.50;

              return (
                <div
                  key={record.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    record.errorSignalType === 'PARADIGM_SHIFT'
                      ? 'bg-gradient-to-r from-slate-900 via-rose-950/20 to-slate-900 border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : record.errorSignalType === 'MISPREDICTION'
                      ? 'bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border-amber-500/40'
                      : isHighError
                      ? 'bg-slate-900 border-amber-500/30'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </span>

                      {/* Signal Badge */}
                      {record.errorSignalType === 'PARADIGM_SHIFT' && (
                        <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          PARADIGM SHIFT REVISION
                        </span>
                      )}
                      {record.errorSignalType === 'MISPREDICTION' && (
                        <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          HIGH ERROR REVISION
                        </span>
                      )}
                      {record.errorSignalType === 'MINOR_DEVIATION' && (
                        <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                          MINOR DEVIATION
                        </span>
                      )}
                      {record.errorSignalType === 'MATCH' && (
                        <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          PREDICTION MATCH
                        </span>
                      )}
                    </div>

                    {/* Error Delta Meter */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400 text-[11px]">Error Delta (Δ):</span>
                      <span
                        className={`font-bold ${
                          errorPercent >= 75
                            ? 'text-rose-400'
                            : errorPercent >= 40
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {record.predictionErrorDelta.toFixed(2)} ({errorPercent}%)
                      </span>
                      <div className="w-20 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            errorPercent >= 75
                              ? 'bg-rose-500'
                              : errorPercent >= 40
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, errorPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expectation vs Observation Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">
                        Predicted Need / Prior Hypothesis
                      </span>
                      <p className="text-slate-200 font-medium">{record.predictedNeed}</p>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 block">
                        Observed User Action
                      </span>
                      <p className="text-slate-200 font-medium">{record.actualUserAction}</p>
                    </div>
                  </div>

                  {/* REASON FOR REVISION FIELD - Highlighted Callout */}
                  <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-500/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-purple-300 text-xs font-mono font-bold">
                      <GitCommit className="w-4 h-4 text-purple-400" />
                      <span>Reason for Revision:</span>
                    </div>
                    <p className="text-xs text-purple-100 font-sans leading-relaxed">
                      {record.reasonForRevision ||
                        'Model revision triggered by prediction error threshold evaluation against current World Model priors.'}
                    </p>
                  </div>

                  {/* Weight Revision Summary */}
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/60 flex items-center gap-2">
                    <span className="text-slate-500">Model Weights Summary:</span>
                    <span className="text-slate-300">{record.revisedModelWeightsSummary}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* State Space Gauge Grid */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          Epistemic State Space Metrics (Layer 3)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricGauge label="Confidence Level" value={epistemicState.confidence} color="bg-cyan-500" />
          <MetricGauge label="Authority Weight" value={epistemicState.authority} color="bg-blue-500" />
          <MetricGauge label="Stability Index" value={epistemicState.stability} color="bg-emerald-500" />
          <MetricGauge label="Volatility Load" value={epistemicState.volatility} color="bg-rose-500" />
          <MetricGauge label="Contradiction Load" value={epistemicState.contradictionLoad} color="bg-amber-500" />
          <MetricGauge label="Friction Score" value={epistemicState.frictionScore} color="bg-orange-500" />
          <MetricGauge label="Exploration Pressure" value={epistemicState.explorationPressure} color="bg-purple-500" />
          <MetricGauge label="Compute Remaining" value={epistemicState.computeBudgetRemaining} color="bg-indigo-500" />
        </div>
      </div>

      {/* Simulated Fault Injection Suite */}
      <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Autonomous Health Loop Fault Simulation Suite
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Inject synthetic fault signals to verify that the Autonomous Health Loop detects degradation and automatically emits PROPOSAL_PENDING_HUMAN_PROOF without executing mutations itself.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onInjectFault('MODEL_UNRESPONSIVE')}
            className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Inject Model Lag
          </button>
          <button
            onClick={() => onInjectFault('HASH_MISMATCH')}
            className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Inject Hash Desync
          </button>
          <button
            onClick={onClearFaults}
            className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Clear Faults
          </button>
        </div>
      </div>
    </div>
  );
};
