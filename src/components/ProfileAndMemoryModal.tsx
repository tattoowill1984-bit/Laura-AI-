import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Key,
  Database,
  Volume2,
  Trash2,
  Plus,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  Sparkles,
  Search,
  Sliders,
  HardDrive,
  Brain,
  Network,
} from 'lucide-react';
import { MemoryNodeGraphViewer } from './MemoryNodeGraphViewer';

export interface UserProfileClient {
  id: string;
  name: string;
  email?: string;
  role: 'OWNER' | 'MEMBER' | 'GUEST';
  hasPasscode: boolean;
  avatarColor: string;
  createdAt: string;
  lastActive: string;
  preferences: {
    autoReadback: boolean;
    voiceName?: string;
    speechRate: number;
    speechPitch: number;
    subtleOperatorView: boolean;
  };
}

export interface LongTermMemoryClient {
  id: string;
  profileId: string;
  fact: string;
  category: 'PERSONAL' | 'PREFERENCE' | 'GOAL' | 'CONTEXT' | 'INVARIANT';
  source: 'USER_INPUT' | 'GABBY_INFERENCE' | 'MANUAL_ENTRY';
  confidence: number;
  createdAt: string;
  updatedAt: string;
  verifiedByOwner: boolean;
}

interface ProfileAndMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfileClient | null;
  onSelectProfile: (profile: UserProfileClient) => void;
  voiceSettings: {
    autoReadback: boolean;
    selectedVoiceName: string;
    speechRate: number;
    speechPitch: number;
  };
  onUpdateVoiceSettings: (settings: {
    autoReadback: boolean;
    selectedVoiceName: string;
    speechRate: number;
    speechPitch: number;
  }) => void;
}

