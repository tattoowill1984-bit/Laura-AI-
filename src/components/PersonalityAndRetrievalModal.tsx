import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  Brain,
  Sliders,
  FileText,
  ExternalLink,
  CheckCircle2,
  X,
  RefreshCw,
  Zap,
  Globe,
  Database,
  ArrowRight,
  HelpCircle,
  Copy,
  Layers,
  Flame,
  Radio,
  Cpu,
  Atom,
  Tv,
} from 'lucide-react';

interface Trait {
  name: string;
  level: number;
  description: string;
}

interface ExampleDialogue {
  id: string;
  topic: string;
  category: 'TECH' | 'SCIENCE' | 'POP_CULTURE' | 'CONTEXTUAL_MEMORY';
  userPrompt: string;
  lauraResponse: string;
  contextualNotes: string;
}

interface ConversationAnchor {
  id: string;
  key: string;
  value: string;
  category: string;
  confidence: number;
  extractedAt: string;
  turnIndex: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeProfileName?: string;
  onSendToChat?: (text: string) => void;
}

export const PersonalityAndRetrievalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  activeProfileName = 'Will',
  onSendToChat,
}) => {
  const [activeTab, setActiveTab] = useState<'PERSONALITY' | 'CONTEXT' | 'RETRIEVAL'>('PERSONALITY');

  // Personality states
  const [traits, setTraits] = useState<Trait[]>([]);
  const [exampleDialogues, setExampleDialogues] = useState<ExampleDialogue[]>([]);
  const [witLevel, setWitLevel] = useState<number>(85);
  const [sarcasmLevel, setSarcasmLevel] = useState<number>(65);
  const [helpfulnessLevel, setHelpfulnessLevel] = useState<number>(100);
  const [knowledgeDepth, setKnowledgeDepth] = useState<number>(95);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [selectedDialogueCategory, setSelectedDialogueCategory] = useState<string>('ALL');

  // Contextual awareness states
  const [activeAnchors, setActiveAnchors] = useState<ConversationAnchor[]>([]);
  const [contextReport, setContextReport] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Information retrieval states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<'ALL' | 'WEB' | 'KNOWLEDGE_BASE'>('ALL');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    webResults: any[];
    knowledgeBaseResults: any[];
    totalHits: number;
  } | null>(null);

  // Summarization state
  const [summarizeText, setSummarizeText] = useState('');
  const [summarizeUrl, setSummarizeUrl] = useState('');
  const [summarizeTopic, setSummarizeTopic] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryOutput, setSummaryOutput] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch personality & context on load
  const loadPersonalityProfile = async () => {
    try {
      const res = await fetch('/api/personality/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.traits) setTraits(data.traits);
        if (data.exampleDialogues) setExampleDialogues(data.exampleDialogues);
        if (data.settings) {
          setWitLevel(data.settings.witLevel ?? 85);
          setSarcasmLevel(data.settings.sarcasmLevel ?? 65);
          setHelpfulnessLevel(data.settings.helpfulnessLevel ?? 100);
          setKnowledgeDepth(data.settings.knowledgeDepth ?? 95);
        }
      }
    } catch (e) {
      console.warn('Failed loading personality profile:', e);
    }
  };

  const loadContextAwareness = async () => {
    setIsLoadingContext(true);
    try {
      const res = await fetch('/api/context/awareness');
      if (res.ok) {
        const data = await res.json();
        setActiveAnchors(data.activeAnchors || []);
        setContextReport(data.report || null);
      }
    } catch (e) {
      console.warn('Failed loading context awareness:', e);
    } finally {
      setIsLoadingContext(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPersonalityProfile();
      loadContextAwareness();
    }
  }, [isOpen]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/personality/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          witLevel,
          sarcasmLevel,
          helpfulnessLevel,
          knowledgeDepth,
        }),
      });
      if (res.ok) {
        setSaveSuccessNotice(true);
        setTimeout(() => setSaveSuccessNotice(false), 3000);
      }
    } catch (e) {
      console.error('Failed saving personality settings:', e);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch('/api/retrieval/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          source: searchSource,
          topK: 6,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults({
          webResults: data.webResults || [],
          knowledgeBaseResults: data.knowledgeBaseResults || [],
          totalHits: data.totalHits || 0,
        });
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExecuteSummarize = async () => {
    if (!summarizeText.trim() && !summarizeUrl.trim()) return;
    setIsSummarizing(true);
    try {
      const res = await fetch('/api/retrieval/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: summarizeText.trim() || undefined,
          url: summarizeUrl.trim() || undefined,
          topic: summarizeTopic.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSummaryOutput(data.summary || 'No summary returned.');
      }
    } catch (e) {
      console.error('Summarization failed:', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  const filteredDialogues = exampleDialogues.filter(
    d => selectedDialogueCategory === 'ALL' || d.category === selectedDialogueCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">Laura AI Personality & Intelligence Hub</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  v2.0 Sentinel Core
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Helpful, witty, slightly sarcastic personality • Contextual awareness & memory • Information retrieval
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('PERSONALITY')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x ${
              activeTab === 'PERSONALITY'
                ? 'bg-slate-800 text-purple-300 border-slate-700 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            Personality Core & Dialogue Gallery
          </button>
          <button
            onClick={() => setActiveTab('CONTEXT')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x ${
              activeTab === 'CONTEXT'
                ? 'bg-slate-800 text-cyan-300 border-slate-700 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Brain className="w-4 h-4 text-cyan-400" />
            Contextual Awareness & Memory
            {activeAnchors.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-bold">
                {activeAnchors.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('RETRIEVAL')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-t border-x ${
              activeTab === 'RETRIEVAL'
                ? 'bg-slate-800 text-emerald-300 border-slate-700 border-b-transparent shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Search className="w-4 h-4 text-emerald-400" />
            Information Retrieval & Summarizer
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PERSONALITY CORE & DIALOGUES */}
          {activeTab === 'PERSONALITY' && (
            <div className="space-y-6">
              {/* Personality Profile Header Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/30 border border-purple-500/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Helpful • Witty • Slightly Sarcastic
                      </span>
                      <span className="text-xs text-slate-400">Encyclopedic Knowledge Base</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">
                      Laura's Persona Architecture
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Laura blends razor-sharp technical and scientific precision with witty, good-humored sarcasm. She cuts through cognitive fog with vivid sci-fi analogies and direct, actionable problem-solving.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isSavingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                      Save Personality Tuning
                    </button>
                  </div>
                </div>

                {saveSuccessNotice && (
                  <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-xs text-emerald-400 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    Personality parameters updated and synchronized with Gemini runtime prompt!
                  </div>
                )}
              </div>

              {/* Personality Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-slate-200">Wit & Playfulness</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400">{witLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={witLevel}
                    onChange={(e) => setWitLevel(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <p className="text-[11px] text-slate-400">
                    Controls sharpness of metaphors, intellectual humor, and punchy analogies.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-pink-400" />
                      <span className="text-xs font-bold text-slate-200">Sarcasm (Good-Natured)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-pink-400">{sarcasmLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sarcasmLevel}
                    onChange={(e) => setSarcasmLevel(Number(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <p className="text-[11px] text-slate-400">
                    Adds dry, affectionate snark toward bugs, edge-cases, and cosmic oddities.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-200">Helpfulness & Guidance</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">{helpfulnessLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={helpfulnessLevel}
                    onChange={(e) => setHelpfulnessLevel(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <p className="text-[11px] text-slate-400">
                    Guarantees absolute commitment to resolving the core problem with complete solutions.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-200">Encyclopedic Knowledge Depth</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400">{knowledgeDepth}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={knowledgeDepth}
                    onChange={(e) => setKnowledgeDepth(Number(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <p className="text-[11px] text-slate-400">
                    Depth of retrieval across Technology, Advanced Science, and Pop-Culture references.
                  </p>
                </div>
              </div>

              {/* Three Vast Knowledge Base Domains */}
              <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  Tri-Domain Knowledge Mastery
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      Technology & Systems
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Distributed consensus (Raft/Paxos), compiler optimization, Linux kernel eBPF, cryptography, LLM memory architectures, TypeScript & Rust systems.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                      <Atom className="w-4 h-4 text-cyan-400" />
                      Deep Science & Physics
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Quantum decoherence, general relativity, CRISPR molecular genetics, non-equilibrium thermodynamics, evolutionary game theory, astrophysics.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-pink-300">
                      <Tv className="w-4 h-4 text-pink-400" />
                      Pop Culture & Sci-Fi Lore
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Hitchhiker's Guide, Blade Runner, Star Trek/Wars lore, cyberpunk classics (Gibson/Dick), Matrix philosophy, retro computing history & gaming easter eggs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Example Dialogues Showcase */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-purple-400" />
                      Example Dialogue Showcase (Personality in Action)
                    </h4>
                    <p className="text-xs text-slate-400">
                      Live transcripts demonstrating Laura's blend of wit, technical depth, and sarcasm.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {['ALL', 'TECH', 'SCIENCE', 'POP_CULTURE', 'CONTEXTUAL_MEMORY'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedDialogueCategory(cat)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-colors ${
                          selectedDialogueCategory === cat
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredDialogues.map((diag) => (
                    <div
                      key={diag.id}
                      className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-purple-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700/80 text-slate-300">
                            {diag.category}
                          </span>
                          <h5 className="text-xs font-bold text-slate-200">{diag.topic}</h5>
                        </div>
                        <button
                          onClick={() => copyToClipboard(diag.lauraResponse, diag.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors flex items-center gap-1 text-[11px]"
                          title="Copy Laura's response"
                        >
                          {copiedId === diag.id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedId === diag.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      {/* User Prompt */}
                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                        <span className="font-semibold text-purple-300">User: </span>
                        "{diag.userPrompt}"
                      </div>

                      {/* Laura Response */}
                      <div className="p-3 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Laura AI:</span>
                        </div>
                        {diag.lauraResponse}
                      </div>

                      {/* Contextual Annotation */}
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5 pt-1 border-t border-slate-800">
                        <HelpCircle className="w-3 h-3 text-slate-500" />
                        <span>Insight: {diag.contextualNotes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTEXTUAL AWARENESS & MEMORY */}
          {activeTab === 'CONTEXT' && (
            <div className="space-y-6">
              {/* Context Overview Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/30 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      Contextual Awareness Engine
                    </span>
                    <span className="text-xs text-slate-400">Continuous Memory & Working Anchors</span>
                  </div>
                  <button
                    onClick={loadContextAwareness}
                    disabled={isLoadingContext}
                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingContext ? 'animate-spin' : ''}`} />
                    Refresh Context
                  </button>
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  How Laura Remembers and Connects Details Across Sessions
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                  Unlike stateless chatbots that forget everything once you close the tab, Laura maintains two synchronized layers of memory: (1) <strong>Short-term working anchors</strong> extracted dynamically during the current session, and (2) <strong>Persistent Merkle Evidence DAG facts</strong> recalled across days and weeks.
                </p>
              </div>

              {/* Concrete UX Benefit Case Study */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Concrete UX Improvement Example
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
                    <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <X className="w-4 h-4" />
                      Without Contextual Awareness (Generic AI)
                    </div>
                    <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                      <p><strong>User:</strong> "How do I optimize the query?"</p>
                      <p className="text-slate-400">
                        <strong>Generic Bot:</strong> "What database are you using? What does your schema look like? Can you paste the SQL query? How many rows are in the table?"
                      </p>
                      <p className="text-[11px] text-rose-300 italic">
                        Result: User experiences friction, repeats schema details for the 5th time, and loses workflow momentum.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                    <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      With Laura's Contextual Awareness
                    </div>
                    <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                      <p><strong>User:</strong> "How do I optimize the query?"</p>
                      <p className="text-emerald-300">
                        <strong>Laura:</strong> "Looking at the 40M-row <code className="bg-slate-800 px-1 rounded text-cyan-300">telemetry_events</code> PostgreSQL table we partitioned yesterday in your Go service, the slow scan is due to the unindexed <code className="bg-slate-800 px-1 rounded text-cyan-300">device_uuid</code>. Adding a composite B-Tree index on <code className="bg-slate-800 px-1 rounded text-cyan-300">(org_id, device_uuid)</code> will drop latency from 4200ms to 8ms without bloating your RAM."
                      </p>
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        Result: Zero repetitive prompts. Immediate, high-precision solution tailored directly to the user's stack.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Conversation Anchors (Current Session) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    Working Memory Anchors (Extracted in Current Session)
                  </h4>
                  <span className="text-xs text-slate-500">
                    {activeAnchors.length} active anchor{activeAnchors.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {activeAnchors.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
                    <Brain className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">
                      No session anchors extracted yet in this session.
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      As you chat about your tech stack, goals, and constraints (e.g. "I'm building a React + Rust app", "don't use Redis"), Laura automatically indexes them here as working context!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeAnchors.map((anchor) => (
                      <div
                        key={anchor.id}
                        className="p-3 rounded-lg bg-slate-800/60 border border-cyan-500/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 uppercase">
                            {anchor.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Turn #{anchor.turnIndex} • {anchor.confidence}% confidence
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-200">
                          {anchor.value}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Key: <code className="text-slate-400">{anchor.key}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: UNIFIED INFORMATION RETRIEVAL */}
          {activeTab === 'RETRIEVAL' && (
            <div className="space-y-6">
              {/* Search Control Bar */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/30 border border-emerald-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Search className="w-4 h-4 text-emerald-400" />
                      Live Information Retrieval & Knowledge Matrix
                    </h3>
                    <p className="text-xs text-slate-400">
                      Query real-time web search or your persistent Merkle Knowledge Base on demand.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    {(['ALL', 'WEB', 'KNOWLEDGE_BASE'] as const).map((src) => (
                      <button
                        key={src}
                        onClick={() => setSearchSource(src)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          searchSource === src
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {src === 'ALL' ? 'Web + KB' : src === 'WEB' ? 'Live Web' : 'Knowledge Base'}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleExecuteSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tech docs, quantum physics, sci-fi lore, or your past notes..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Search
                  </button>
                </form>
              </div>

              {/* Search Results Display */}
              {searchResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                    <span>
                      Found <strong className="text-emerald-400">{searchResults.totalHits}</strong> result{searchResults.totalHits !== 1 ? 's' : ''} for "{searchQuery}"
                    </span>
                  </div>

                  {/* Web Hits */}
                  {searchResults.webResults.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        Live Web Search Hits ({searchResults.webResults.length})
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.webResults.map((hit, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1.5 hover:border-emerald-500/40 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <a
                                href={hit.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-cyan-300 hover:underline flex items-center gap-1 truncate max-w-[85%]"
                              >
                                {hit.title || hit.url}
                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              </a>
                            </div>
                            <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                              {hit.snippet || hit.content}
                            </p>
                            <div className="text-[10px] text-slate-500 truncate">
                              Source: {hit.source || 'Web Grounding'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Knowledge Base Hits */}
                  {searchResults.knowledgeBaseResults.length > 0 && (
                    <div className="space-y-2 pt-3">
                      <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        Persistent Knowledge Base & Merkle Memories ({searchResults.knowledgeBaseResults.length})
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {searchResults.knowledgeBaseResults.map((hit, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-800/60 border border-cyan-500/20 space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-cyan-300 uppercase">
                                {hit.sourceCategory || 'MEMORY'}
                              </span>
                              <span className="text-slate-400 font-mono">
                                Match: {(hit.similarityScore * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">
                              {hit.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* On-Demand Document / URL Summarizer Section */}
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    On-Demand Topic & Document Summarizer
                  </h4>
                  <p className="text-xs text-slate-400">
                    Paste raw text or a web URL to extract high-density, witty takeaways structured by Laura.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={summarizeUrl}
                    onChange={(e) => setSummarizeUrl(e.target.value)}
                    placeholder="Source URL (e.g. https://arxiv.org/abs/... or docs link)"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="text"
                    value={summarizeTopic}
                    onChange={(e) => setSummarizeTopic(e.target.value)}
                    placeholder="Topic Focus (e.g. Distributed Consensus or Quantum Decoherence)"
                    className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <textarea
                  value={summarizeText}
                  onChange={(e) => setSummarizeText(e.target.value)}
                  placeholder="Or paste full text / markdown here to summarize..."
                  rows={4}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none font-mono"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleExecuteSummarize}
                    disabled={isSummarizing || (!summarizeText.trim() && !summarizeUrl.trim())}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all"
                  >
                    {isSummarizing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    Generate Structured Summary
                  </button>
                </div>

                {summaryOutput && (
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        Summary by Laura AI
                      </div>
                      <button
                        onClick={() => copyToClipboard(summaryOutput, 'summary_res')}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-[11px]"
                      >
                        {copiedId === 'summary_res' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === 'summary_res' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {summaryOutput}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
