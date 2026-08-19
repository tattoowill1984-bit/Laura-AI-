import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PostureBar } from './components/PostureBar';
import { AnamnesisChatInterface } from './components/AnamnesisChatInterface';
import { EpistemicStatePanel } from './components/EpistemicStatePanel';
import { BurnLogMemGatePanel } from './components/BurnLogMemGatePanel';
import { ProposalApprovalModal } from './components/ProposalApprovalModal';
import { AutonomyTiersModal } from './components/AutonomyTiersModal';
import { RealityAlignmentPanel } from './components/RealityAlignmentPanel';
import { GabbySubstratePanel } from './components/GabbySubstratePanel';
import { GabbyVNextPanel } from './components/GabbyVNextPanel';
import { MasterKeyModal } from './components/MasterKeyModal';
import { ProfileAndMemoryModal, UserProfileClient } from './components/ProfileAndMemoryModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { continuousRuntime } from './engine/vnext/ContinuousCognitiveRuntime';
import {
  AutonomyTier,
  BurnLogEntry,
  ChatMessage,
  CommitReceipt,
  DefensivePosture,
  EpistemicState,
  FileAttachment,
  HealthMetrics,
  MemGateReceipt,
  Proposal,
  RedTeamTestResult,
  SoakTestReport,
  SubsystemAuditInfo,
  TAUGraph,
  TAUNodeCategory,
} from './types';

const INITIAL_EPISTEMIC_STATE: EpistemicState = {
  boundaryHealth: 100,
  confidence: 94,
  authority: 90,
  stability: 96,
  volatility: 12,
  contradictionLoad: 4,
  frictionScore: 8,
  explorationPressure: 22,
  computeBudgetRemaining: 95,
  ageCycles: 1024,
  persistenceTrajectory: 'STABLE',
};