export const ProfileAndMemoryModal: React.FC<ProfileAndMemoryModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  onSelectProfile,
  voiceSettings,
  onUpdateVoiceSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'MEMORY' | 'PROFILES' | 'VOICE'>('MEMORY');
  const [showGraphViewer, setShowGraphViewer] = useState(false);
  const [profiles, setProfiles] = useState<UserProfileClient[]>([]);
  const [memories, setMemories] = useState<LongTermMemoryClient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState<'PERSONAL' | 'PREFERENCE' | 'GOAL' | 'CONTEXT'>('PERSONAL');
  const [isLoadingMemories, setIsLoadingMemories] = useState(false);
  const [isSavingFact, setIsSavingFact] = useState(false);

  // Memory Summarization Module state
  const [summaryInput, setSummaryInput] = useState('');
  const [memorySummaryResult, setMemorySummaryResult] = useState<any | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    if (!summaryInput.trim()) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch('/api/memory/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextText: summaryInput,
          profileId: activeProfile?.id || 'will-owner',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) setMemorySummaryResult(data.summary);
      }
    } catch (e) {
      console.error('Failed generating memory summary:', e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // New profile creation
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePasscode, setNewProfilePasscode] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  // PIN Unlock State
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [unlockTargetProfile, setUnlockTargetProfile] = useState<UserProfileClient | null>(null);

  // Voice engine available voices
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const handleResetMemory = async () => {
    if (!confirm('Are you sure you want to reset all long-term memories and chat history for this profile?')) return;
    setIsLoadingMemories(true);
    try {
      const res = await fetch('/api/memories/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: activeProfile?.id || 'will-owner' }),
      });
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error('Failed to reset memory:', err);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      if (activeProfile) {
        fetchMemories(activeProfile.id);
      }
    }
  }, [isOpen, activeProfile?.id]);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      if (data.profiles) {
        setProfiles(data.profiles);
      }
    } catch (err) {
      console.error('Failed fetching profiles', err);
    }
  };

  const fetchMemories = async (profileId: string) => {
    setIsLoadingMemories(true);
    try {
      const res = await fetch(`/api/memories?profileId=${encodeURIComponent(profileId)}`);
      const data = await res.json();
      if (data.memories) {
        setMemories(data.memories);
      }
    } catch (err) {
      console.error('Failed fetching memories', err);
    } finally {
      setIsLoadingMemories(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim() || !activeProfile) return;
    setIsSavingFact(true);
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: activeProfile.id,
          fact: newFact.trim(),
          category: newCategory,
          source: 'MANUAL_ENTRY',
          confidence: 98,
        }),
      });
      const data = await res.json();
      if (data.success && data.memory) {
        setMemories((prev) => [data.memory, ...prev]);
        setNewFact('');
      }
    } catch (err) {
      console.error('Failed saving memory fact', err);
    } finally {
      setIsSavingFact(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!activeProfile) return;
    try {
      const res = await fetch(`/api/memories/${id}?profileId=${encodeURIComponent(activeProfile.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed deleting memory', err);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setIsCreatingProfile(true);
    try {
      const id = `prof-${Date.now()}`;
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: newProfileName.trim(),
          passcode: newProfilePasscode.trim(),
          avatarColor: 'from-purple-600 to-indigo-600',
        }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        await fetchProfiles();
        onSelectProfile(data.profile);
        setNewProfileName('');
        setNewProfilePasscode('');
      }
    } catch (err) {
      console.error('Failed creating profile', err);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleUnlockAndSelect = async (profile: UserProfileClient) => {
    if (!profile.hasPasscode) {
      onSelectProfile(profile);
      fetchMemories(profile.id);
      return;
    }
    setUnlockTargetProfile(profile);
    setPinInput('');
    setPinError('');
  };

  const submitPinUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTargetProfile) return;
    try {
      const res = await fetch('/api/profiles/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: unlockTargetProfile.id,
          passcode: pinInput,
        }),
      });
      const data = await res.json();
      if (data.success && data.profile) {
        onSelectProfile(data.profile);
        fetchMemories(data.profile.id);
        setUnlockTargetProfile(null);
        setPinInput('');
      } else {
        setPinError(data.error || 'Incorrect PIN code');
      }
    } catch (err) {
      setPinError('Authentication error');
    }
  };

  if (!isOpen) return null;

  const filteredMemories = memories.filter((m) =>
    m.fact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Laura Long-Term Memory & Profile
              </h2>
              <p className="text-xs text-slate-400">
                Persistent across sessions • Private space for {activeProfile ? activeProfile.name : "Will"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800/80 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('MEMORY')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'MEMORY'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-purple-400" />
            <span>Persistent Memories ({memories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PROFILES')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'PROFILES'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 text-cyan-400" />
            <span>User Profiles & Privacy</span>
          </button>

          <button
            onClick={() => setActiveTab('VOICE')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'VOICE'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Voice & Accessibility</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* PIN UNLOCK MODAL OVERLAY IF TARGETING LOCKED PROFILE */}
          {unlockTargetProfile && (
            <div className="p-5 bg-slate-950/90 border border-amber-500/30 rounded-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-300">
                <Lock className="w-5 h-5" />
                <span className="text-sm font-bold">
                  Unlock Private Space: {unlockTargetProfile.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Enter your 4-digit PIN or passcode to load this private profile and memory space.
              </p>

              <form onSubmit={submitPinUnlock} className="flex flex-col gap-3">
                <input
                  type="password"
                  placeholder="Enter passcode / PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                {pinError && <p className="text-xs text-rose-400 font-medium">{pinError}</p>}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setUnlockTargetProfile(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-500 transition-all shadow-md shadow-purple-500/20"
                  >
                    Unlock & Load Profile
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 1: PERSISTENT MEMORIES */}
          {activeTab === 'MEMORY' && !unlockTargetProfile && (
            <div className="space-y-5">
              {/* View Switcher Bar & Reset Memory Button */}
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 flex-wrap gap-2">
                <span className="text-xs font-mono text-slate-400 font-bold px-2">Memory Vault Interface:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowGraphViewer(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      !showGraphViewer
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    List Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGraphViewer(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                      showGraphViewer
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5 text-purple-300" />
                    Interactive Node Graph
                  </button>

                  <button
                    type="button"
                    onClick={handleResetMemory}
                    title="Reset memory and chat history"
                    className="px-3 py-1 rounded-lg text-xs font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 transition-all cursor-pointer flex items-center gap-1 ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reset Memory</span>
                  </button>
                </div>
              </div>

              {showGraphViewer ? (
                <MemoryNodeGraphViewer />
              ) : (
                <>
                  {/* Memory Retrieval & Summarization Module for Generator-Critic Loop */}
                  <div className="p-4 bg-slate-950/80 border border-purple-500/30 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                      <strong className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <Brain className="w-4 h-4 text-purple-400" />
                        Memory Retrieval & Summarization Module (Generator-Critic Context)
                      </strong>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">Vector-Grounded Engine</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Query the Memory Store based on current context and active hypotheses in the Self-Model to synthesize a concise memory summary for informing the Generator-Critic loop.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={summaryInput}
                        onChange={(e) => setSummaryInput(e.target.value)}
                        placeholder="Enter current query context, task goal, or hypothesis..."
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary || !summaryInput.trim()}
                        className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
                        Synthesize Summary
                      </button>
                    </div>

                    {memorySummaryResult && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-purple-500/30 space-y-2 text-xs font-mono">
                        <div className="flex justify-between text-purple-300 font-bold">
                          <span>Synthesized Context Summary</span>
                          <span>Relevance: {memorySummaryResult.relevanceScore}%</span>
                        </div>
                        <p className="text-slate-200 font-sans leading-relaxed text-xs">{memorySummaryResult.conciseSummary}</p>

                        {memorySummaryResult.hypothesisResonances?.length > 0 && (
                          <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                            <span className="text-slate-400 block font-bold">Active Hypothesis Resonances:</span>
                            {memorySummaryResult.hypothesisResonances.map((res: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-slate-300">
                                <span>{res.hypothesisTitle}</span>
                                <span className="text-amber-300 font-bold">{(res.resonanceFactor * 100).toFixed(0)}% resonance</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add New Fact */}
              <form onSubmit={handleAddMemory} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Add Long-Term Memory Fact for {activeProfile ? activeProfile.name : "Will"}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="text-xs bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="PERSONAL">Personal Detail</option>
                    <option value="PREFERENCE">Preference / Style</option>
                    <option value="GOAL">Objective / Goal</option>
                    <option value="CONTEXT">Work Context</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Will prefers concise summaries and direct answers without fluff..."
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={isSavingFact || !newFact.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-purple-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Fact</span>
                  </button>
                </div>
              </form>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search stored facts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Memory Fact List */}
              <div className="space-y-2.5">
                {isLoadingMemories ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading persistent memories...</div>
                ) : filteredMemories.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl space-y-2">
                    <p className="text-xs text-slate-400">No long-term memories matching search.</p>
                    <p className="text-[11px] text-slate-500">
                      As you chat with Gabby, important facts, goals, and preferences are automatically remembered here across sessions.
                    </p>
                  </div>
                ) : (
                  filteredMemories.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3 hover:border-slate-700 transition-all group"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                            {mem.category}
                          </span>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {mem.confidence}% Verified
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(mem.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-200 leading-relaxed">
                          {mem.fact}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        title="Delete memory fact"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: PROFILES & PRIVACY */}
          {activeTab === 'PROFILES' && !unlockTargetProfile && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Active User Profile & Identity Isolation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Laura AI isolates memories, conversation history, and preferences per profile. "Will's Personal Space" is configured as the primary owner profile.
                </p>
              </div>

              {/* Profile Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profiles.map((prof) => {
                  const isActive = activeProfile?.id === prof.id;
                  return (
                    <div
                      key={prof.id}
                      onClick={() => handleUnlockAndSelect(prof)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-purple-950/20 border-purple-500/50 shadow-md shadow-purple-500/10'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${prof.avatarColor || 'from-purple-600 to-cyan-500'} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                          {prof.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-100">{prof.name}</h4>
                            {prof.role === 'OWNER' && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                OWNER
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {prof.hasPasscode ? 'Protected with Passcode' : 'Unprotected'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {prof.hasPasscode ? (
                          <Lock className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-slate-500" />
                        )}
                        {isActive && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Create New Profile Form */}
              <form onSubmit={handleCreateProfile} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Create Additional Isolated Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Profile Name (e.g. Research Account)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="password"
                    placeholder="Optional 4-Digit PIN Passcode"
                    value={newProfilePasscode}
                    onChange={(e) => setNewProfilePasscode(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingProfile || !newProfileName.trim()}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Create Isolated Profile
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: VOICE & ACCESSIBILITY */}
          {activeTab === 'VOICE' && (
            <div className="space-y-5">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">Auto-Readback Voice Responses</h4>
                      <p className="text-[11px] text-slate-400">Automatically speak Gabby's responses upon completion</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceSettings.autoReadback}
                      onChange={(e) =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          autoReadback: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                {/* Voice Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Preferred Speech Synthesis Voice</label>
                  <select
                    value={voiceSettings.selectedVoiceName}
                    onChange={(e) =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        selectedVoiceName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="">System Default Voice</option>
                    {availableVoices.map((v, idx) => (
                      <option key={`${v.name}-${v.lang}-${idx}`} value={v.name}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Speed & Pitch Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300 font-medium">
                      <span>Speech Rate</span>
                      <span>{voiceSettings.speechRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.5"
                      step="0.1"
                      value={voiceSettings.speechRate}
                      onChange={(e) =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          speechRate: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300 font-medium">
                      <span>Voice Pitch</span>
                      <span>{voiceSettings.speechPitch}</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.3"
                      step="0.1"
                      value={voiceSettings.speechPitch}
                      onChange={(e) =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          speechPitch: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-purple-500"
                    />
                  </div>
                </div>

                {/* Clarity-Focused Style Presets for Learning */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Learning Clarity Presets
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          speechRate: 0.9,
                          speechPitch: 1.0,
                        })
                      }
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-all"
                    >
                      <div className="text-xs font-bold text-cyan-300">Steady Learning</div>
                      <div className="text-[10px] text-slate-400">0.9x • High Intelligibility</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          speechRate: 1.1,
                          speechPitch: 1.0,
                        })
                      }
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-all"
                    >
                      <div className="text-xs font-bold text-amber-300">Concise Summary</div>
                      <div className="text-[10px] text-slate-400">1.1x • Fast Overview</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          speechRate: 0.95,
                          speechPitch: 0.95,
                        })
                      }
                      className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition-all"
                    >
                      <div className="text-xs font-bold text-purple-300">Deep Exploration</div>
                      <div className="text-[10px] text-slate-400">0.95x • Thoughtful Pace</div>
                    </button>
                  </div>
                </div>

                {/* Test Voice Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                      const utter = new SpeechSynthesisUtterance("Hello Will! I am Laura AI. Voice synthesis and long-term memory are fully active.");
                      utter.rate = voiceSettings.speechRate;
                      utter.pitch = voiceSettings.speechPitch;
                      if (voiceSettings.selectedVoiceName) {
                        const v = availableVoices.find(voice => voice.name === voiceSettings.selectedVoiceName);
                        if (v) utter.voice = v;
                      }
                      window.speechSynthesis.speak(utter);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Test Voice Output</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-purple-300">
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            Storage Engine: Server JSON Persistent DB
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
