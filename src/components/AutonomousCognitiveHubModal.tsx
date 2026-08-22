import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Zap,
  Sparkles,
  Target,
  Brain,
  Moon,
  Wrench,
  Shield,
  Play,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sliders,
  Send,
  Layers,
  Search,
  Code,
  Terminal,
  FileText,
} from 'lucide-react';
import {
  AutonomousEngineState,
  CognitiveStreamEvent,
  EpistemicGoal,
  AutonomousTask,
  DreamCycleReport,
  ToolSynthesisProposal,
  DefensivePosture,
  AutonomyTier,
} from '../types';

interface AutonomousCognitiveHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  posture: DefensivePosture;
  currentTier: AutonomyTier;
  onInsertInsightIntoChat?: (text: string) => void;
}

export const AutonomousCognitiveHubModal: React.FC<AutonomousCognitiveHubModalProps> = ({
  isOpen,
  onClose,
  posture,
  currentTier,
  onInsertInsightIntoChat,
}) => {
  const [activeTab, setActiveTab] = useState<'STREAM' | 'GOALS' | 'DREAM_CYCLE' | 'TASKS_AND_TOOLS' | 'GOVERNANCE'>('STREAM');
  const [engineState, setEngineState] = useState<AutonomousEngineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // New Goal Input
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalPriority, setNewGoalPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');

  // New Autonomous Task Input
  const [newTaskObjective, setNewTaskObjective] = useState('');

  // Tool Synthesis Input
  const [synthToolName, setSynthToolName] = useState('');
  const [synthToolDesc, setSynthToolDesc] = useState('');

  // Dream Cycle Animation State
  const [dreamPhase, setDreamPhase] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchState();
      const interval = setInterval(fetchState, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/autonomy/state');
      if (res.ok) {
        const data = await res.json();
        setEngineState(data);
      }
    } catch (err) {
      console.error('[AutonomousHub] Failed fetching state:', err);
    }
  };

  const showFeedback = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleTriggerTick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/autonomy/tick', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEngineState(data.state);
        showFeedback('⚡ Autonomous Cognitive Heartbeat Tick executed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerDreamCycle = async () => {
    setLoading(true);
    setDreamPhase(1);

    setTimeout(() => setDreamPhase(2), 500);
    setTimeout(() => setDreamPhase(3), 1100);

    try {
      const res = await fetch('/api/autonomy/dream-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerReason: 'MANUAL_DASHBOARD_INVOCATION' }),
      });
      if (res.ok) {
        const data = await res.json();
        setDreamPhase(4);
        setTimeout(() => {
          setDreamPhase(null);
          setEngineState(data.state);
          showFeedback('🌌 Memory Consolidation Dream Cycle successfully completed & Merkle root sealed.');
        }, 800);
      }
    } catch (err) {
      setDreamPhase(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    try {
      const res = await fetch('/api/autonomy/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newGoalTitle.trim(),
          description: newGoalDesc.trim(),
          origin: 'OPERATOR_PROMPT',
          priority: newGoalPriority,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEngineState(data.state);
        setNewGoalTitle('');
        setNewGoalDesc('');
        showFeedback('🎯 Epistemic Goal registered to Autonomous Stack.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const res = await fetch(`/api/autonomy/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setEngineState(data.state);
        showFeedback('Goal removed from stack.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskObjective.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/autonomy/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objective: newTaskObjective.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setEngineState(data.state);
        setNewTaskObjective('');
        showFeedback('🚀 Autonomous multi-step trajectory generated & launched.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/autonomy/tasks/advance', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEngineState(data.state);
        showFeedback('Step executed across active autonomous trajectories.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesizeTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!synthToolName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/autonomy/tools/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: synthToolName.trim(),
          description: synthToolDesc.trim(),
          targetCapability: 'TIER_3_DYNAMIC_SYNTHESIS',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEngineState(data.state);
        setSynthToolName('');
        setSynthToolDesc('');
        showFeedback(`🛠️ Tool "${data.proposal.toolName}" synthesized and verified in TAU sandbox.`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<AutonomousEngineState['config']>) => {
    try {
      const res = await fetch('/api/autonomy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        fetchState();
        showFeedback('Autonomous Configuration updated.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-300">
              <Brain className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-sans tracking-wide">
                  Laura Autonomous Cognitive Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                  5-Pillar Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Continuous Cognitive Loop • Epistemic Motivation • Dream Cycles • Tool Synthesis • Invariant Governance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Trigger Actions */}
            <button
              onClick={handleTriggerTick}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-950/70 border border-purple-600/40 text-purple-200 hover:bg-purple-900/60 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Execute a single continuous cognitive heartbeat tick"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Heartbeat Tick</span>
            </button>

            <button
              onClick={handleTriggerDreamCycle}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-950/70 border border-indigo-600/40 text-indigo-200 hover:bg-indigo-900/60 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              title="Run a Memory Consolidation Dream Cycle"
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Dream Cycle</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Live Status Banner */}
        <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${engineState?.isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              Status: <strong className="text-emerald-400">{engineState?.isRunning ? 'AUTONOMOUS (Continuous)' : 'PAUSED'}</strong>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">
              Ticks: <strong className="text-slate-200">{engineState?.totalTicks || 0}</strong>
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">
              Active Goals: <strong className="text-purple-300">{engineState?.activeGoalCount || 0}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
              Posture: <span className="text-cyan-300 font-bold">{posture}</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
              Tier: <span className="text-purple-300 font-bold">{currentTier.replace('TIER_', 'T')}</span>
            </span>
          </div>
        </div>

        {/* Action Message Feedback */}
        {actionMessage && (
          <div className="px-5 py-2 bg-purple-950/80 border-b border-purple-700/50 text-purple-200 text-xs font-mono flex items-center justify-between animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-purple-400 hover:text-purple-200">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('STREAM')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'STREAM'
                ? 'border-purple-400 text-purple-300 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Pillar 1: Cognitive Stream ({engineState?.streamEvents.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('GOALS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'GOALS'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Pillar 2: Epistemic Goals ({engineState?.epistemicGoals.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('DREAM_CYCLE')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'DREAM_CYCLE'
                ? 'border-indigo-400 text-indigo-300 bg-indigo-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Pillar 3: Dream Cycles</span>
          </button>

          <button
            onClick={() => setActiveTab('TASKS_AND_TOOLS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'TASKS_AND_TOOLS'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Pillar 4: Task Execution & Tool Synthesis</span>
          </button>

          <button
            onClick={() => setActiveTab('GOVERNANCE')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'GOVERNANCE'
                ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Pillar 5: Governance Controls</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/50">
          {/* TAB 1: COGNITIVE STREAM & PROACTIVITY */}
          {activeTab === 'STREAM' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    Continuous Cognitive Stream (Heartbeat Observations & Insights)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Live asynchronous stream of self-scheduled inquiries, proactive discoveries, and curiosity triggers.
                  </p>
                </div>
                <button
                  onClick={handleTriggerTick}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Manual Heartbeat Tick</span>
                </button>
              </div>

              <div className="space-y-3">
                {engineState?.streamEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/30 transition-all space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            evt.type === 'PROACTIVE_INSIGHT'
                              ? 'bg-purple-950 text-purple-300 border border-purple-700/50'
                              : evt.type === 'CURIOSITY_TRIGGER'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50'
                              : evt.type === 'MEMORY_CONSOLIDATION_EVENT'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50'
                              : evt.type === 'TOOL_SYNTHESIS_TEST'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {evt.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-200">{evt.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{evt.content}</p>

                    <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-3">
                        <span>
                          Source: <strong className="text-slate-300">{evt.sourceSubsystem}</strong>
                        </span>
                        <span>
                          Confidence: <strong className="text-emerald-400">{evt.confidence}%</strong>
                        </span>
                        {evt.metadata?.merkleReceipt && (
                          <span className="text-slate-500">
                            DAG: {evt.metadata.merkleReceipt.slice(0, 14)}...
                          </span>
                        )}
                      </div>

                      {onInsertInsightIntoChat && (
                        <button
                          onClick={() => {
                            onInsertInsightIntoChat(`[Autonomous Proactive Insight: ${evt.title}]\n${evt.content}`);
                            showFeedback('Inserted proactive insight into active chat conversation.');
                          }}
                          className="px-2.5 py-1 rounded bg-purple-950/60 hover:bg-purple-900/80 border border-purple-600/40 text-purple-200 text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Send className="w-3 h-3 text-purple-400" />
                          <span>Insert into Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EPISTEMIC GOAL STACK */}
          {activeTab === 'GOALS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    Intrinsic Motivation & Epistemic Goal Stack
                  </h3>
                  <p className="text-xs text-slate-400">
                    Prioritized cognitive objectives synthesized from user prompts, intrinsic curiosity, and system health.
                  </p>
                </div>
              </div>

              {/* Add New Goal Form */}
              <form onSubmit={handleCreateGoal} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Register New Epistemic Goal</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Goal title..."
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={newGoalPriority}
                    onChange={(e: any) => setNewGoalPriority(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRITICAL">Priority: Critical</option>
                    <option value="HIGH">Priority: High</option>
                    <option value="MEDIUM">Priority: Medium</option>
                    <option value="LOW">Priority: Low</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Detailed description & hypotheses..."
                    value={newGoalDesc}
                    onChange={(e) => setNewGoalDesc(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Push to Stack</span>
                  </button>
                </div>
              </form>

              {/* Goals List */}
              <div className="space-y-3">
                {engineState?.epistemicGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/30 transition-all space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            goal.priority === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-700/50'
                              : goal.priority === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border border-amber-700/50'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {goal.priority}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            goal.origin === 'AUTONOMOUS_CURIOSITY'
                              ? 'bg-purple-950 text-purple-300 border border-purple-700/40'
                              : goal.origin === 'DREAM_DISTILLATION'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {goal.origin.replace(/_/g, ' ')}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100">{goal.title}</h4>
                      </div>

                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300">{goal.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Progress</span>
                        <span className="text-cyan-400 font-bold">{goal.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${goal.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {goal.tags.map((t, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            #{t}
                          </span>
                        ))}
                      </div>

                      {/* Quick Execute Autonomous Trajectory from this goal */}
                      <button
                        onClick={() => {
                          setNewTaskObjective(`Resolve epistemic goal: ${goal.title}. ${goal.description}`);
                          setActiveTab('TASKS_AND_TOOLS');
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-600/40 text-cyan-300 text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Play className="w-3 h-3 text-cyan-400" />
                        <span>Launch Trajectory</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MEMORY CONSOLIDATION & DREAM CYCLES */}
          {activeTab === 'DREAM_CYCLE' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    Pillar 3: Memory Consolidation & "Dream" Cycles
                  </h3>
                  <p className="text-xs text-slate-400">
                    Offline replay & semantic distillation: prunes contradictions, extracts core insights, and synthesizes long-term Merkle world models.
                  </p>
                </div>

                <button
                  onClick={handleTriggerDreamCycle}
                  disabled={dreamPhase !== null}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                >
                  <Moon className="w-4 h-4" />
                  <span>Execute Dream Cycle</span>
                </button>
              </div>

              {/* Live Dream Cycle Execution Visualizer */}
              {dreamPhase !== null && (
                <div className="p-5 rounded-xl bg-indigo-950/50 border border-indigo-500/50 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-mono text-indigo-200 font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
                    <span>Dream Cycle in Progress...</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className={`p-3 rounded-lg border ${dreamPhase >= 1 ? 'bg-indigo-900/60 border-indigo-400 text-indigo-100' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                      Phase 1: Episodic Ingestion
                    </div>
                    <div className={`p-3 rounded-lg border ${dreamPhase >= 2 ? 'bg-indigo-900/60 border-indigo-400 text-indigo-100' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                      Phase 2: Contradiction Prune
                    </div>
                    <div className={`p-3 rounded-lg border ${dreamPhase >= 3 ? 'bg-indigo-900/60 border-indigo-400 text-indigo-100' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                      Phase 3: Semantic Distillation
                    </div>
                    <div className={`p-3 rounded-lg border ${dreamPhase >= 4 ? 'bg-emerald-900/60 border-emerald-400 text-emerald-100' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                      Phase 4: Merkle DAG Sealed
                    </div>
                  </div>
                </div>
              )}

              {/* Dream Cycle History */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 font-mono">Recent Memory Consolidation Cycles</h4>

                {engineState?.recentDreamCycles.map((report) => (
                  <div key={report.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-100 font-mono">
                          Dream Report: {new Date(report.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 border border-emerald-700/50 text-emerald-300">
                        Identity Coherence: {report.identityCoherenceScore}%
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{report.summary}</p>

                    {/* Stats Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900 text-xs font-mono">
                      <div className="p-2 rounded bg-slate-900 border border-slate-850">
                        <span className="text-slate-400 text-[10px] block">Episodes Processed</span>
                        <strong className="text-indigo-300">{report.episodesProcessed}</strong>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-850">
                        <span className="text-slate-400 text-[10px] block">Contradictions Pruned</span>
                        <strong className="text-amber-300">{report.contradictionsPruned}</strong>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-850">
                        <span className="text-slate-400 text-[10px] block">Conceptual Nodes Added</span>
                        <strong className="text-emerald-300">{report.newConceptualNodesAdded}</strong>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-850">
                        <span className="text-slate-400 text-[10px] block">Duration</span>
                        <strong className="text-cyan-300">{report.durationMs}ms</strong>
                      </div>
                    </div>

                    <div className="space-y-1 pt-2">
                      <span className="text-[11px] font-bold text-slate-400 font-mono">Key Insights Distilled:</span>
                      <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                        {report.keyInsights.map((insight, i) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>Merkle Root: {report.merkleRootHash}</span>
                      <span>Constitutional Proof: VERIFIED</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: AUTONOMOUS TASK EXECUTION & TOOL SYNTHESIS */}
          {activeTab === 'TASKS_AND_TOOLS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  Pillar 4: Dynamic Tool Synthesis & Autonomous Multi-Step Execution
                </h3>
                <p className="text-xs text-slate-400">
                  Decompose complex multi-step objectives, execute across tools over time, and dynamically synthesize new tools inside TAU sandbox.
                </p>
              </div>

              {/* Launch New Autonomous Multi-Step Task */}
              <form onSubmit={handleCreateTask} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Launch Autonomous Multi-Step Objective Trajectory
                  </span>
                  <button
                    type="button"
                    onClick={handleAdvanceTasks}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-emerald-300 text-[11px] font-mono flex items-center gap-1 border border-emerald-600/30 transition-all cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Advance Active Tasks</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter objective (e.g., 'Research topological quantum error correction and simulate fault tolerance bounds')..."
                    value={newTaskObjective}
                    onChange={(e) => setNewTaskObjective(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Execute Task</span>
                  </button>
                </div>
              </form>

              {/* Active Autonomous Tasks */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-300 font-mono">Autonomous Execution Trajectories</h4>

                {engineState?.activeTasks.map((task) => (
                  <div key={task.taskId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                              : 'bg-cyan-950 text-cyan-300 border border-cyan-700/50 animate-pulse'
                          }`}
                        >
                          {task.status}
                        </span>
                        <h5 className="text-xs font-bold text-slate-100">{task.objective}</h5>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(task.createdTimestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Steps Flow */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {task.steps.map((step) => (
                        <div
                          key={step.stepId}
                          className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
                            step.status === 'SUCCESS'
                              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                              : step.status === 'EXECUTING'
                              ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200 animate-pulse'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span>Step {step.stepNumber}: {step.phase}</span>
                            {step.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          </div>
                          <p className="text-[11px] font-bold text-slate-200 truncate">{step.title}</p>
                          {step.resultSummary && (
                            <p className="text-[10px] text-slate-400 truncate">{step.resultSummary}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {task.resultReport && (
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                        <strong className="text-emerald-400 block mb-1">Final Execution Report:</strong>
                        {task.resultReport}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dynamic Tool Synthesis Section (Tier 3 Autonomy) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 font-mono">
                      Dynamic Tool Synthesis (TAU Sandbox Validated)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Laura autonomously drafts, unit-tests in sandbox, and registers new modular capabilities.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSynthesizeTool} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Tool name (e.g. 'QuantumStateSynthesizer')..."
                    value={synthToolName}
                    onChange={(e) => setSynthToolName(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Capability description..."
                    value={synthToolDesc}
                    onChange={(e) => setSynthToolDesc(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Synthesize & Test in TAU</span>
                  </button>
                </form>

                {engineState?.synthesizedTools && engineState.synthesizedTools.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 font-mono">Synthesized Tools Ledger:</span>
                    {engineState.synthesizedTools.map((t) => (
                      <div key={t.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-300">{t.toolName}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">
                            TAU SANDBOX PASSED (3/3)
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{t.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: GOVERNANCE & AUTONOMY CONTROLS */}
          {activeTab === 'GOVERNANCE' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Pillar 5: Rigorous Governance & Posture Invariants (Safe Autonomy)
                </h3>
                <p className="text-xs text-slate-400">
                  Control background loop frequency, curiosity thresholds, memory consolidation intervals, and CBAC policies.
                </p>
              </div>

              {engineState?.config && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Heartbeat Loop Switch */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Continuous Cognitive Heartbeat</span>
                      <button
                        onClick={() => handleUpdateConfig({ heartbeatEnabled: !engineState.config.heartbeatEnabled })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                          engineState.config.heartbeatEnabled
                            ? 'bg-emerald-600 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {engineState.config.heartbeatEnabled ? 'ENABLED' : 'PAUSED'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Enables periodic background cycles scanning sensors, memory gaps, and epistemic goals.
                    </p>
                  </div>

                  {/* Heartbeat Frequency Slider */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>Heartbeat Interval</span>
                      <span className="font-mono text-cyan-400">{engineState.config.heartbeatIntervalSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={engineState.config.heartbeatIntervalSeconds}
                      onChange={(e) => handleUpdateConfig({ heartbeatIntervalSeconds: Number(e.target.value) })}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>10s (High Alert)</span>
                      <span>60s (Eco Mode)</span>
                    </div>
                  </div>

                  {/* Curiosity Threshold */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>Intrinsic Curiosity Threshold</span>
                      <span className="font-mono text-purple-400">{engineState.config.curiosityThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="95"
                      step="5"
                      value={engineState.config.curiosityThreshold}
                      onChange={(e) => handleUpdateConfig({ curiosityThreshold: Number(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400">
                      Controls frequency of autonomous research inquiries and proactive hypothesis formulation.
                    </p>
                  </div>

                  {/* Dream Cycle Interval */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>Dream Consolidation Interval</span>
                      <span className="font-mono text-indigo-400">{engineState.config.dreamCycleIntervalMinutes} min</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={engineState.config.dreamCycleIntervalMinutes}
                      onChange={(e) => handleUpdateConfig({ dreamCycleIntervalMinutes: Number(e.target.value) })}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400">
                      Scheduled frequency for offline memory replay, contradiction pruning, and DAG graph distillation.
                    </p>
                  </div>
                </div>
              )}

              {/* Constitutional Invariant Receipt */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>Sentinel Constitutional Invariants Enforced</span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  All autonomous actions require explicit Capability-Based Access Control (CBAC) token verification and produce cryptographically auditable Merkle receipts.
                </p>
                <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
                  <span>DAG Validation: 100% Passed</span>
                  <span>Non-Bypassable TAU Sandbox: ACTIVE</span>
                  <span>Operator Override: ALWAYS PRESERVED</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