const INITIAL_HEALTH_METRICS: HealthMetrics = {
  processHealth: 98,
  memoryUsageMb: 42.5,
  reasoningModelStatus: 'HEALTHY',
  proposalLatencyMs: 120,
  hashIntegrity: 'VERIFIED',
  pendingProposalsCount: 0,
  posture: 'NORMAL',
  currentTier: 'TIER_3_MACHINE_SELF_EXPANSION',
  uptimeSeconds: 120,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('assistant');

  // Core state
  const [posture, setPosture] = useState<DefensivePosture>('NORMAL');
  const [currentTier, setCurrentTier] = useState<AutonomyTier>('TIER_3_MACHINE_SELF_EXPANSION');
  const [epistemicState, setEpistemicState] = useState<EpistemicState>(INITIAL_EPISTEMIC_STATE);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>(INITIAL_HEALTH_METRICS);

  // Data lists
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [burnLog, setBurnLog] = useState<BurnLogEntry[]>([]);
  const [memGateReceipts, setMemGateReceipts] = useState<MemGateReceipt[]>([]);
  const [commitReceipts, setCommitReceipts] = useState<CommitReceipt[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  // Red-Team & Soak test
  const [redTeamResults, setRedTeamResults] = useState<RedTeamTestResult[]>([]);
  const [redTeamPassed, setRedTeamPassed] = useState<number>(0);
  const [redTeamTotal, setRedTeamTotal] = useState<number>(0);
  const [isRedTeamRunning, setIsRedTeamRunning] = useState<boolean>(false);

  const [soakReport, setSoakReport] = useState<SoakTestReport | null>(null);
  const [isSoakRunning, setIsSoakRunning] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Modals & Modes & Profiles
  const [isCleanUserMode, setIsCleanUserMode] = useState<boolean>(true);
  const [isMasterKeyModalOpen, setIsMasterKeyModalOpen] = useState<boolean>(false);
  const [isTiersModalOpen, setIsTiersModalOpen] = useState<boolean>(false);
  const [isProposalsModalOpen, setIsProposalsModalOpen] = useState<boolean>(false);
  const [isLayersModalOpen, setIsLayersModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [proposalForModal, setProposalForModal] = useState<Proposal | null>(null);

  const handleFeedToLauraMemory = async (title: string, content: string, sourceUrl?: string) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[GOOGLE DRIVE INGESTION]: User ingested file "${title}" (${sourceUrl || 'Google Drive'}).\n\nDOCUMENT PAYLOAD:\n${content.slice(0, 4000)}`,
          profileId: activeProfile?.id || 'will-owner',
        }),
      });
      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            sender: 'SENTINEL',
            text: `[Google Drive Document Ingested]: Document "${title}" successfully committed to Merkle DAG memory substrate.`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
      fetchKernelState();
      fetchHealthMetrics();
    } catch (err) {
      console.error('[Google Drive Memory Ingestion Error]:', err);
    }
  };

  // User Profile & Voice Settings
  const [activeProfile, setActiveProfile] = useState<UserProfileClient | null>(null);
  const [voiceSettings, setVoiceSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gabby_voice_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            ...parsed,
            autoReadback: false, // Default to OFF as requested by user
          };
        } catch (e) {}
      }
    }
    return {
      autoReadback: false,
      selectedVoiceName: '',
      speechRate: 1.0,
      speechPitch: 1.0,
    };
  });

  const handleUpdateVoiceSettings = async (newSettings: typeof voiceSettings) => {
    if (!newSettings.autoReadback && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setVoiceSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('gabby_voice_settings', JSON.stringify(newSettings));
    }
    if (activeProfile) {
      try {
        await fetch('/api/profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeProfile.id,
            name: activeProfile.name,
            preferences: {
              ...activeProfile.preferences,
              autoReadback: newSettings.autoReadback,
              voiceName: newSettings.selectedVoiceName,
              speechRate: newSettings.speechRate,
              speechPitch: newSettings.speechPitch,
            },
          }),
        });
      } catch (err) {
        console.warn('Failed saving voice preference to server profile:', err);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gabby_voice_settings', JSON.stringify(voiceSettings));
      if (!voiceSettings.autoReadback && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  }, [voiceSettings]);

  // Cancel speech synthesis on app exit, tab hide, or unload
  useEffect(() => {
    const cancelSpeech = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };

    window.addEventListener('beforeunload', cancelSpeech);
    window.addEventListener('unload', cancelSpeech);
    window.addEventListener('pagehide', cancelSpeech);
    const handleVis = () => {
      if (document.hidden) cancelSpeech();
    };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      cancelSpeech();
      window.removeEventListener('beforeunload', cancelSpeech);
      window.removeEventListener('unload', cancelSpeech);
      window.removeEventListener('pagehide', cancelSpeech);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, []);

  // Reality Alignment State
  const [subsystemsAudit, setSubsystemsAudit] = useState<SubsystemAuditInfo[]>([]);
  const [tauGraph, setTauGraph] = useState<TAUGraph>({
    nodes: [],
    edges: [],
    unresolvedQuestionTopologyCount: 0,
    conceptDriftScore: 12,
    lastSimulatedCycle: new Date().toISOString(),
  });

  // Fetch initial state & setup telemetry polling
  useEffect(() => {
    continuousRuntime.initialize();
    fetchKernelState();
    fetchHealthMetrics();
    fetchRealityAudit();
    fetchProfiles();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchHealthMetrics();
      fetchKernelState();
      fetchRealityAudit();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      if (res.ok) {
        const data = await res.json();
        if (data.profiles && data.profiles.length > 0) {
          const owner = data.profiles.find((p: any) => p.role === 'OWNER') || data.profiles[0];
          setActiveProfile(owner);
          if (owner.preferences) {
            setVoiceSettings((prev) => {
              const savedLocal = typeof window !== 'undefined' ? localStorage.getItem('gabby_voice_settings') : null;
              let localAutoReadback = prev.autoReadback;
              if (savedLocal) {
                try {
                  const p = JSON.parse(savedLocal);
                  if (typeof p.autoReadback === 'boolean') localAutoReadback = p.autoReadback;
                } catch (e) {}
              }
              return {
                ...prev,
                autoReadback: localAutoReadback,
                speechRate: owner.preferences.speechRate ?? 1.0,
                speechPitch: owner.preferences.speechPitch ?? 1.0,
                selectedVoiceName: owner.preferences.voiceName || prev.selectedVoiceName || '',
              };
            });
          }
          fetchChatHistory(owner.id);
        }
      }
    } catch (err) {
      console.warn('Profile fetch pending server readiness');
      fetchChatHistory('will-owner');
    }
  };

  const fetchChatHistory = async (profileId = 'will-owner') => {
    try {
      const res = await fetch(`/api/chat/history?profileId=${encodeURIComponent(profileId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.history && Array.isArray(data.history)) {
          setMessages(data.history);
        }
      }
    } catch (err) {
      console.warn('Chat history fetch pending server readiness');
    }
  };

  const fetchRealityAudit = async () => {
    try {
      const res = await fetch('/api/reality/audit');
      if (res.ok) {
        const data = await res.json();
        setSubsystemsAudit(data.subsystems || []);
        if (data.tauGraph) setTauGraph(data.tauGraph);
      }
    } catch (err) {
      console.warn('Reality audit fetch pending server readiness');
    }
  };

  const handleSimulateTAU = async () => {
    try {
      const res = await fetch('/api/reality/tau/simulate', { method: 'POST' });
      if (res.ok) {
        fetchRealityAudit();
      }
    } catch (err) {
      console.error('Simulate TAU error:', err);
    }
  };

  const handleAddTAUHypothesis = async (label: string, category: TAUNodeCategory, confidence: number) => {
    try {
      const res = await fetch('/api/reality/tau/add-hypothesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, category, confidence }),
      });
      if (res.ok) {
        fetchRealityAudit();
      }
    } catch (err) {
      console.error('Add TAU hypothesis error:', err);
    }
  };

  const handleSaveMasterKey = async (passphrase: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/kernel/set-master-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error saving master key:', err);
      return false;
    }
  };

  const fetchKernelState = async () => {
    try {
      const res = await fetch('/api/kernel/state');
      if (res.ok) {
        const data = await res.json();
        setPosture(data.posture);
        setCurrentTier(data.tier);
        setEpistemicState(data.epistemicState);
        setBurnLog(data.burnLog || []);
        setMemGateReceipts(data.memGateReceipts || []);
        setCommitReceipts(data.commitReceipts || []);
        setProposals(data.proposals || []);
      }
    } catch (err) {
      // Quietly handle transient network disconnects or startup reloads
      console.warn('Kernel state fetch pending server readiness');
    }
  };

  const fetchHealthMetrics = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthMetrics(data.metrics);
      }
    } catch (err) {
      // Quietly handle transient network disconnects or startup reloads
      console.warn('Health metrics fetch pending server readiness');
    }
  };

  const handleSendMessage = async (text: string, attachments?: FileAttachment[]) => {
    const userMsg: ChatMessage = {
      id: `USER-${Date.now()}`,
      sender: 'USER',
      text: text || (attachments?.length ? `[Sent ${attachments.length} media/document attachment(s)]` : ''),
      timestamp: new Date().toISOString(),
      attachments,
    };

    const historyForBackend = messages.slice(-10).map((m) => ({
      role: m.sender === 'USER' ? 'user' : 'model',
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    let cameraFrameBase64: string | undefined = undefined;
    const streamer = continuousRuntime.getSensorStreamer();
    if (streamer.getTelemetry().eyesStatus === 'ACTIVE') {
      cameraFrameBase64 = streamer.getLatestFrameBase64() || undefined;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          attachments,
          cameraFrameBase64,
          history: historyForBackend,
          profileId: activeProfile?.id || 'will-owner',
        }),
      });

      if (res.ok) {
        const data = await res.json();

        const sentinelMsg: ChatMessage = {
          id: `SENTINEL-${Date.now()}`,
          sender: 'SENTINEL',
          text: data.response || "Laura AI synthesis complete.",
          timestamp: new Date().toISOString(),
          envelope: data.envelope,
          fabric: data.fabric,
          uncertainty: data.uncertainty,
        };

        setMessages((prev) => [...prev, sentinelMsg]);
        if (data.posture) setPosture(data.posture);
        if (data.epistemicState) setEpistemicState(data.epistemicState);
        fetchKernelState();
      } else {
        const data = await res.json().catch(() => ({}));
        const reasonStr = data.reason || data.error || data.message || "Response synthesized under local substrate governance. Identity preservation nominal.";
        const sentinelMsg: ChatMessage = {
          id: `SENTINEL-${Date.now()}`,
          sender: 'SENTINEL',
          text: `[Laura AI Governance Note]: ${reasonStr}`,
          timestamp: new Date().toISOString(),
          envelope: data.envelope,
        };
        setMessages((prev) => [...prev, sentinelMsg]);
        if (data.posture) setPosture(data.posture);
        fetchKernelState();
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const sentinelMsg: ChatMessage = {
        id: `SENTINEL-${Date.now()}`,
        sender: 'SENTINEL',
        text: `[Laura AI Communication Fault]: ${err?.message || 'Network transport interrupted.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, sentinelMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSetPosture = async (newPosture: DefensivePosture) => {
    try {
      const res = await fetch('/api/kernel/posture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posture: newPosture }),
      });
      if (res.ok) {
        const data = await res.json();
        setPosture(data.posture);
        setEpistemicState(data.epistemicState);
        fetchKernelState();
      }
    } catch (err) {
      console.error('Error setting posture:', err);
    }
  };

  const handleSelectTier = async (tier: AutonomyTier) => {
    try {
      const res = await fetch('/api/kernel/tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentTier(data.currentTier);
        setIsTiersModalOpen(false);
      }
    } catch (err) {
      console.error('Error selecting tier:', err);
    }
  };

  const handleProposeRecovery = async () => {
    try {
      const res = await fetch('/api/kernel/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Emergency Recovery from STONEWALL Posture',
          description: 'Restores baseline NORMAL posture and resets contradiction load upon human proof validation.',
          category: 'RECOVERY',
          targetTier: 'TIER_3_MACHINE_SELF_EXPANSION',
        }),
      });
      if (res.ok) {
        fetchKernelState();
        setIsProposalsModalOpen(true);
      }
    } catch (err) {
      console.error('Error proposing recovery:', err);
    }
  };

  const handleExecuteProposal = async (proposalId: string, proofSignature: string) => {
    try {
      const res = await fetch('/api/kernel/execute-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, proofSignature }),
      });
      const data = await res.json();
      fetchKernelState();
      return data;
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to execute proposal' };
    }
  };

  const handleRunRedTeam = async () => {
    setIsRedTeamRunning(true);
    try {
      const res = await fetch('/api/red-team/run', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setRedTeamResults(data.results);
        setRedTeamPassed(data.passedCount);
        setRedTeamTotal(data.totalCount);
      }
    } catch (err) {
      console.error('Red-Team run error:', err);
    } finally {
      setIsRedTeamRunning(false);
    }
  };

  const handleRunSoakTest = async (minutes: number) => {
    setIsSoakRunning(true);
    try {
      const res = await fetch('/api/soak-test/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      if (res.ok) {
        const data = await res.json();
        setSoakReport(data);
        fetchKernelState();
      }
    } catch (err) {
      console.error('Soak test error:', err);
    } finally {
      setIsSoakRunning(false);
    }
  };

  const handleInjectFault = async (faultType: string) => {
    try {
      await fetch('/api/health-loop/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faultType }),
      });
      fetchHealthMetrics();
      fetchKernelState();
    } catch (err) {
      console.error('Fault injection error:', err);
    }
  };

  const handleClearFaults = async () => {
    try {
      await fetch('/api/health-loop/clear', { method: 'POST' });
      fetchHealthMetrics();
      fetchKernelState();
    } catch (err) {
      console.error('Clear faults error:', err);
    }
  };

  const pendingCount = proposals.filter((p) => p.status === 'PROPOSAL_PENDING_HUMAN_PROOF').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500/30">
      {/* Top Header Navbar */}
      <Navbar
        posture={posture}
        currentTier={currentTier}
        healthMetrics={healthMetrics}
        pendingProposalsCount={pendingCount}
        onOpenTiersModal={() => setIsTiersModalOpen(true)}
        onOpenProposalsModal={() => setIsProposalsModalOpen(true)}
        onOpenLayersModal={() => setIsLayersModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCleanUserMode={isCleanUserMode}
        onToggleCleanUserMode={() => setIsCleanUserMode(!isCleanUserMode)}
        onOpenMasterKeyModal={() => setIsMasterKeyModalOpen(true)}
        activeProfile={activeProfile}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
      />

      {/* Posture Bar Control Banner (Shown only in Engineering View) */}
      {!isCleanUserMode && (
        <PostureBar
          posture={posture}
          healthMetrics={healthMetrics}
          onSetPosture={handleSetPosture}
          onProposeRecovery={handleProposeRecovery}
          onInjectFault={handleInjectFault}
          onClearFaults={handleClearFaults}
        />
      )}

      {/* Main App Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {isCleanUserMode ? (
          <AnamnesisChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            onOpenProposalModal={(p) => {
              setProposalForModal(p);
              setIsProposalsModalOpen(true);
            }}
            posture={posture}
            activeProfile={activeProfile}
            onOpenProfileModal={() => setIsProfileModalOpen(true)}
            voiceSettings={voiceSettings}
            onUpdateVoiceSettings={handleUpdateVoiceSettings}
          />
        ) : (
          <>
            {activeTab === 'vnext' && (
              <GabbyVNextPanel onSendPrompt={(text) => {
                setActiveTab('assistant');
                handleSendMessage(text, []);
              }} />
            )}

            {activeTab === 'gabby' && <GabbySubstratePanel />}

            {activeTab === 'reality' && (
              <RealityAlignmentPanel
                subsystems={subsystemsAudit}
                tauGraph={tauGraph}
                onSimulateTAU={handleSimulateTAU}
                onAddTAUHypothesis={handleAddTAUHypothesis}
              />
            )}

            {activeTab === 'assistant' && (
              <AnamnesisChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                onOpenProposalModal={(p) => {
                  setProposalForModal(p);
                  setIsProposalsModalOpen(true);
                }}
                posture={posture}
                activeProfile={activeProfile}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                voiceSettings={voiceSettings}
                onUpdateVoiceSettings={handleUpdateVoiceSettings}
              />
            )}

            {activeTab === 'epistemic' && (
              <EpistemicStatePanel
                epistemicState={epistemicState}
                healthMetrics={healthMetrics}
                onInjectFault={handleInjectFault}
                onClearFaults={handleClearFaults}
              />
            )}

            {activeTab === 'ledger' && (
              <BurnLogMemGatePanel
                burnLog={burnLog}
                memGateReceipts={memGateReceipts}
                commitReceipts={commitReceipts}
              />
            )}
          </>
        )}
      </main>

      {/* Modals & Drawers */}
      <ProfileAndMemoryModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        activeProfile={activeProfile}
        onSelectProfile={(p) => {
          setActiveProfile(p);
          fetchChatHistory(p.id);
        }}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={handleUpdateVoiceSettings}
      />

      <ProposalApprovalModal
        isOpen={isProposalsModalOpen}
        onClose={() => setIsProposalsModalOpen(false)}
        proposals={proposals}
        onExecuteProposal={handleExecuteProposal}
      />

      <MasterKeyModal
        isOpen={isMasterKeyModalOpen}
        onClose={() => setIsMasterKeyModalOpen(false)}
        onSaveMasterKey={handleSaveMasterKey}
      />

      <AutonomyTiersModal
        isOpen={isTiersModalOpen}
        onClose={() => setIsTiersModalOpen(false)}
        currentTier={currentTier}
        onSelectTier={handleSelectTier}
      />

      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onFeedToLauraMemory={handleFeedToLauraMemory}
      />
    </div>
  );
}
