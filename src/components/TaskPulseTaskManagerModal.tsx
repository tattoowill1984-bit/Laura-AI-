import React, { useState, useEffect, useRef } from 'react';
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
  Mic,
  MicOff,
  Sliders,
  Check,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Grid2X2,
  CalendarDays,
  Brain,
  Volume2,
  AlertTriangle,
  Play,
  Share2,
  Award,
  Zap,
} from 'lucide-react';
import { TaskItem, CalendarEventItem, EisenhowerQuadrant, SubTask } from '../types';

interface TaskPulseTaskManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId?: string;
  onTaskUpdated?: () => void;
}

export const TaskPulseTaskManagerModal: React.FC<TaskPulseTaskManagerModalProps> = ({
  isOpen,
  onClose,
  profileId = 'will-owner',
  onTaskUpdated,
}) => {
  // Navigation & View State
  const [activeView, setActiveView] = useState<'MATRIX' | 'CALENDAR' | 'LIST' | 'BRIEFING'>('MATRIX');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiProcessingAction, setAiProcessingAction] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Input & Voice State
  const [taskInputText, setTaskInputText] = useState<string>('');
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Calendar State
  const [calendarViewMode, setCalendarViewMode] = useState<'MONTH' | 'WEEK' | 'DAY'>('WEEK');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());

  // Task Creation / Editing Modal State
  const [isEditingTask, setIsEditingTask] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [urgency, setUrgency] = useState<number>(5);
  const [importance, setImportance] = useState<number>(5);
  const [category, setCategory] = useState<'WORK' | 'PERSONAL' | 'HEALTH' | 'LEARNING' | 'MEETING' | 'GENERAL'>('WORK');
  const [tags, setTags] = useState<string>('Priority');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [dueDateTime, setDueDateTime] = useState<string>('');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number>(15);

  // AI Briefing State
  const [aiBriefingText, setAiBriefingText] = useState<string>('');
  const [briefingStats, setBriefingStats] = useState<any>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState<boolean>(false);

  // Due Reminders Notification Banner State
  const [dueReminderTasks, setDueReminderTasks] = useState<TaskItem[]>([]);
  const [activeAlertTask, setActiveAlertTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
      startReminderChecker();
    }
  }, [isOpen, profileId]);

  // Audio Chime Generator using Web Audio API
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (err) {
      console.warn('Web Audio chime sound omitted:', err);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [tasksRes, calRes] = await Promise.all([
        fetch(`/api/tasks?profileId=${encodeURIComponent(profileId)}`),
        fetch(`/api/calendar/events?profileId=${encodeURIComponent(profileId)}`),
      ]);

      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        if (Array.isArray(tData.tasks)) {
          setTasks(tData.tasks);
          checkDueTasks(tData.tasks);
        }
      }

      if (calRes.ok) {
        const cData = await calRes.json();
        if (Array.isArray(cData.events)) {
          setCalendarEvents(cData.events);
        }
      }
    } catch (err) {
      console.error('Failed fetching tasks & calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkDueTasks = (taskList: TaskItem[]) => {
    const now = new Date().getTime();
    const due = taskList.filter((t) => {
      if (t.completed) return false;
      if (t.snoozedUntil && new Date(t.snoozedUntil).getTime() > now) return false;
      if (t.dueDate) {
        const dueTime = new Date(t.dueDate).getTime();
        const diffMins = (dueTime - now) / (1000 * 60);
        return diffMins <= (t.reminderMinutesBefore || 15) && diffMins >= -120; // due soon or within last 2 hours
      }
      return false;
    });

    setDueReminderTasks(due);
    if (due.length > 0 && !activeAlertTask) {
      setActiveAlertTask(due[0]);
      playChimeSound();
    }
  };

  const startReminderChecker = () => {
    const interval = setInterval(() => {
      if (tasks.length > 0) {
        checkDueTasks(tasks);
      }
    }, 15000); // check every 15 seconds
    return () => clearInterval(interval);
  };

  // Voice Input Setup (Web Speech API)
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setFeedbackMessage('Voice speech recognition is not supported in this browser.');
      setTimeout(() => setFeedbackMessage(null), 3000);
      return;
    }

    if (isListeningVoice) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListeningVoice(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setFeedbackMessage('Listening to your voice command...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setTaskInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListeningVoice(false);
        setFeedbackMessage(`Voice error: ${event.error}`);
        setTimeout(() => setFeedbackMessage(null), 3000);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
        setFeedbackMessage(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsListeningVoice(false);
    }
  };

  // AI Parse Natural Language Voice/Text Task Entry
  const handleAiParseTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskInputText.trim()) return;

    setAiProcessingAction('Parsing task via AI...');
    try {
      const res = await fetch('/api/tasks/ai-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: taskInputText, profileId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => [data.task, ...prev]);
          setTaskInputText('');
          setFeedbackMessage(`✨ Task Created: "${data.task.title}" (Q${data.task.eisenhowerQuadrant.charAt(1)})`);
          setTimeout(() => setFeedbackMessage(null), 4000);
          fetchAllData();
          onTaskUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed AI parsing task:', err);
    } finally {
      setAiProcessingAction(null);
    }
  };

  // AI Auto-Prioritize All Tasks
  const handleAiAutoPrioritize = async () => {
    setAiProcessingAction('AI Evaluating Task Priorities & Urgency...');
    try {
      const res = await fetch('/api/tasks/ai-prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.updatedTasks)) {
          setTasks((prev) =>
            prev.map((t) => {
              const updated = data.updatedTasks.find((u: TaskItem) => u.id === t.id);
              return updated || t;
            })
          );
          setFeedbackMessage(`✨ AI recalculated priorities for ${data.updatedTasks.length} tasks!`);
          setTimeout(() => setFeedbackMessage(null), 4000);
          onTaskUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed AI prioritization:', err);
    } finally {
      setAiProcessingAction(null);
    }
  };

  // AI Smart Schedule Assistant
  const handleAiSmartSchedule = async () => {
    setAiProcessingAction('AI Finding Optimal Calendar Focus Blocks...');
    try {
      const res = await fetch('/api/tasks/ai-schedule-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.scheduledTasks)) {
          setFeedbackMessage(`✨ AI scheduled ${data.scheduledTasks.length} tasks into calendar focus slots!`);
          setTimeout(() => setFeedbackMessage(null), 4000);
          fetchAllData();
          onTaskUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed AI smart scheduling:', err);
    } finally {
      setAiProcessingAction(null);
    }
  };

  // AI Subtask Breakdown Generator
  const handleAiBreakdownSubtasks = async (task: TaskItem) => {
    setAiProcessingAction(`Decomposing "${task.title}" into subtasks...`);
    try {
      const res = await fetch('/api/tasks/ai-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, taskTitle: task.title, taskDescription: task.description }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
          setFeedbackMessage(`✨ Generated ${data.subtasks?.length || 0} actionable subtasks!`);
          setTimeout(() => setFeedbackMessage(null), 3000);
          onTaskUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed subtask breakdown:', err);
    } finally {
      setAiProcessingAction(null);
    }
  };

  // Fetch Daily Briefing
  const fetchAiBriefing = async () => {
    setIsBriefingLoading(true);
    try {
      const res = await fetch(`/api/tasks/ai-briefing?profileId=${encodeURIComponent(profileId)}`);
      if (res.ok) {
        const data = await res.json();
        setAiBriefingText(data.briefing || '');
        setBriefingStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed fetching briefing:', err);
    } finally {
      setIsBriefingLoading(false);
    }
  };

  // Toggle Task Completed
  const handleToggleTask = async (task: TaskItem) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
          onTaskUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed toggling task:', err);
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = async (task: TaskItem, subtaskId: string) => {
    const updatedSubtasks = (task.subtasks || []).map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtasks: updatedSubtasks }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
          onTaskUpdated?.();
        }
      }
    } catch (err) {
      console.error('Failed toggling subtask:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        onTaskUpdated?.();
      }
    } catch (err) {
      console.error('Failed deleting task:', err);
    }
  };

  // Save Manual Task
  const handleSaveManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      profileId,
      title,
      description,
      urgency,
      importance,
      category,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      estimatedMinutes: Number(estimatedMinutes) || 30,
      dueDate: dueDateTime ? new Date(dueDateTime).toISOString() : undefined,
      reminderMinutesBefore: Number(reminderMinutesBefore) || 15,
    };

    try {
      if (isEditingTask && editingTaskId) {
        const res = await fetch(`/api/tasks/${editingTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setTasks((prev) => prev.map((t) => (t.id === editingTaskId ? data.task : t)));
        }
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setTasks((prev) => [data.task, ...prev]);
        }
      }

      setIsEditingTask(false);
      setEditingTaskId(null);
      resetManualForm();
      fetchAllData();
      onTaskUpdated?.();
    } catch (err) {
      console.error('Failed saving manual task:', err);
    }
  };

  const resetManualForm = () => {
    setTitle('');
    setDescription('');
    setUrgency(5);
    setImportance(5);
    setCategory('WORK');
    setTags('Priority');
    setEstimatedMinutes(30);
    setDueDateTime('');
    setReminderMinutesBefore(15);
  };

  const startEditTask = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setUrgency(task.urgency || 5);
    setImportance(task.importance || 5);
    setCategory(task.category || 'WORK');
    setTags((task.tags || []).join(', '));
    setEstimatedMinutes(task.estimatedMinutes || 30);
    setDueDateTime(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '');
    setReminderMinutesBefore(task.reminderMinutesBefore || 15);
    setIsEditingTask(true);
  };

  // Snooze Alert Task
  const handleSnoozeAlert = async (taskId: string, mins: number) => {
    const snoozedUntil = new Date(Date.now() + mins * 60000).toISOString();
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snoozedUntil }),
      });
      setActiveAlertTask(null);
      fetchAllData();
    } catch (err) {
      console.error('Failed snoozing task:', err);
    }
  };

  if (!isOpen) return null;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Group by Eisenhower Quadrants
  const q1DoFirst = filteredTasks.filter((t) => !t.completed && t.eisenhowerQuadrant === 'Q1_DO_FIRST');
  const q2Schedule = filteredTasks.filter((t) => !t.completed && t.eisenhowerQuadrant === 'Q2_SCHEDULE');
  const q3Delegate = filteredTasks.filter((t) => !t.completed && t.eisenhowerQuadrant === 'Q3_DELEGATE');
  const q4Eliminate = filteredTasks.filter((t) => !t.completed && t.eisenhowerQuadrant === 'Q4_ELIMINATE');
  const completedTasks = filteredTasks.filter((t) => t.completed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20 text-white">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                  TaskPulse AI Management
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Voice & Calendar Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Voice/Text Capture • Eisenhower Matrix Prioritization • Calendar Time Blocking • Reminders
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={handleAiAutoPrioritize}
              disabled={!!aiProcessingAction}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-sm border border-indigo-500/50 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>AI Auto-Prioritize</span>
            </button>

            <button
              onClick={handleAiSmartSchedule}
              disabled={!!aiProcessingAction}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-medium transition shadow-sm border border-purple-500/50 disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-200" />
              <span>AI Smart Schedule</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback or AI Loading Bar */}
        {(aiProcessingAction || feedbackMessage) && (
          <div className="bg-purple-950/80 border-b border-purple-800/60 px-4 py-2 flex items-center justify-between text-xs text-purple-200 animate-in slide-in-from-top duration-150">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />
              <span>{aiProcessingAction || feedbackMessage}</span>
            </div>
          </div>
        )}

        {/* Timely Due Reminder Alert Banner (if any) */}
        {activeAlertTask && (
          <div className="bg-gradient-to-r from-amber-950 via-red-950 to-slate-900 border-b border-amber-600/50 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-100 shadow-inner">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-white">UPCOMING DUE REMINDER:</span>
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded border border-red-500/40 font-mono">
                    {activeAlertTask.dueTimeFormatted || 'Due Now'}
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 font-medium">{activeAlertTask.title}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleToggleTask(activeAlertTask)}
                className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Done</span>
              </button>
              <button
                onClick={() => handleSnoozeAlert(activeAlertTask.id, 10)}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600"
              >
                Snooze 10m
              </button>
              <button
                onClick={() => handleSnoozeAlert(activeAlertTask.id, 60)}
                className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600"
              >
                Snooze 1h
              </button>
              <button
                onClick={() => setActiveAlertTask(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Voice / Text Quick Task Capture Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800/80">
          <form onSubmit={handleAiParseTask} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={taskInputText}
                onChange={(e) => setTaskInputText(e.target.value)}
                placeholder="Speak or type task (e.g., 'Finish Q3 presentation deck by tomorrow 3 PM high priority #work')..."
                className="w-full pl-10 pr-12 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition shadow-inner"
              />
              <Sparkles className="w-4 h-4 text-purple-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`absolute right-2 top-2 p-1.5 rounded-lg transition ${
                  isListeningVoice
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isListeningVoice ? 'Listening... click to stop' : 'Click to dictate via Voice'}
              >
                {isListeningVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!taskInputText.trim() || !!aiProcessingAction}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition shadow-md flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Task</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetManualForm();
                setIsEditingTask(true);
                setEditingTaskId(null);
              }}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition border border-slate-700 flex items-center space-x-1"
              title="Open Manual Task Form with Urgency/Importance Sliders"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* View Switcher & Filters Navigation Bar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveView('MATRIX')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center space-x-1.5 ${
                activeView === 'MATRIX'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
              <span>Eisenhower Matrix</span>
            </button>

            <button
              onClick={() => setActiveView('CALENDAR')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center space-x-1.5 ${
                activeView === 'CALENDAR'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendar Schedule</span>
            </button>

            <button
              onClick={() => setActiveView('LIST')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center space-x-1.5 ${
                activeView === 'LIST'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>All Tasks ({filteredTasks.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveView('BRIEFING');
                fetchAiBriefing();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center space-x-1.5 ${
                activeView === 'BRIEFING'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-yellow-300" />
              <span>AI Daily Briefing</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="WORK">Work</option>
              <option value="HEALTH">Health & Wellness</option>
              <option value="LEARNING">Learning</option>
              <option value="PERSONAL">Personal</option>
              <option value="MEETING">Meeting</option>
            </select>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder-slate-500 w-36 focus:outline-none focus:w-48 transition-all"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* VIEW 1: EISENHOWER 4-QUADRANT MATRIX */}
          {activeView === 'MATRIX' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Tasks auto-placed into quadrants based on Urgency & Importance score ($1-10$)</span>
                </span>
                <span>Active Tasks: {tasks.filter(t => !t.completed).length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* QUADRANT 1: DO FIRST (High Urgency, High Importance) */}
                <div className="bg-red-950/20 border border-red-800/40 rounded-2xl p-4 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-red-800/30 pb-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                      <h3 className="font-bold text-sm text-red-200">Q1: DO FIRST</h3>
                      <span className="text-xs text-red-400 font-mono">(Urgent & Important)</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-300 rounded font-bold font-mono">
                      {q1DoFirst.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {q1DoFirst.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-8">No urgent Q1 tasks. You are in control!</p>
                    ) : (
                      q1DoFirst.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onEdit={startEditTask}
                          onBreakdown={handleAiBreakdownSubtasks}
                          onToggleSubtask={handleToggleSubtask}
                          badgeColor="bg-red-500/20 text-red-300 border-red-500/40"
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* QUADRANT 2: SCHEDULE (Low Urgency, High Importance - Deep Work) */}
                <div className="bg-purple-950/20 border border-purple-800/40 rounded-2xl p-4 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-purple-800/30 pb-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                      <h3 className="font-bold text-sm text-purple-200">Q2: SCHEDULE</h3>
                      <span className="text-xs text-purple-400 font-mono">(Important, Deep Work)</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded font-bold font-mono">
                      {q2Schedule.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {q2Schedule.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-8">No Q2 focus tasks defined.</p>
                    ) : (
                      q2Schedule.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onEdit={startEditTask}
                          onBreakdown={handleAiBreakdownSubtasks}
                          onToggleSubtask={handleToggleSubtask}
                          badgeColor="bg-purple-500/20 text-purple-300 border-purple-500/40"
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* QUADRANT 3: DELEGATE / QUICK WINS (High Urgency, Low Importance) */}
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-amber-800/30 pb-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                      <h3 className="font-bold text-sm text-amber-200">Q3: DELEGATE / QUICK WINS</h3>
                      <span className="text-xs text-amber-400 font-mono">(Urgent, Low Impact)</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded font-bold font-mono">
                      {q3Delegate.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {q3Delegate.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-8">No Q3 delegate items.</p>
                    ) : (
                      q3Delegate.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onEdit={startEditTask}
                          onBreakdown={handleAiBreakdownSubtasks}
                          onToggleSubtask={handleToggleSubtask}
                          badgeColor="bg-amber-500/20 text-amber-300 border-amber-500/40"
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* QUADRANT 4: ELIMINATE / BACKLOG (Low Urgency, Low Importance) */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex flex-col min-h-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-slate-500"></span>
                      <h3 className="font-bold text-sm text-slate-300">Q4: ELIMINATE / BACKLOG</h3>
                      <span className="text-xs text-slate-500 font-mono">(Low Priority)</span>
                    </div>
                    <span className="px-2 py-0.5 text-xs bg-slate-800 text-slate-400 rounded font-bold font-mono">
                      {q4Eliminate.length}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    {q4Eliminate.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-8">No backlog items.</p>
                    ) : (
                      q4Eliminate.map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          onToggle={handleToggleTask}
                          onDelete={handleDeleteTask}
                          onEdit={startEditTask}
                          onBreakdown={handleAiBreakdownSubtasks}
                          onToggleSubtask={handleToggleSubtask}
                          badgeColor="bg-slate-800 text-slate-400 border-slate-700"
                        />
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW 2: CALENDAR SCHEDULE VIEW */}
          {activeView === 'CALENDAR' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const d = new Date(currentCalendarDate);
                      d.setDate(d.getDate() - 7);
                      setCurrentCalendarDate(d);
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold text-slate-100 font-mono">
                    {currentCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => {
                      const d = new Date(currentCalendarDate);
                      d.setDate(d.getDate() + 7);
                      setCurrentCalendarDate(d);
                    }}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setCurrentCalendarDate(new Date())}
                    className="px-2.5 py-1 text-xs bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAiSmartSchedule}
                    className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center space-x-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Schedule Unallocated Tasks</span>
                  </button>
                </div>
              </div>

              {/* Weekly Time Grid */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
                <div className="grid grid-cols-7 gap-2 min-w-[650px]">
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const dayDate = new Date(currentCalendarDate);
                    const dayOfWeek = dayDate.getDay();
                    dayDate.setDate(dayDate.getDate() - dayOfWeek + dayIdx);

                    const dayStr = dayDate.toDateString();
                    const isToday = new Date().toDateString() === dayStr;

                    const dayEvents = calendarEvents.filter((e) => {
                      return new Date(e.startTime).toDateString() === dayStr;
                    });

                    const dayTasks = tasks.filter((t) => {
                      return t.scheduledStartTime && new Date(t.scheduledStartTime).toDateString() === dayStr;
                    });

                    return (
                      <div
                        key={dayIdx}
                        className={`border rounded-xl p-3 flex flex-col min-h-[260px] ${
                          isToday
                            ? 'bg-purple-950/20 border-purple-500/50'
                            : 'bg-slate-900/50 border-slate-800'
                        }`}
                      >
                        <div className="text-center pb-2 border-b border-slate-800 mb-2">
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <p className={`text-base font-bold font-mono ${isToday ? 'text-purple-300' : 'text-slate-200'}`}>
                            {dayDate.getDate()}
                          </p>
                        </div>

                        <div className="space-y-1.5 flex-1">
                          {dayEvents.map((evt) => (
                            <div
                              key={evt.id}
                              className="p-1.5 rounded-lg text-[11px] font-medium border border-blue-500/30 bg-blue-500/10 text-blue-200 shadow-sm"
                            >
                              <div className="font-semibold truncate">{evt.title}</div>
                              <div className="text-[10px] text-blue-400 font-mono">
                                {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))}

                          {dayTasks.map((t) => (
                            <div
                              key={t.id}
                              className={`p-1.5 rounded-lg text-[11px] font-medium border shadow-sm ${
                                t.completed
                                  ? 'bg-slate-900/80 border-slate-800 text-slate-500 line-through'
                                  : 'bg-purple-900/30 border-purple-500/40 text-purple-200'
                              }`}
                            >
                              <div className="font-semibold truncate">{t.title}</div>
                              <div className="text-[10px] text-purple-400 font-mono">
                                {t.scheduledStartTime ? new Date(t.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All Day'}
                              </div>
                            </div>
                          ))}

                          {dayEvents.length === 0 && dayTasks.length === 0 && (
                            <p className="text-[10px] text-slate-600 text-center py-6 italic">Free slot</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: ALL TASKS LIST */}
          {activeView === 'LIST' && (
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tasks match your filter criteria.</p>
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onEdit={startEditTask}
                    onBreakdown={handleAiBreakdownSubtasks}
                    onToggleSubtask={handleToggleSubtask}
                    badgeColor={
                      t.eisenhowerQuadrant === 'Q1_DO_FIRST'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : t.eisenhowerQuadrant === 'Q2_SCHEDULE'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* VIEW 4: AI DAILY BRIEFING */}
          {activeView === 'BRIEFING' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-700/50 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-purple-800/40 pb-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-600/30 text-purple-300 rounded-xl border border-purple-500/40">
                      <Brain className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Executive Daily Morning Briefing</h3>
                      <p className="text-xs text-purple-300">Generated by TaskPulse Gemini Intelligence</p>
                    </div>
                  </div>

                  <button
                    onClick={fetchAiBriefing}
                    disabled={isBriefingLoading}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBriefingLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate Briefing</span>
                  </button>
                </div>

                {isBriefingLoading ? (
                  <div className="py-12 text-center text-purple-300 text-sm flex items-center justify-center space-x-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Synthesizing your executive schedule & priorities...</span>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                    {aiBriefingText}
                  </div>
                )}

                {briefingStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-purple-800/30 text-center">
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xl font-bold text-red-400 font-mono">{briefingStats.q1Count}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Q1 Do First</div>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xl font-bold text-purple-400 font-mono">{briefingStats.q2Count}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Q2 Deep Work</div>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xl font-bold text-blue-400 font-mono">{briefingStats.eventsCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Appointments</div>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xl font-bold text-emerald-400 font-mono">{briefingStats.completedCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Completed</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* MANUAL TASK EDITING MODAL / OVERLAY */}
        {isEditingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-base text-white">
                  {editingTaskId ? 'Edit Task Parameters' : 'Create Custom Task'}
                </h3>
                <button
                  onClick={() => setIsEditingTask(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveManualTask} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Task Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g., Finalize architecture proposal"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Description / Notes</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Details, requirements, links..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div>
                    <div className="flex justify-between text-slate-300 font-semibold mb-1">
                      <span>Urgency:</span>
                      <span className="font-mono text-purple-400">{urgency}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={urgency}
                      onChange={(e) => setUrgency(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <span className="text-[10px] text-slate-500">How time-sensitive is this?</span>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 font-semibold mb-1">
                      <span>Importance:</span>
                      <span className="font-mono text-purple-400">{importance}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={importance}
                      onChange={(e) => setImportance(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <span className="text-[10px] text-slate-500">How strategic is the impact?</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="WORK">Work</option>
                      <option value="HEALTH">Health</option>
                      <option value="LEARNING">Learning</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="MEETING">Meeting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Est. Minutes</label>
                    <input
                      type="number"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                      min="5"
                      step="5"
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Due Date & Time</label>
                    <input
                      type="datetime-local"
                      value={dueDateTime}
                      onChange={(e) => setDueDateTime(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Reminder Alert</label>
                    <select
                      value={reminderMinutesBefore}
                      onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="5">5 mins before</option>
                      <option value="15">15 mins before</option>
                      <option value="30">30 mins before</option>
                      <option value="60">1 hour before</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingTask(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Reusable TaskCard Component
interface TaskCardProps {
  task: TaskItem;
  onToggle: (task: TaskItem) => void;
  onDelete: (id: string) => void;
  onEdit: (task: TaskItem) => void;
  onBreakdown: (task: TaskItem) => void;
  onToggleSubtask: (task: TaskItem, subtaskId: string) => void;
  badgeColor: string;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggle,
  onDelete,
  onEdit,
  onBreakdown,
  onToggleSubtask,
  badgeColor,
}) => {
  const [showSubtasks, setShowSubtasks] = useState<boolean>(false);

  return (
    <div
      className={`p-3.5 rounded-xl border transition shadow-sm hover:shadow-md ${
        task.completed
          ? 'bg-slate-950/40 border-slate-800/80 opacity-60'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-2.5 flex-1 min-w-0">
          <button
            onClick={() => onToggle(task)}
            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition"
          >
            {task.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <Circle className="w-5 h-5 text-slate-500" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span
                className={`text-sm font-semibold truncate ${
                  task.completed ? 'line-through text-slate-500' : 'text-slate-100'
                }`}
              >
                {task.title}
              </span>

              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border ${badgeColor}`}>
                Score: {task.priorityScore}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
            )}

            {task.aiSuggestedReasoning && (
              <p className="text-[11px] text-purple-300/90 italic mt-1 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">{task.aiSuggestedReasoning}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-slate-400">
              {task.dueTimeFormatted && (
                <span className="flex items-center space-x-1 text-amber-300 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{task.dueTimeFormatted}</span>
                </span>
              )}

              {task.estimatedMinutes && (
                <span className="text-slate-500 font-mono">{task.estimatedMinutes}m est</span>
              )}

              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                {task.category}
              </span>
            </div>

            {/* Subtasks Accordion */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className="text-xs text-purple-400 hover:underline flex items-center space-x-1"
                >
                  <span>
                    Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                  </span>
                </button>

                {showSubtasks && (
                  <div className="mt-1.5 space-y-1 pl-2">
                    {task.subtasks.map((st) => (
                      <div key={st.id} className="flex items-center space-x-2 text-xs">
                        <button onClick={() => onToggleSubtask(task, st.id)}>
                          {st.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-600" />
                          )}
                        </button>
                        <span className={st.completed ? 'line-through text-slate-500' : 'text-slate-300'}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onBreakdown(task)}
            className="p-1 rounded hover:bg-slate-800 text-purple-400 hover:text-purple-300"
            title="AI Breakdown into subtasks"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Edit Task"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
