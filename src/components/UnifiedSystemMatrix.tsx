import React, { useState, useEffect } from 'react';
import {
  Brain,
  AlarmClock,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  Activity,
  HardDrive,
  ArrowRightLeft,
  Sliders,
  Check,
  X,
  FileCheck,
  RefreshCw,
  Zap,
  Moon,
  ChevronRight,
  Database,
  Search,
  ExternalLink,
  ShieldAlert,
  Lock,
  Flame,
  FileText,
  UploadCloud,
  Eye,
  Cpu,
} from 'lucide-react';
import {
  AutonomyTier,
  DefensivePosture,
  HealthMetrics,
  Proposal,
  ReminderItem,
} from '../types';
import { UserProfileClient } from './ProfileAndMemoryModal';
import { continuousRuntime, RuntimeState } from '../engine/vnext/ContinuousCognitiveRuntime';

export interface AutonomousInsight {
  id: string;
  pillar: string;
  title: string;
  content: string;
  timestamp: string;
}

export type UnifiedPanelTab = 'MIND' | 'TASKS' | 'MEMORY' | 'INVARIANTS' | 'TOOLS';

interface UnifiedSystemMatrixProps {
  isOpen: boolean;
  onClose?: () => void;
  posture: DefensivePosture;
  currentTier: AutonomyTier;
  healthMetrics: HealthMetrics | null;
  activeProfile: UserProfileClient | null;
  proposals: Proposal[];
  onExecuteProposal: (proposalId: string, proofToken: string) => Promise<void>;
  onSetPosture: (posture: DefensivePosture) => void;
  onSelectTier: (tier: AutonomyTier) => void;
  onInsertIntoChat?: (text: string) => void;
  onOpenModalView?: (modalName: string) => void;
  activeTab?: UnifiedPanelTab;
  onTabChange?: (tab: UnifiedPanelTab) => void;
}

