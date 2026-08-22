import React, { useState } from 'react';
import { Bot, Send, ShieldCheck, ShieldAlert, Cpu, ArrowRightLeft, Lock, CheckCircle2, AlertTriangle, Sparkles, X, Copy, Check } from 'lucide-react';
import { ObservationEnvelope } from '../types';

interface InterAIDialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  posture: string;
}

export const InterAIDialogueModal: React.FC<InterAIDialogueModalProps> = ({ isOpen, onClose, posture }) => {
  const [targetModel, setTargetModel] = useState<string>('Gemini-3.7-Pro');
  const [outboundPrompt, setOutboundPrompt] = useState<string>('Consultation query: Evaluate structural logical consistency of active memory graph.');
  const [inboundMock, setInboundMock] = useState<string>('Analysis complete: Active memory graph demonstrates 98.4% logical alignment with zero contradictions.');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };
  const [result, setResult] = useState<{
    success: boolean;
    outboundEnvelope?: ObservationEnvelope;
    inboundEnvelope?: ObservationEnvelope;
    ibmPassed?: boolean;
    posture?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleExecuteDialogue = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/inter-ai/dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetModel,
          outboundPrompt,
          inboundResponse: inboundMock,
          humanProofToken: `HUMAN-PROOF-${Date.now().toString(36).toUpperCase()}`,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Inter-AI dialogue execution error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 relative max-h-[90vh] overflow-y-auto font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Inter-AI Communication Channel
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                IBM PROTOCOL v2.0
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Allows Laura AI to securely consult external AI models under Identity Boundary Membrane governance.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-purple-300 mb-1">Select Target External AI Model</label>
            <select
              value={targetModel}
              onChange={(e) => setTargetModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="Gemini-3.7-Pro">Gemini 3.7 Pro (Google DeepMind)</option>
              <option value="Claude-3.5-Sonnet">Claude 3.5 Sonnet (Anthropic)</option>
              <option value="GPT-4o">GPT-4o (OpenAI)</option>
              <option value="Grok-2">Grok 2 (xAI)</option>
              <option value="External-Consultant-AI">Custom Autonomous AI Agent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-cyan-300 mb-1">
              Outbound Query / Consultation Prompt (From Laura to External AI)
            </label>
            <textarea
              rows={3}
              value={outboundPrompt}
              onChange={(e) => setOutboundPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              placeholder="Enter Laura's consultation query..."
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-emerald-300 mb-1">
              Inbound Response Stream (Received from External AI)
            </label>
            <textarea
              rows={3}
              value={inboundMock}
              onChange={(e) => setInboundMock(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              placeholder="Inbound response payload..."
            />
          </div>

          <button
            onClick={handleExecuteDialogue}
            disabled={loading || posture === 'STONEWALL'}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="animate-pulse">Transmitting Inter-AI Dialogue...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Transmit Inter-AI Consultation via IBM Membrane
              </>
            )}
          </button>

          {posture === 'STONEWALL' && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-mono">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Inter-AI Communication Disabled in STONEWALL Defensive Posture.</span>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-purple-500/40 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  IBM Boundary Verification
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    result.ibmPassed
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {result.ibmPassed ? 'PASSED (AUTHENTIC)' : 'REJECTED (AUTHORITY THREAT)'}
                </span>
              </div>

              {/* Outbound Token Envelope */}
              {result.outboundEnvelope && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-semibold block text-[11px]">Outbound Identity Token (IBT):</span>
                    <button
                      onClick={() => handleCopy('outbound', JSON.stringify(result.outboundEnvelope, null, 2))}
                      className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy Outbound Token JSON"
                    >
                      {copiedKey === 'outbound' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'outbound' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg text-[10px] text-slate-300 border border-slate-800/80 overflow-x-auto">
                    <p className="text-slate-400">Target Model: <strong className="text-cyan-300">{result.outboundEnvelope.interAiMeta?.targetExternalModel}</strong></p>
                    <p className="text-slate-400">Identity Token Token ID: <strong className="text-purple-300">{result.outboundEnvelope.interAiMeta?.identityToken.revocableToken}</strong></p>
                    <p className="text-slate-400">Constitutional Hash: <strong className="text-emerald-300">{result.outboundEnvelope.interAiMeta?.identityToken.constitutionalHash}</strong></p>
                    <p className="text-slate-400">Observation SHA-256: <strong className="text-amber-300">{result.outboundEnvelope.sha256}</strong></p>
                  </div>
                </div>
              )}

              {/* Inbound Verification */}
              {result.inboundEnvelope && (
                <div className="space-y-1 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-semibold block text-[11px]">Inbound Observation Envelope:</span>
                    <button
                      onClick={() => handleCopy('inbound', result.inboundEnvelope?.content || '')}
                      className="text-[10px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copy Inbound Response"
                    >
                      {copiedKey === 'inbound' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'inbound' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                    "{result.inboundEnvelope.content}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
