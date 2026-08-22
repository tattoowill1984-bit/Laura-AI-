import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  AlertCircle,
  Calendar,
  Sparkles,
  Tag,
  RefreshCw,
  X,
  AlarmClock,
  ArrowRight,
  Filter,
  Check,
} from 'lucide-react';
import { ReminderItem } from '../types';

interface ReminderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId?: string;
  onReminderUpdated?: () => void;
}

export const ReminderManagerModal: React.FC<ReminderManagerModalProps> = ({
  isOpen,
  onClose,
  profileId = 'will-owner',
  onReminderUpdated,
}) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'HIGH' | 'COMPLETED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [naturalInput, setNaturalInput] = useState('');
  const [isParsingNatural, setIsParsingNatural] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Manual Form State
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [category, setCategory] = useState<'TASK' | 'MEETING' | 'HEALTH' | 'PERSONAL' | 'GENERAL' | 'LEARNING'>('TASK');

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen, profileId]);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reminders?profileId=${encodeURIComponent(profileId)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reminders)) {
          setReminders(data.reminders);
        }
      }
    } catch (err) {
      console.error('Failed fetching reminders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleComplete = async (reminder: ReminderItem) => {
    const nextCompleted = !reminder.completed;
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        }),
      });
      if (res.ok) {
        setReminders(prev =>
          prev.map(r =>
            r.id === reminder.id
              ? { ...r, completed: nextCompleted, completedAt: nextCompleted ? new Date().toISOString() : undefined }
              : r
          )
        );
        onReminderUpdated?.();
      }
    } catch (err) {
      console.error('Failed toggling reminder complete:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setReminders(prev => prev.filter(r => r.id !== id));
        onReminderUpdated?.();
      }
    } catch (err) {
      console.error('Failed deleting reminder:', err);
    }
  };

  const handleSnooze = async (id: string, minutes: number) => {
    try {
      const res = await fetch(`/api/reminders/${id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reminder) {
          setReminders(prev => prev.map(r => (r.id === id ? data.reminder : r)));
          setFeedbackMessage(`Snoozed for ${minutes} minutes.`);
          setTimeout(() => setFeedbackMessage(null), 3000);
          onReminderUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed snoozing reminder:', err);
    }
  };

  const handleParseAndScheduleNatural = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalInput.trim()) return;

    setIsParsingNatural(true);
    try {
      const parseRes = await fetch('/api/reminders/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: naturalInput, profileId }),
      });

      if (parseRes.ok) {
        const data = await parseRes.json();
        if (data.parsed && data.parsed.extractedParams) {
          const params = data.parsed.extractedParams;
          // Create reminder
          const createRes = await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: params.title || naturalInput,
              dueTimestamp: params.dueTimestamp,
              formattedDue: params.formattedDue,
              priority: params.priority || 'MEDIUM',
              category: params.category || 'TASK',
              profileId,
              source: 'NATURAL_LANGUAGE_CHAT',
            }),
          });

          if (createRes.ok) {
            const created = await createRes.json();
            if (created.reminder) {
              setReminders(prev => [created.reminder, ...prev]);
              setNaturalInput('');
              setFeedbackMessage(`Scheduled: "${created.reminder.title}" (${created.reminder.formattedDue})`);
              setTimeout(() => setFeedbackMessage(null), 4000);
              onReminderUpdated?.();
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed parsing natural command:', err);
    } finally {
      setIsParsingNatural(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let targetDueTs = dueDateTime ? new Date(dueDateTime).toISOString() : new Date(Date.now() + 1000 * 60 * 60).toISOString();
    let targetFormattedDue = dueDateTime ? new Date(dueDateTime).toLocaleString() : 'in 1 hour';

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim(),
          dueTimestamp: targetDueTs,
          formattedDue: targetFormattedDue,
          priority,
          category,
          profileId,
          source: 'MANUAL_ENTRY',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reminder) {
          setReminders(prev => [data.reminder, ...prev]);
          setTitle('');
          setNotes('');
          setDueDateTime('');
          setIsAddingManual(false);
          setFeedbackMessage(`Reminder created successfully.`);
          setTimeout(() => setFeedbackMessage(null), 3000);
          onReminderUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed manual reminder creation:', err);
    }
  };

  if (!isOpen) return null;

  const filteredReminders = reminders.filter(r => {
    if (filterTab === 'ACTIVE' && r.completed) return false;
    if (filterTab === 'COMPLETED' && !r.completed) return false;
    if (filterTab === 'HIGH' && (r.priority !== 'HIGH' && r.priority !== 'CRITICAL')) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.notes && r.notes.toLowerCase().includes(q));
    }
    return true;
  });

  const activeCount = reminders.filter(r => !r.completed).length;
  const highPriorityCount = reminders.filter(r => !r.completed && (r.priority === 'HIGH' || r.priority === 'CRITICAL')).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <AlarmClock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Assistant Task & Reminder Hub</h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {activeCount} Active
                </span>
                {highPriorityCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {highPriorityCount} Urgent
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Laura's persistent memory & proactive reminder engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReminders}
              disabled={isLoading}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Refresh reminders"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedbackMessage && (
          <div className="px-6 py-2 bg-emerald-950/80 border-b border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{feedbackMessage}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="hover:text-emerald-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Natural Language Quick Command Bar */}
        <div className="px-6 py-3.5 bg-slate-950/40 border-b border-slate-800">
          <form onSubmit={handleParseAndScheduleNatural} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={naturalInput}
                onChange={e => setNaturalInput(e.target.value)}
                placeholder="Natural language: 'Remind me tomorrow at 3pm to review invariant proofs' or 'In 20 mins check telemetry'..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-purple-500/30 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 rounded-xl text-sm text-slate-100 placeholder-slate-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isParsingNatural || !naturalInput.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-purple-900/20"
            >
              {isParsingNatural ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsAddingManual(!isAddingManual)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isAddingManual
                  ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingManual ? 'Close Form' : 'Detailed'}</span>
            </button>
          </form>

          {/* Detailed Manual Form (Collapsible) */}
          {isAddingManual && (
            <form onSubmit={handleCreateManual} className="mt-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Title / Action Item</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Calibrate Merkle anchor trees"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    value={dueDateTime}
                    onChange={e => setDueDateTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          priority === p
                            ? p === 'CRITICAL'
                              ? 'bg-red-500/20 border-red-500 text-red-300'
                              : p === 'HIGH'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : p === 'MEDIUM'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="TASK">Task / Action Item</option>
                    <option value="MEETING">Meeting / Standup</option>
                    <option value="HEALTH">Health & Focus</option>
                    <option value="PERSONAL">Personal</option>
                    <option value="LEARNING">Learning & Research</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Context (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Extra parameters, invariant notes, or related files"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingManual(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Create Reminder
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Filter Tabs & Search */}
        <div className="px-6 py-2.5 bg-slate-950/20 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'ACTIVE', label: 'Active', count: activeCount },
                { id: 'HIGH', label: 'High Priority', count: highPriorityCount },
                { id: 'ALL', label: 'All Tasks', count: reminders.length },
                { id: 'COMPLETED', label: 'Completed', count: reminders.filter(r => r.completed).length },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  filterTab === tab.id
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reminders..."
              className="w-48 pl-8 pr-3 py-1 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Reminders List Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 divide-y divide-slate-800/50">
          {filteredReminders.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-400">No reminders matching current filter</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Type a natural command above or ask Laura in chat: <br />
                <span className="text-purple-400">"Remind me in 10 minutes to verify system invariants"</span>
              </p>
            </div>
          ) : (
            filteredReminders.map(reminder => {
              const isPastDue = !reminder.completed && new Date(reminder.dueTimestamp).getTime() <= Date.now();
              const isSnoozed = !reminder.completed && reminder.snoozedUntil && new Date(reminder.snoozedUntil).getTime() > Date.now();

              return (
                <div
                  key={reminder.id}
                  className={`pt-3 first:pt-0 flex items-start gap-3.5 group rounded-xl p-2.5 transition-all ${
                    reminder.completed
                      ? 'opacity-60 bg-slate-950/20'
                      : isPastDue
                      ? 'bg-rose-950/20 border border-rose-900/40'
                      : isSnoozed
                      ? 'bg-amber-950/15 border border-amber-900/30'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Complete Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(reminder)}
                    className="mt-0.5 text-slate-400 hover:text-purple-400 transition-colors"
                  >
                    {reminder.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 group-hover:text-purple-400" />
                    )}
                  </button>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-medium ${
                          reminder.completed ? 'line-through text-slate-400' : 'text-slate-100'
                        }`}
                      >
                        {reminder.title}
                      </h4>

                      {/* Priority Tag */}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider border ${
                          reminder.priority === 'CRITICAL'
                            ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : reminder.priority === 'HIGH'
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : reminder.priority === 'MEDIUM'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {reminder.priority}
                      </span>

                      {/* Category Tag */}
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {reminder.category}
                      </span>

                      {/* Status Badges */}
                      {isPastDue && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500/30 border border-rose-500/50 text-rose-200 animate-pulse">
                          DUE NOW
                        </span>
                      )}
                      {isSnoozed && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300">
                          Snoozed
                        </span>
                      )}
                    </div>

                    {reminder.notes && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{reminder.notes}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>Due: {reminder.formattedDue}</span>
                      </span>
                      {reminder.source && (
                        <span className="text-slate-500 text-[10px]">
                          • Source: {reminder.source === 'NATURAL_LANGUAGE_CHAT' ? 'Laura Chat' : 'Manual'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {!reminder.completed && (
                      <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 border border-slate-700">
                        <button
                          onClick={() => handleSnooze(reminder.id, 10)}
                          className="px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          title="Snooze 10 minutes"
                        >
                          +10m
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder.id, 60)}
                          className="px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          title="Snooze 1 hour"
                        >
                          +1h
                        </button>
                        <button
                          onClick={() => handleSnooze(reminder.id, 1440)}
                          className="px-1.5 py-0.5 text-[10px] font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
                          title="Snooze 1 day"
                        >
                          +1d
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => handleDelete(reminder.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Delete reminder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            <span>Autonomous Cognitive Scheduler Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