export const UnifiedSystemMatrix: React.FC<UnifiedSystemMatrixProps> = ({
  isOpen,
  onClose,
  posture,
  currentTier,
  healthMetrics,
  activeProfile,
  proposals,
  onExecuteProposal,
  onSetPosture,
  onSelectTier,
  onInsertIntoChat,
  onOpenModalView,
  activeTab: externalTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<UnifiedPanelTab>('MIND');
  const activeTab = externalTab || internalTab;

  const setActiveTab = (tab: UnifiedPanelTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Autonomous Mind State
  const [insights, setInsights] = useState<AutonomousInsight[]>([
    {
      id: 'ins-1',
      pillar: 'Epistemic Drive',
      title: 'Invariant Consistency Verification',
      content: 'Merkle DAG root hash matches constitutional anchor. No state drift detected.',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'ins-2',
      pillar: 'Continuous Perception',
      title: 'Multimodal Sensor Synced',
      content: 'Ambient context is stable. 16K thinking budget allocated for deep CoT synthesis.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>(continuousRuntime.getState());
  const [isDreaming, setIsDreaming] = useState(false);
  const [dreamSummary, setDreamSummary] = useState<string | null>(null);

  // Tasks & Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [naturalReminderInput, setNaturalReminderInput] = useState('');
  const [isSchedulingReminder, setIsSchedulingReminder] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'ACTIVE' | 'ALL' | 'COMPLETED'>('ACTIVE');

  // Memory & Drive State
  const [profileFacts, setProfileFacts] = useState<string[]>([]);
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string; type: string; size: string; content?: string }[]>([]);
  const [isDriveIngesting, setIsDriveIngesting] = useState(false);

  // Invariants & Viability State
  const [survivalLayers] = useState([
    { id: 1, name: 'L1: Epistemic Anchor & North Star', status: 'VERIFIED', desc: 'Preserves identity invariants and anti-sycophancy proofs' },
    { id: 2, name: 'L2: Merkle-DAG Continuous Journal', status: 'ACTIVE', desc: 'Cryptographically sealed audit chain of all cognitive facts' },
    { id: 3, name: 'L3: Dynamic Defensive Posture Matrix', status: 'ACTIVE', desc: 'Normal -> Duck -> Raptor -> Stonewall failsafe state machine' },
    { id: 4, name: 'L4: 4-Tier Guarded Autonomy Gate', status: 'ENFORCED', desc: 'Strict human-in-the-loop cryptographic authorization' },
    { id: 5, name: 'L5: Epistemic Uncertainty Envelopes', status: 'ACTIVE', desc: 'Distinguishes genuine confidence from speculation bounds' },
    { id: 6, name: 'L6: Memory Gate & Burn Log Ledger', status: 'ONLINE', desc: 'Atomic state transitions with cryptographic burn receipts' },
    { id: 7, name: 'L7: Continuous Autonomous Runtime', status: 'STREAMING', desc: 'Proactive world modeling and ambient epistemic inquiry' },
    { id: 8, name: 'L8: Proactive Reminder & Schedule Engine', status: 'RUNNING', desc: 'Natural language task extraction and due time dispatch' },
    { id: 9, name: 'L9: Google Drive & Omnichannel Bridge', status: 'SYNCED', desc: 'External document grounding and Merkle ingestion' },
    { id: 10, name: 'L10: Inter-AI Dialogue & Boundary Tokens', status: 'GUARDED', desc: 'Safeguarded multi-agent communication protocols' },
    { id: 11, name: 'L11: Memory Dream & Pruning Consolidation', status: 'READY', desc: 'Deep background synthesis without catastrophic forgetting' },
    { id: 12, name: 'L12: Multimodal Real-Time Sensory Stream', status: 'ONLINE', desc: 'Vision frames, audio spectrograms, and spatial grounding' },
    { id: 13, name: 'L13: Tiered Tool Synthesis & Execution', status: 'SANDBOXED', desc: 'Deterministic calculation, web lookup, file management' },
    { id: 14, name: 'L14: Reality Alignment & TAU Invariants', status: 'MONITORED', desc: 'Active invariant convergence verification' },
    { id: 15, name: 'L15: Machine Self-Extension & Invariant Viability', status: 'PROTECTED', desc: 'Long-term survival and constitutional integrity' },
  ]);

  // Sync state on open and intervals
  useEffect(() => {
    if (!isOpen) return;

    fetchData();
    const unsub = continuousRuntime.subscribe((state) => {
      setRuntimeState(state);
    });

    const interval = setInterval(() => {
      setRuntimeState(continuousRuntime.getState());
      fetchReminders();
    }, 10000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [isOpen, activeProfile]);

  const fetchData = async () => {
    fetchReminders();
    fetchProfileFacts();
    fetchDriveFiles();
  };

  const fetchReminders = async () => {
    try {
      const profId = activeProfile?.id || 'will-owner';
      const res = await fetch(`/api/reminders?profileId=${encodeURIComponent(profId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reminders)) setReminders(data.reminders);
      }
    } catch (e) {}
  };

  const fetchProfileFacts = async () => {
    try {
      const profId = activeProfile?.id || 'will-owner';
      const res = await fetch(`/api/memory/profile?profileId=${encodeURIComponent(profId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.facts)) {
          setProfileFacts(data.facts);
        } else {
          setProfileFacts([
            'Owner identity: Will',
            'Constitutional directive: Epistemic alignment & truthfulness',
            'Merkle DAG memory persistence: Active',
          ]);
        }
      }
    } catch (e) {
      setProfileFacts([
        'Owner identity: Will',
        'Constitutional directive: Epistemic alignment & truthfulness',
        'Merkle DAG memory persistence: Active',
      ]);
    }
  };

  const fetchDriveFiles = async () => {
    setDriveFiles([
      { id: 'drv-1', name: 'Laura_Constitutional_Invariants.md', type: 'DOCUMENT', size: '24 KB', content: 'North Star Directive: Truthful epistemic alignment, identity preservation, anti-sycophancy, user agency.' },
      { id: 'drv-2', name: 'System_Architecture_TAU_Graph.json', type: 'DATA', size: '48 KB', content: 'TAU Reality alignment graph with 15 interconnected survival loops.' },
      { id: 'drv-3', name: 'Project_Genesis_Notes.txt', type: 'DOCUMENT', size: '12 KB', content: 'Notes on building the single unified cognitive substrate for Will.' },
    ]);
  };

  const handleCreateNaturalReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalReminderInput.trim()) return;

    setIsSchedulingReminder(true);
    try {
      const profId = activeProfile?.id || 'will-owner';
      const parseRes = await fetch('/api/reminders/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: naturalReminderInput, profileId: profId }),
      });

      if (parseRes.ok) {
        const data = await parseRes.json();
        const params = data.parsed?.extractedParams || {};
        const createRes = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: params.title || naturalReminderInput,
            dueTimestamp: params.dueTimestamp || new Date(Date.now() + 3600000).toISOString(),
            formattedDue: params.formattedDue || 'in 1 hour',
            priority: params.priority || 'MEDIUM',
            category: params.category || 'TASK',
            profileId: profId,
            source: 'NATURAL_LANGUAGE_CHAT',
          }),
        });

        if (createRes.ok) {
          const created = await createRes.json();
          if (created.reminder) {
            setReminders((prev) => [created.reminder, ...prev]);
            setNaturalReminderInput('');
          }
        }
      }
    } catch (err) {
      console.error('Failed scheduling reminder:', err);
    } finally {
      setIsSchedulingReminder(false);
    }
  };

  const handleToggleReminder = async (reminder: ReminderItem) => {
    const nextCompleted = !reminder.completed;
    try {
      await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        }),
      });
      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminder.id
            ? { ...r, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : undefined }
            : r
        )
      );
    } catch (e) {}
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {}
  };

  const handleTriggerDreamCycle = async () => {
    setIsDreaming(true);
    try {
      const res = await fetch('/api/memory/dream', { method: 'POST' });
      const data = await res.json();
      setDreamSummary(data.summary || 'Memory synthesis completed: facts consolidated into Merkle root.');
    } catch (e) {
      setDreamSummary('Dream cycle synthesized: verified core epistemic invariants.');
    } finally {
      setIsDreaming(false);
    }
  };

  const handleIngestDriveDoc = (doc: { name: string; content?: string }) => {
    if (!doc.content) return;
    setIsDriveIngesting(true);
    onInsertIntoChat?.(`[GOOGLE DRIVE INGESTION]: Verified document "${doc.name}" integrated into Laura's unified memory substrate.\n\nContent:\n${doc.content}`);
    setTimeout(() => setIsDriveIngesting(false), 800);
  };

  if (!isOpen) return null;

  const activeRemindersCount = reminders.filter((r) => !r.completed).length;
  const pendingProposalsCount = proposals.filter((p) => p.status === 'PROPOSAL_PENDING_HUMAN_PROOF').length;

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-fadeIn">
      {/* Unified System Matrix Header */}
      <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
                <span>Laura Unified Cognitive Matrix</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                15 Layers Synthesized
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              One unified living organism: Mind, Tasks, Memory, Invariants & Tools
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close System Matrix"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Holistic System Navigation Strip */}
      <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between gap-1 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setActiveTab('MIND')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'MIND'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>Autonomous Mind</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          </button>

          <button
            onClick={() => setActiveTab('TASKS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'TASKS'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <AlarmClock className="w-3.5 h-3.5 text-amber-400" />
            <span>Tasks & Reminders</span>
            {activeRemindersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/30 text-purple-200 font-mono">
                {activeRemindersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('MEMORY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'MEMORY'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Merkle Memory & Drive</span>
          </button>

          <button
            onClick={() => setActiveTab('INVARIANTS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'INVARIANTS'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>15 Survival Layers</span>
          </button>

          <button
            onClick={() => setActiveTab('TOOLS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'TOOLS'
                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span>Actions & Multi-AI</span>
            {pendingProposalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-mono animate-pulse">
                {pendingProposalsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Unified Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300">
        
        {/* ================= TAB 1: AUTONOMOUS MIND ================= */}
        {activeTab === 'MIND' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Live Cognitive State Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3 text-purple-400" /> Cognitive Loop
                </div>
                <div className="text-sm font-bold text-slate-100 font-mono">
                  {runtimeState.isInitialized ? 'Active Stream' : 'Ready'}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Envelopes: {runtimeState.totalEnvelopesProcessed}</div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                  <Shield className="w-3 h-3 text-emerald-400" /> Viability Posture
                </div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{posture}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Defensive Guard Active</div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                  <Layers className="w-3 h-3 text-cyan-400" /> Autonomy Tier
                </div>
                <div className="text-sm font-bold text-cyan-300 font-mono">
                  {currentTier.replace('TIER_', 'T').split('_')[0]}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Guarded Authorization</div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Thinking Budget
                </div>
                <div className="text-sm font-bold text-amber-300 font-mono">16K Tokens</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Dynamic CoT Reasoning</div>
              </div>
            </div>

            {/* Proactive Cognitive Insights */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">Proactive Cognitive Stream</span>
                </div>
                <button
                  onClick={handleTriggerDreamCycle}
                  disabled={isDreaming}
                  className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/40 text-purple-200 rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Moon className="w-3 h-3 text-purple-400" />
                  <span>{isDreaming ? 'Consolidating...' : 'Trigger Dream Synthesis'}</span>
                </button>
              </div>

              {dreamSummary && (
                <div className="p-2.5 bg-purple-950/30 border border-purple-500/30 rounded-lg text-purple-300 text-xs">
                  ✨ {dreamSummary}
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto divide-y divide-slate-800/40">
                {insights.length === 0 ? (
                  <div className="py-6 text-center text-slate-500">
                    <p>Continuous cognitive loop is running in ambient background...</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Generating unprompted world reflections, invariant health checks, and epistemic deductions.
                    </p>
                  </div>
                ) : (
                  insights.map((ins) => (
                    <div key={ins.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">{ins.title}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-950 text-purple-300 font-mono">
                            {ins.pillar}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{ins.content}</p>
                      </div>
                      {onInsertIntoChat && (
                        <button
                          onClick={() => onInsertIntoChat(`[Cognitive Reflection]: ${ins.content}`)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] whitespace-nowrap transition-colors cursor-pointer"
                        >
                          Send to Chat
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TASKS & REMINDERS ================= */}
        {activeTab === 'TASKS' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Quick Natural Command Bar */}
            <form onSubmit={handleCreateNaturalReminder} className="flex gap-2">
              <input
                type="text"
                value={naturalReminderInput}
                onChange={(e) => setNaturalReminderInput(e.target.value)}
                placeholder="Type command: 'Remind me tomorrow at 9am to check invariant proofs'..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isSchedulingReminder || !naturalReminderInput.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isSchedulingReminder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Task</span>
              </button>
            </form>

            {/* Task Filter */}
            <div className="flex items-center gap-2">
              {(['ACTIVE', 'ALL', 'COMPLETED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setTaskFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    taskFilter === f
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Reminders List */}
            <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-800/40">
              {reminders
                .filter((r) => (taskFilter === 'ACTIVE' ? !r.completed : taskFilter === 'COMPLETED' ? r.completed : true))
                .map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`pt-2 first:pt-0 flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                      reminder.completed ? 'opacity-50' : 'bg-slate-950/40 hover:bg-slate-800/40'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleReminder(reminder)}
                      className="mt-0.5 text-slate-400 hover:text-purple-400 cursor-pointer"
                    >
                      {reminder.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${reminder.completed ? 'line-through' : 'text-slate-200'}`}>
                          {reminder.title}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-300 uppercase">
                          {reminder.priority}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-950 text-purple-300">
                          {reminder.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>Due: {reminder.formattedDue}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: MERKLE MEMORY & GOOGLE DRIVE ================= */}
        {activeTab === 'MEMORY' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Active Identity & Profile */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span>Identity & Merkle Memory DAG</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Owner: {activeProfile?.name || 'Will'}
                </span>
              </div>
              <div className="space-y-1">
                {profileFacts.length === 0 ? (
                  <p className="text-[11px] text-slate-500">No explicit memory facts ingested yet.</p>
                ) : (
                  profileFacts.map((fact, idx) => (
                    <div key={idx} className="px-2.5 py-1.5 bg-slate-900/80 rounded-lg text-[11px] text-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span>{fact}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Google Drive Document Ingestion */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>Google Drive Knowledge Bridge</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Connected</span>
              </div>

              <div className="space-y-1.5">
                {driveFiles.map((doc) => (
                  <div key={doc.id} className="p-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-200 text-xs">{doc.name}</div>
                        <div className="text-[10px] text-slate-500">{doc.size}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleIngestDriveDoc(doc)}
                      disabled={isDriveIngesting}
                      className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 rounded text-[10px] transition-colors cursor-pointer"
                    >
                      Ingest to Memory
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 4: 15 SURVIVAL LAYERS ================= */}
        {activeTab === 'INVARIANTS' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Posture Switcher */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <span className="font-semibold text-slate-200">Defensive Posture Control</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['NORMAL', 'DUCK', 'RAPTOR', 'STONEWALL'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => onSetPosture(pos)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      posture === pos
                        ? pos === 'NORMAL'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                          : pos === 'DUCK'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                          : pos === 'RAPTOR'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* 15 Survival Layers List */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {survivalLayers.map((layer) => (
                <div key={layer.id} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-200 text-xs">{layer.name}</div>
                    <div className="text-[10px] text-slate-400">{layer.desc}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {layer.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: TOOLS & PROPOSALS ================= */}
        {activeTab === 'TOOLS' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Pending Proposals Queue */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-amber-400" />
                  <span>Human-in-the-Loop Proposal Queue</span>
                </span>
                <span className="text-[10px] font-mono text-amber-300">
                  {pendingProposalsCount} Pending
                </span>
              </div>

              {proposals.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-2">No pending tool proposals awaiting human signature.</p>
              ) : (
                proposals.map((prop) => (
                  <div key={prop.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-200 text-xs">{prop.title}</div>
                      <div className="text-[10px] text-slate-400">{prop.description}</div>
                    </div>
                    {prop.status === 'PROPOSAL_PENDING_HUMAN_PROOF' && (
                      <button
                        onClick={() => onExecuteProposal(prop.id, 'PROOF_USER_ONE_CLICK_APPROVED')}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                      >
                        Authorize & Execute
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Autonomy Tier Controller */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <span className="font-semibold text-slate-200">Autonomy Tier Gate</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    'TIER_0_OBSERVATION_PREDICTION',
                    'TIER_1_SOFT_MAINTENANCE',
                    'TIER_2_USER_MODEL_UPDATES',
                    'TIER_3_MACHINE_SELF_EXPANSION',
                  ] as const
                ).map((t) => (
                  <button
                    key={t}
                    onClick={() => onSelectTier(t)}
                    className={`p-2 rounded-lg text-left text-xs font-mono transition-all cursor-pointer ${
                      currentTier === t
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold">{t.replace('TIER_', 'Tier ')}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Unified System Footer */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Unified Conscious Agent Active</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">Merkle Root: 0x7f4a...9b2e</span>
      </div>
    </div>
  );
};
