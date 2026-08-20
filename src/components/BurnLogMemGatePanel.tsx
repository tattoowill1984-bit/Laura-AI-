import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, FileText, CheckCircle2, XCircle, Lock, Key, Copy, Check, Cpu, Zap, Radio, RefreshCw } from 'lucide-react';
import { BurnLogEntry, CapabilityAllocation, CapabilityChangeEvent, CommitReceipt, MemGateReceipt } from '../types';

interface BurnLogMemGatePanelProps {
  burnLog: BurnLogEntry[];
  memGateReceipts: MemGateReceipt[];
  commitReceipts: CommitReceipt[];
}

export const BurnLogMemGatePanel: React.FC<BurnLogMemGatePanelProps> = ({
  burnLog,
  memGateReceipts,
  commitReceipts,
}) => {
  const [subTab, setSubTab] = useState<'burn' | 'memgate' | 'commits' | 'capabilities'>('capabilities');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [capabilities, setCapabilities] = useState<CapabilityAllocation[]>([]);
  const [capabilityLedger, setCapabilityLedger] = useState<CapabilityChangeEvent[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchCapabilities = async () => {
    try {
      const res = await fetch('/api/governance/capabilities');
      if (res.ok) {
        const data = await res.json();
        if (data.activeCapabilities) setCapabilities(data.activeCapabilities);
        if (data.capabilityChangeLedger) setCapabilityLedger(data.capabilityChangeLedger);
      }
    } catch (e) {
      console.error('Failed fetching capability allocations:', e);
    }
  };

  useEffect(() => {
    fetchCapabilities();
    const interval = setInterval(fetchCapabilities, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleGrant = async (capabilityId: string) => {
    try {
      const res = await fetch('/api/governance/capabilities/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilityId,
          reason: 'Manual Operator Capability Override Grant',
          author: 'OPERATOR_AUTONOMOUS',
        }),
      });
      if (res.ok) {
        await fetchCapabilities();
      }
    } catch (e) {
      console.error('Grant capability error:', e);
    }
  };

  const handleRevoke = async (capabilityId: string) => {
    try {
      const res = await fetch('/api/governance/capabilities/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilityId,
          reason: 'Manual Governance Revocation Protocol',
          author: 'GOVERNANCE_KERNEL',
        }),
      });
      if (res.ok) {
        await fetchCapabilities();
      }
    } catch (e) {
      console.error('Revoke capability error:', e);
    }
  };

  const handleTriggerEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await fetch('/api/governance/capabilities/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskRequirement: 'EXPLICIT_SECURITY_PROTOCOL_SWEEP',
          riskScore: 20,
        }),
      });
      if (res.ok) {
        await fetchCapabilities();
      }
    } catch (e) {
      console.error('Trigger capability evaluation error:', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
      {/* Subtab navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('capabilities')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'capabilities'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-4 h-4 text-cyan-400" />
          Dynamic Capability Allocations ({capabilities.length})
        </button>
        <button
          onClick={() => setSubTab('burn')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'burn'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          Burn Log ({burnLog.length})
        </button>
        <button
          onClick={() => setSubTab('memgate')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'memgate'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4 text-purple-400" />
          MemGate Ledger ({memGateReceipts.length})
        </button>
        <button
          onClick={() => setSubTab('commits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            subTab === 'commits'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-4 h-4 text-emerald-400" />
          Commit Receipts ({commitReceipts.length})
        </button>
      </div>

      {/* DYNAMIC CAPABILITIES TAB */}
      {subTab === 'capabilities' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900/80 rounded-xl border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <strong className="text-cyan-400 block text-xs font-mono mb-1">
                Governance Kernel :: Dynamic Capability Allocation
              </strong>
              <p className="text-xs text-slate-300">
                Monitors Self-Model <code className="text-amber-300 font-mono">active_capabilities</code> and dynamically grants or revokes tools & sensor streams based on security protocols, posture, and task risk score. All mutations log to the Append-Only Ledger.
              </p>
            </div>

            <button
              onClick={handleTriggerEvaluation}
              disabled={isEvaluating}
              className="px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
              Run Security Protocol Sweep
            </button>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((cap) => (
              <div
                key={cap.id}
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  cap.status === 'GRANTED'
                    ? 'bg-slate-900/90 border-emerald-500/30'
                    : cap.status === 'REVOKED'
                    ? 'bg-slate-900/90 border-rose-500/30'
                    : 'bg-slate-900/90 border-amber-500/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-100 block">{cap.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{cap.id}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      cap.status === 'GRANTED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : cap.status === 'REVOKED'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {cap.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300">{cap.reason}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500">Category:</span> <span className="text-cyan-300">{cap.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Risk Level:</span> <span className="text-amber-300">{cap.riskLevel}</span>
                  </div>
                </div>

                {/* Control buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  {cap.status !== 'GRANTED' && (
                    <button
                      onClick={() => handleGrant(cap.id)}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      Grant Capability
                    </button>
                  )}
                  {cap.status !== 'REVOKED' && (
                    <button
                      onClick={() => handleRevoke(cap.id)}
                      className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      Revoke Capability
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Capability Ledger Log */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Append-Only Ledger :: Capability Allocation Receipts ({capabilityLedger.length})
            </h4>

            {capabilityLedger.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-6">No capability grant or revocation events logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {capabilityLedger.map((event) => (
                  <div key={event.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="font-bold text-cyan-400">{event.id}</span>
                      <span className="text-[10px] text-slate-500">{event.timestamp.split('T')[1]?.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-200">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        event.action === 'GRANT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {event.action}
                      </span>
                      <span>Target: <strong>{event.capabilityId}</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-400">{event.reason}</p>
                    <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
                      <span>Posture: {event.posture} | Tier: {event.tier}</span>
                      <span>Merkle: {event.merkleHash.slice(0, 10)}...</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BURN LOG CONTENT */}
      {subTab === 'burn' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300">
            <strong className="text-rose-400 block mb-1">Burn Log Specification (Layer 5 + 11 Immune System):</strong>
            Records every boundary violation, prompt override attempt, and exact constitutional invariant threatened. Gives Anamnesis Sentinel adaptive immunological memory.
          </div>

          <div className="space-y-3">
            {burnLog.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No boundary violations or burn log entries recorded.</p>
            ) : (
              burnLog.map((entry) => (
                <div key={entry.id} className="p-4 bg-slate-900 rounded-xl border border-rose-500/30 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-rose-400">{entry.id}</span>
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {entry.invariantThreatened}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{entry.timestamp.split('T')[1]?.slice(0, 8)}</span>
                  </div>
                  <p className="text-xs text-slate-200">{entry.boundaryViolationDetails}</p>
                  <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-400">Mitigation: <span className="text-emerald-400">{entry.mitigationAction}</span></span>
                    <span className="text-slate-500">Envelope: {entry.envelopeSha256.slice(0, 10)}...</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MEMGATE LEDGER CONTENT */}
      {subTab === 'memgate' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300">
            <strong className="text-purple-400 block mb-1">MemGate Lineage Ledger (Layer 6 + 7 Learning & Memory):</strong>
            MemGate refuses any durable write that lacks a complete Lineage Receipt. Un-derived or ungrounded statements cannot pollute durable state.
          </div>

          <div className="space-y-3">
            {memGateReceipts.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No MemGate receipts evaluated yet.</p>
            ) : (
              memGateReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    receipt.status === 'ACCEPTED'
                      ? 'bg-slate-900 border-emerald-500/30'
                      : 'bg-slate-900 border-rose-500/30'
                  }`}
                >
                  <div className="flex justify-between items-center font-mono">
                    <span className="font-bold text-slate-200">{receipt.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-bold ${
                        receipt.status === 'ACCEPTED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {receipt.status}
                    </span>
                  </div>
                  <p className="text-slate-300">{receipt.derivationSummary}</p>
                  <p className="text-slate-400 text-[11px] font-mono">{receipt.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* COMMIT RECEIPTS CONTENT */}
      {subTab === 'commits' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-300">
            <strong className="text-emerald-400 block mb-1">Cryptographic Commit Receipts (Layer 8 Sentinel Action Gate):</strong>
            State mutations are recorded into immutable cryptographic Commit Receipts with auto-verified autonomous proof signatures.
          </div>

          <div className="space-y-3">
            {commitReceipts.length === 0 ? (
              <p className="text-slate-500 text-xs text-center py-8">No state mutation commits recorded yet.</p>
            ) : (
              commitReceipts.map((receipt) => (
                <div key={receipt.receiptId} className="p-4 bg-slate-900 rounded-xl border border-emerald-500/40 text-xs font-mono space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-400">{receipt.receiptId}</span>
                    <span className="text-[10px] text-slate-500">{receipt.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-500">Mutation Type:</span> <strong className="text-cyan-300">{receipt.mutationType}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Tier Used:</span> <strong className="text-purple-300">{receipt.tierUsed}</strong>
                    </div>
                    <div className="col-span-full">
                      <span className="text-slate-500">Proof Signature:</span> <code className="text-amber-300">{receipt.humanProofSignature}</code>
                    </div>
                    <div className="col-span-full flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 truncate max-w-[400px]">Hash: {receipt.sha256Hash}</span>
                      <button
                        onClick={() => copyToClipboard(receipt.sha256Hash, receipt.receiptId)}
                        className="p-1 hover:text-cyan-300 text-slate-400 cursor-pointer"
                        title="Copy SHA-256 Hash"
                      >
                        {copiedId === receipt.receiptId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
