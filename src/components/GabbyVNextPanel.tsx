import React, { useState, useEffect } from 'react';
import {
  Brain,
  Network,
  Target,
  Sparkles,
  Users,
  Compass,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  Activity,
  Zap,
} from 'lucide-react';

interface GabbyVNextPanelProps {
  onSendPrompt?: (text: string) => void;
}

export const GabbyVNextPanel: React.FC<GabbyVNextPanelProps> = ({ onSendPrompt }) => {
  const [activeTab, setActiveTab] = useState<'LEARNING' | 'WORLD_MODEL' | 'GOALS' | 'PREDICTIONS' | 'SPECIALISTS' | 'PLANNER' | 'PERCEPTION'>('LEARNING');
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testSuiteResults, setTestSuiteResults] = useState<any>(null);
  const [testingSuite, setTestingSuite] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');

  const runTestSuite = async () => {
    setTestingSuite(true);
    try {
      const [res1, res2, res3] = await Promise.all([
        fetch('/api/vnext/test-multimodal'),
        fetch('/api/vnext/test-continuous-perception'),
        fetch('/api/vnext/test-temporal-perception'),
      ]);

      const data1 = res1.ok ? await res1.json() : { results: [], passedCount: 0, totalCount: 0 };
      const data2 = res2.ok ? await res2.json() : { results: [], passedCount: 0, totalCount: 0 };
      const data3 = res3.ok ? await res3.json() : { results: [], passedCount: 0, totalCount: 0 };

      const combinedResults = [...(data1.results || []), ...(data2.results || []), ...(data3.results || [])];
      const passedCount = combinedResults.filter((r) => r.passed).length;
      const totalCount = combinedResults.length;

      setTestSuiteResults({
        success: passedCount === totalCount && totalCount > 0,
        passedCount,
        totalCount,
        results: combinedResults,
      });
    } catch (err) {
      console.error('Test suite execution error:', err);
    } finally {
      setTestingSuite(false);
    }
  };

  const fetchState = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vnext/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Error fetching vNext state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      const res = await fetch('/api/vnext/goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoalTitle,
          description: newGoalDesc,
          priority: newGoalPriority,
        }),
      });

      if (res.ok) {
        setNewGoalTitle('');
        setNewGoalDesc('');
        fetchState();
      }
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  const worldGraph = state?.worldGraph || { nodes: [], edges: [] };
  const allGoals = state?.allGoals || [];
  const predictions = state?.recentPredictions || [];
  const recentObs = state?.recentObservations || [];
  const convMetrics = state?.convMetrics || {};

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-wide text-white">Laura vNext Operating System</h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                Active Architecture
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Perception Bus • World Model Graph • Goal Engine • Specialist Consortium • Proactive Predictions
            </p>
          </div>
        </div>

        <button
          onClick={fetchState}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium transition-colors text-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh State
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
        <button
          onClick={() => setActiveTab('LEARNING')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'LEARNING'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Brain className="w-4 h-4 text-purple-400" />
          Learning Adaptation
        </button>

        <button
          onClick={() => setActiveTab('PREDICTIONS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'PREDICTIONS'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Proactive Predictions ({predictions.length})
        </button>

        <button
          onClick={() => setActiveTab('GOALS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'GOALS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Target className="w-4 h-4 text-cyan-400" />
          Goal Engine ({allGoals.length})
        </button>

        <button
          onClick={() => setActiveTab('WORLD_MODEL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'WORLD_MODEL'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Network className="w-4 h-4 text-emerald-400" />
          World Model Graph ({worldGraph.nodes.length})
        </button>

        <button
          onClick={() => setActiveTab('SPECIALISTS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'SPECIALISTS'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-purple-400" />
          Specialist Consortium (7)
        </button>

        <button
          onClick={() => setActiveTab('PLANNER')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'PLANNER'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Compass className="w-4 h-4 text-blue-400" />
          Active Execution Kernel
        </button>

        <button
          onClick={() => setActiveTab('PERCEPTION')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === 'PERCEPTION'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Eye className="w-4 h-4 text-rose-400" />
          Perception Bus ({recentObs.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {/* TAB 0: LEARNING ADAPTATION LAYER & SITUATIONAL AWARENESS PIPELINE */}
        {activeTab === 'LEARNING' && (
          <div className="space-y-5">
            {/* Pipeline Header Banner */}
            <div className="p-4 bg-gradient-to-r from-purple-900/40 via-cyan-900/30 to-slate-900 border border-purple-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Situational Awareness Pipeline: Sensors → Observation Envelope → Affective Inference → State Estimate → Strategy
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                  STAGE: {state?.learnerState?.currentStage || 'CURIOSITY'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Gabby continuously senses camera visual input, audio/voice cues, text tone, and interaction patterns to infer emotional state and adapt response strategy in real-time.
              </p>
            </div>

            {/* 1. Sensors Input Overview */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Active Sensors Data Ingestion
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">Camera (Eyes)</div>
                  <div className="font-bold text-amber-300">Auto-Stream Active</div>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">Microphone (Ears)</div>
                  <div className="font-bold text-rose-300">Continuous Listen</div>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">Text Stream</div>
                  <div className="font-bold text-cyan-300">Tone & Syntax Ingested</div>
                </div>
                <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">Interaction Pattern</div>
                  <div className="font-bold text-purple-300">Real-Time Pacing</div>
                </div>
              </div>
            </div>

            {/* 2. Affective & Context Inference Layer */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Affective & Context Inference Layer
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono">Frustration</div>
                  <div className="text-base font-bold text-rose-400">
                    {state?.learnerState?.affectiveState?.frustration ?? 10}%
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-400 h-full transition-all duration-300"
                      style={{ width: `${state?.learnerState?.affectiveState?.frustration ?? 10}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono">Confusion</div>
                  <div className="text-base font-bold text-amber-400">
                    {state?.learnerState?.affectiveState?.confusion ?? 20}%
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${state?.learnerState?.affectiveState?.confusion ?? 20}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono">Engagement</div>
                  <div className="text-base font-bold text-cyan-400">
                    {state?.learnerState?.affectiveState?.engagement ?? 70}%
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${state?.learnerState?.affectiveState?.engagement ?? 70}%` }}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] text-slate-400 font-mono">Uncertainty</div>
                  <div className="text-base font-bold text-purple-400">
                    {state?.learnerState?.affectiveState?.uncertainty ?? 30}%
                  </div>
                  <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-400 h-full transition-all duration-300"
                      style={{ width: `${state?.learnerState?.affectiveState?.uncertainty ?? 30}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. State Estimate & Response Strategy Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  State Estimate
                </div>
                <div className="px-3 py-1.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold font-mono inline-block">
                  {state?.learnerState?.affectiveState?.overallClassification || 'ACTIVE_EXPLORER'}
                </div>
                <div className="text-xs text-slate-300">
                  Style: <span className="text-cyan-300 font-bold">{state?.learnerState?.preferredStyle || 'ANALOGY_FIRST'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Selected Response Strategy
                </div>
                <div className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold font-mono inline-block">
                  {state?.learnerState?.strategy?.primaryStrategy || 'DEEPEN_EXPLORATION'}
                </div>
                <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                  {(state?.learnerState?.strategy?.actionables || ['Simplify explanation', 'Offer step-by-step guidance']).map((act: string, idx: number) => (
                    <li key={idx}>{act}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 4. Pedagogical Directive Output */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                Active Pedagogical Directive (Passed to System Context)
              </h4>
              <p className="text-xs text-slate-200 font-mono bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                "{state?.learnerState?.pedagogicalDirective || 'Provide clear, encouraging, step-by-step guidance starting from simple analogies.'}"
              </p>
            </div>

            {/* 5. Multimodal Perception & Verification Test Harness */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Multimodal Perception & Governance Verification Suite
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Verify that Gabby perceives context, triggers supportive adaptation, handles ambiguity, and strictly respects memory governance.
                  </p>
                </div>
                <button
                  onClick={runTestSuite}
                  disabled={testingSuite}
                  className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingSuite ? 'animate-spin' : ''}`} />
                  {testingSuite ? 'Running 7-Requirement Verification...' : 'Run Automated Test Suite'}
                </button>
              </div>

              {testSuiteResults && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200">
                      Suite Result: {testSuiteResults.passedCount} / {testSuiteResults.totalCount} Verification Requirements Passed
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        testSuiteResults.success
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {testSuiteResults.success ? 'ALL CRITERIA VERIFIED' : 'TEST FAILURES DETECTED'}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {testSuiteResults.results?.map((res: any, idx: number) => (
                      <div key={idx} className="p-2 bg-slate-950 rounded border border-slate-800/80 space-y-0.5">
                        <div className="flex items-center gap-2 font-bold text-[11px]">
                          {res.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className={res.passed ? 'text-emerald-300' : 'text-rose-300'}>{res.testName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 pl-5.5">{res.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* TAB 1: PROACTIVE PREDICTIONS */}
        {activeTab === 'PREDICTIONS' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-300">Proactive Assistance Engine</h4>
                <p className="text-xs text-amber-200/80">
                  Gabby continuously predicts what you are likely to need next based on your current task, system health, and active goals.
                </p>
              </div>
            </div>

            {predictions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/50 rounded-lg border border-slate-800">
                No active predictions. Send a query in the chat to generate proactive predictions.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.map((pred: any) => (
                  <div
                    key={pred.id}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                        {pred.category}
                      </span>
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {pred.likelihoodScore}% Likelihood
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white">{pred.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{pred.reasoning}</p>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 font-mono italic truncate">
                        "{pred.suggestedPrompt}"
                      </span>
                      {onSendPrompt && (
                        <button
                          onClick={() => onSendPrompt(pred.suggestedPrompt)}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                        >
                          Run <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GOAL ENGINE */}
        {activeTab === 'GOALS' && (
          <div className="space-y-6">
            {/* Create Goal Form */}
            <form onSubmit={handleAddGoal} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Add New User Goal
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Goal Title (e.g. Deploy API Fallback)"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="Short Description"
                  value={newGoalDesc}
                  onChange={(e) => setNewGoalDesc(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <div className="flex gap-2">
                  <select
                    value={newGoalPriority}
                    onChange={(e: any) => setNewGoalPriority(e.target.value)}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded text-xs font-semibold text-cyan-300 transition-colors shrink-0"
                  >
                    Add Goal
                  </button>
                </div>
              </div>
            </form>

            {/* Goals List */}
            <div className="space-y-3">
              {allGoals.map((goal: any) => (
                <div key={goal.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          goal.priority === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            : goal.priority === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {goal.priority}
                      </span>
                      <h4 className="text-sm font-bold text-white">{goal.title}</h4>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                        goal.status === 'ACTIVE'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : goal.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {goal.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">{goal.description}</p>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Progress</span>
                      <span>{goal.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="bg-cyan-500 h-full transition-all duration-500"
                        style={{ width: `${goal.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: WORLD MODEL TENSORS & PREDICTIVE LEARNING DYNAMICS */}
        {activeTab === 'WORLD_MODEL' && (
          <div className="space-y-5">
            {/* World Model Reality Pipeline Diagram Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-cyan-950/60 border border-emerald-500/30 rounded-xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Network className="w-4 h-4 text-emerald-400" />
                  Predictive World Model Architecture (Tensor State Engine)
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                  Empirical Calibration Score: {state?.worldModelTensors?.overallCalibrationScore ?? 91}%
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Gabby operates as a continuous prediction machine. Reality observation updates 4 internal Tensors (Entity, Relationship/Causal, Temporal, Uncertainty) and measures prediction errors to revise model priors.
              </p>

              {/* Prediction Error Loop Flow visualization */}
              <div className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 text-[11px] font-mono flex items-center justify-between flex-wrap gap-2 text-slate-300">
                <span className="text-cyan-400 font-bold">1. Observe Reality</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-purple-400 font-bold">2. Encode State Tensors</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-amber-400 font-bold">3. Predict Future Needs</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-rose-400 font-bold">4. Measure Prediction Error</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-emerald-400 font-bold">5. Revise Model Priors</span>
              </div>
            </div>

            {/* Multi-Timescale Memory Hierarchy Summary Card */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Multi-Timescale Memory Hierarchy (Inertia & Stability Engine)
                </span>
                <span className="text-[11px] text-slate-400">3-Tier Adaptive Decay</span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                World model stability is maintained by decoupling sensory update speeds: fast sensory observations update instantly and fade if unreinforced; user behavioral preferences update gradually based on pattern repetition; core identity and system invariants act as high-inertia foundational anchors.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg space-y-1 text-xs">
                  <div className="font-bold text-amber-400 flex items-center gap-1">
                    <span>⚡ Fast / Transient Scale</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">Sensory & visual items, current turn state.</div>
                  <div className="text-[10px] text-amber-300/80 pt-1">Velocity: INSTANT • Decay: 8%/turn</div>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-lg space-y-1 text-xs">
                  <div className="font-bold text-cyan-400 flex items-center gap-1">
                    <span>🔄 Medium / Behavioral</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">User preferences & workflow patterns.</div>
                  <div className="text-[10px] text-cyan-300/80 pt-1">Velocity: GRADUAL • Decay: 2%/turn</div>
                </div>

                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg space-y-1 text-xs">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <span>⚓ Slow / Foundational</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-sans">Operator identity & core safety axioms.</div>
                  <div className="text-[10px] text-emerald-300/80 pt-1">Velocity: HIGH INERTIA • Decay: 0%</div>
                </div>
              </div>
            </div>

            {/* 1. Entity Tensor ("What Exists") */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  1. Entity Tensor [Person, Object, Location, Concept]
                </span>
                <span className="text-slate-500">{state?.worldModelTensors?.entities?.length ?? worldGraph.nodes.length} Entities Tracked</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(state?.worldModelTensors?.entities ?? worldGraph.nodes).map((ent: any) => {
                  const tier = ent.timescaleTier || 'FAST_TRANSIENT';
                  const isSlow = tier === 'SLOW_FOUNDATIONAL';
                  const isMed = tier === 'MEDIUM_BEHAVIORAL';

                  return (
                    <div key={ent.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-xs font-bold text-white">{ent.name || ent.label}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded ${
                          isSlow
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isMed
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {isSlow ? '⚓ SLOW' : isMed ? '🔄 MEDIUM' : '⚡ FAST'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div>Category: <span className="text-cyan-300 font-mono">{ent.category}</span></div>
                        <div className="text-[10px] text-slate-500 truncate font-mono">Signature: {ent.identitySignature || ent.id}</div>
                        <div className="flex justify-between items-center pt-1 text-[10px] font-mono text-slate-400 border-t border-slate-900">
                          <span>Conf: <strong className="text-emerald-400">{ent.confidence}%</strong></span>
                          <span>Inertia: <strong className="text-slate-200">{ent.updateVelocity || 'GRADUAL'}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Relationship Tensor ("How Things Interact / Causal Understanding") */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-purple-400" />
                  2. Relationship Tensor [Causal vs Correlation Edges]
                </span>
                <span className="text-slate-500">{state?.worldModelTensors?.relationships?.length ?? worldGraph.edges.length} Edges</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(state?.worldModelTensors?.relationships ?? worldGraph.edges).map((rel: any) => (
                  <div key={rel.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">
                        {rel.sourceId} <span className="text-purple-400">→ [{rel.relation}] →</span> {rel.targetId}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${rel.isCausal ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'}`}>
                        {rel.isCausal ? 'CAUSAL EDGE' : 'CORRELATION'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Causal Weight: <strong className="text-cyan-300">{rel.causalWeight ?? rel.weight}</strong></span>
                      <span>Correlation Score: <strong className="text-amber-300">{rel.correlationScore ?? 0.85}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Epistemic State & Cognitive Entropy Tensor */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  3. Epistemic State Bounds & Cognitive Entropy Tensor
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-bold">
                  Entropy: {state?.worldModelTensors?.epistemicState?.boundary?.epistemicEntropy ?? 12}%
                </span>
              </div>

              {/* Epistemic Bounds Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Confidence Bounds</div>
                  <div className="text-sm font-bold text-emerald-400">
                    [{state?.worldModelTensors?.epistemicState?.boundary?.confidenceBounds?.[0] ?? 78}% - {state?.worldModelTensors?.epistemicState?.boundary?.confidenceBounds?.[1] ?? 96}%]
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">Empirical belief range</div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Fact vs Hypothesis Split</div>
                  <div className="text-xs font-bold text-slate-200">
                    <span className="text-emerald-400">{state?.worldModelTensors?.epistemicState?.boundary?.knownFactsCount ?? 3} Known Facts</span> •{' '}
                    <span className="text-amber-400">{state?.worldModelTensors?.epistemicState?.boundary?.hypothesesCount ?? 1} Hypotheses</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">Active cognitive breakdown</div>
                </div>

                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase">Open Epistemic Gaps</div>
                  <div className="text-[11px] text-cyan-300 truncate">
                    {state?.worldModelTensors?.epistemicState?.boundary?.openEpistemicGaps?.[0] || 'No gaps identified'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">
                    {(state?.worldModelTensors?.epistemicState?.boundary?.openEpistemicGaps?.length ?? 1)} Gaps Tracked
                  </div>
                </div>
              </div>

              {/* Active Beliefs Table */}
              {(state?.worldModelTensors?.epistemicState?.activeBeliefs || []).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Active Epistemic Beliefs Matrix:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(state?.worldModelTensors?.epistemicState?.activeBeliefs || []).map((bel: any) => {
                      const isFact = bel.status === 'KNOWN_FACT';
                      const isHypo = bel.status === 'HYPOTHESIS' || bel.status === 'UNVERIFIED_ASSUMPTION';

                      return (
                        <div key={bel.id} className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-200 truncate">{bel.topic}</span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                              isFact
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isHypo
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            }`}>
                              {bel.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Conf: <strong className="text-emerald-400">{bel.confidence}%</strong></span>
                            <span>Span: <strong className="text-slate-300">[{bel.lowerBound}% - {bel.upperBound}%]</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Temporal Tensor ("How Things Change Over Time") */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                4. Temporal Dynamics & State Trajectories [Past State → Present State → Predicted Future]
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {(state?.worldModelTensors?.temporals ?? []).map((temp: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span>Entity ID: <strong className="text-slate-200">{temp.entityId}</strong></span>
                      <div className="flex gap-2 items-center">
                        {temp.halfLifeTurns && (
                          <span className="text-[10px] text-slate-500">Half-life: {temp.halfLifeTurns} turns</span>
                        )}
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[10px]">
                          Velocity: {temp.changeVelocity}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 bg-slate-900/80 rounded border border-slate-800/80 text-[11px]">
                      <div>
                        <div className="text-slate-500 text-[10px]">PAST STATE:</div>
                        <div className="text-slate-300">{temp.pastState}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">CURRENT STATE:</div>
                        <div className="text-cyan-300 font-bold">{temp.currentState}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px]">PREDICTED FUTURE:</div>
                        <div className="text-amber-300 font-bold">{temp.predictedFutureState}</div>
                      </div>
                    </div>

                    {/* Trajectory Step History log */}
                    {(temp.trajectoryHistory || []).length > 0 && (
                      <div className="pt-1 border-t border-slate-900 text-[10px] text-slate-400 flex items-center gap-2 overflow-x-auto">
                        <span className="text-slate-500 font-bold">Turns:</span>
                        {temp.trajectoryHistory.map((step: any, sIdx: number) => (
                          <span key={sIdx} className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 whitespace-nowrap">
                            T{step.turnIndex}: {step.confidence}% conf ({step.velocity})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Active Learning & Empirical Intervention Accuracy Feedbacks */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  4. Empirical Intervention Accuracy & Prediction Error Records
                </span>
                <span className="text-slate-500 font-mono">
                  {(state?.worldModelTensors?.recentPredictionErrors || []).length} Recorded Signals
                </span>
              </div>

              {(state?.worldModelTensors?.recentPredictionErrors || []).length > 0 && (
                <div className="grid grid-cols-1 gap-2 font-mono">
                  {(state?.worldModelTensors?.recentPredictionErrors || []).map((err: any) => (
                    <div key={err.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-[10px]">
                        <span className="text-slate-400">TIMESTAMP: {new Date(err.timestamp).toLocaleTimeString()}</span>
                        <span className={`px-2 py-0.5 font-bold rounded ${
                          err.errorSignalType === 'MATCH'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {err.errorSignalType} (Error Delta: {err.predictionErrorDelta})
                        </span>
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-cyan-300">PREDICTED NEED:</strong> {err.predictedNeed}
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-purple-300">ACTUAL REALITY:</strong> {err.actualUserAction}
                      </div>
                      <div className="text-[10px] text-emerald-400 pt-1 border-t border-slate-900">
                        ✓ {err.revisedModelWeightsSummary}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active Learning Inquiries */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Active Learning Questions ("Reduce Uncertainty Most")
                </h4>
                {(state?.worldModelTensors?.activeInquiries || []).length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs bg-slate-900/50 rounded-lg">
                    Uncertainty low; no active inquiries needed.
                  </div>
                ) : (
                  (state?.worldModelTensors?.activeInquiries || []).map((inq: any) => (
                    <div key={inq.id} className="p-3 bg-slate-900 border border-amber-500/30 rounded-lg space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold">
                        <span>TOPIC: {inq.highUncertaintyTopic}</span>
                        <span>Expected Uncertainty Reduction: -{inq.expectedUncertaintyReduction}%</span>
                      </div>
                      <p className="text-slate-200 italic font-sans">"{inq.questionToReduceUncertainty}"</p>
                    </div>
                  ))
                )}
              </div>

              {/* Contradiction Log */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Contradiction Handling ("Fit Best Evidence")
                </h4>
                {(state?.worldModelTensors?.contradictionRecords || []).length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-xs bg-slate-900/50 rounded-lg">
                    No contradictions detected in world model history.
                  </div>
                ) : (
                  (state?.worldModelTensors?.contradictionRecords || []).map((rec: any) => (
                    <div key={rec.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-xs font-mono">
                      <div className="text-[10px] text-slate-400">CONFLICING EVIDENCE RESOLUTION:</div>
                      <div className="text-emerald-300 font-bold">Selected: "{rec.selectedResolution}"</div>
                      <div className="text-[10px] text-slate-500">{rec.evidenceWeightBasis}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SPECIALIST CONSORTIUM */}
        {activeTab === 'SPECIALISTS' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              7 internal domain specialists run parallel reasoning passes on every input before merging into a unified response.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'ResearchAgent', role: 'Fact Verification & Web Knowledge', icon: Sparkles, color: 'text-amber-400' },
                { name: 'SecurityAgent', role: 'Sentinel Hard Governance & KMS Rules', icon: ShieldCheck, color: 'text-rose-400' },
                { name: 'MemoryAgent', role: 'World Graph & Lineage Receipts', icon: Network, color: 'text-emerald-400' },
                { name: 'PlanningAgent', role: 'Goal Decomposition & Step Trajectories', icon: Compass, color: 'text-cyan-400' },
                { name: 'TeachingAgent', role: 'Clarity, ELI5 & Jargon-Free UX', icon: Brain, color: 'text-purple-400' },
                { name: 'Critic', role: 'Anti-Hallucination & Invariant Checks', icon: AlertTriangle, color: 'text-orange-400' },
                { name: 'Optimizer', role: 'Compute Efficiency & Response Speed', icon: Zap, color: 'text-blue-400' },
              ].map((spec) => (
                <div key={spec.name} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-3">
                  <spec.icon className={`w-5 h-5 ${spec.color} shrink-0 mt-0.5`} />
                  <div>
                    <h4 className="text-sm font-bold text-white">{spec.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{spec.role}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-800 rounded">
                      Active Specialist
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: ACTIVE PLANNER */}
        {activeTab === 'PLANNER' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                7-Phase Execution Trajectory
              </h4>

              <div className="grid grid-cols-1 gap-2">
                {[
                  { phase: 'OBSERVE', desc: 'Standardize Observation Envelope via PerceptionBus' },
                  { phase: 'UNDERSTAND', desc: 'Synthesize context from World Model graph and Goal Engine' },
                  { phase: 'PLAN', desc: 'Formulate execution steps with adaptive reasoning budget' },
                  { phase: 'SIMULATE', desc: 'Simulate risk and Sentinel boundary invariants' },
                  { phase: 'EXECUTE', desc: 'Execute response / capability call with Merkle Node commit' },
                  { phase: 'EVALUATE', desc: 'Verify grounding and user intent satisfaction' },
                  { phase: 'REFLECT', desc: 'Record continuous reflection entry and promote knowledge' },
                ].map((item, idx) => (
                  <div key={item.phase} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-cyan-400">{item.phase}</span>
                        <p className="text-slate-400 text-[11px]">{item.desc}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PERCEPTION BUS & STATUS */}
        {activeTab === 'PERCEPTION' && (
          <div className="space-y-4">
            {/* GABBY PERCEPTION STATUS PANEL */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  <Eye className="w-4 h-4 text-rose-400 animate-pulse" />
                  GABBY PERCEPTION STATUS
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  CONTINUOUS OBSERVER ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Eyes:</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">ACTIVE</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Ears:</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">ACTIVE</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Text Context:</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1">ACTIVE</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-200">Current User State:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Confusion: <strong className="text-cyan-400">{state?.learnerState?.multimodalState?.confusionProbability || 20}%</strong></div>
                  <div>Frustration: <strong className="text-amber-400">{state?.learnerState?.multimodalState?.frustrationProbability || 10}%</strong></div>
                  <div>Engagement: <strong className="text-emerald-400">{state?.learnerState?.multimodalState?.engagementProbability || 70}%</strong></div>
                  <div>Uncertainty: <strong className="text-purple-400">{state?.learnerState?.multimodalState?.uncertaintyProbability || 30}%</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Confidence:</div>
                  <div className="text-sm font-bold text-slate-200 mt-0.5">{state?.learnerState?.multimodalState?.confidence || 0.85}</div>
                </div>
                <div className="p-2.5 bg-slate-900 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-400">Current Strategy:</div>
                  <div className="text-xs font-bold text-cyan-300 mt-0.5 truncate">{state?.learnerState?.strategy?.primaryStrategy || 'SIMPLIFY_AND_GUIDE'}</div>
                </div>
              </div>

              {state?.learnerState?.multimodalState?.evidence && (
                <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800/80 space-y-1 text-[11px]">
                  <div className="text-slate-400 font-bold">Inference Evidence:</div>
                  {state.learnerState.multimodalState.evidence.map((ev: string, idx: number) => (
                    <div key={idx} className="text-slate-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      {ev}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Perception Bus History ({recentObs.length})</h5>
              {recentObs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/50 rounded-lg border border-slate-800">
                  No observations ingested yet. Live stream active.
                </div>
              ) : (
                recentObs.map((obs: any) => (
                  <div key={obs.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{obs.modality} Envelope</span>
                      <span className="text-slate-500 text-[10px]">{new Date(obs.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono truncate">"{obs.rawContent}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
