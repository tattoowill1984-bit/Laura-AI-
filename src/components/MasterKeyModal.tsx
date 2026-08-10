import React, { useState } from 'react';
import { X, Key, CheckCircle2, Shield, Lock } from 'lucide-react';

interface MasterKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMasterKey: (passphrase: string) => Promise<boolean>;
}

export const MasterKeyModal: React.FC<MasterKeyModalProps> = ({
  isOpen,
  onClose,
  onSaveMasterKey,
}) => {
  const [passphrase, setPassphrase] = useState<string>('tattoowill1984-master-key');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim() || passphrase.trim().length < 3) return;

    setIsSaving(true);
    setStatusMessage(null);

    const success = await onSaveMasterKey(passphrase.trim());
    setIsSaving(false);

    if (success) {
      setStatusMessage({
        success: true,
        text: 'Owner Master Authorization Key updated! Only this key can execute proposal mutations.',
      });
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 2000);
    } else {
      setStatusMessage({
        success: false,
        text: 'Failed to update Master Key. Please try again.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Owner Authorization Key</h2>
            <p className="text-xs text-slate-400">Single-Operator Change Control</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          To ensure that <strong className="text-cyan-300">only you</strong> (tattoowill1984) can authorize system changes, set your private master passphrase below. All proposal approvals and mutations will require this key.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Master Authorization Key:
            </label>
            <input
              type="text"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="e.g. tattoowill1984-master-key"
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/60 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !passphrase.trim()}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Shield className="w-4 h-4" />
            <span>{isSaving ? 'Updating Key...' : 'Save Owner Authorization Key'}</span>
          </button>

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                statusMessage.success
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
