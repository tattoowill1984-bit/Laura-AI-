import fs from 'fs';
import path from 'path';
import { ReminderItem, TaskItem, CalendarEventItem, EisenhowerQuadrant } from '../types';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: 'OWNER' | 'MEMBER' | 'GUEST';
  passcode?: string; // 4-digit PIN or password
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

export interface LongTermMemoryItem {
  id: string;
  profileId: string;
  fact: string;
  category: 'PERSONAL' | 'PREFERENCE' | 'GOAL' | 'CONTEXT' | 'INVARIANT' | 'SYSTEM_CONFIG';
  source: 'USER_INPUT' | 'GABBY_INFERENCE' | 'MANUAL_ENTRY' | 'EXPERT_USER_STATEMENT';
  confidence: number; // 0-100
  createdAt: string;
  updatedAt: string;
  verifiedByOwner: boolean;
  factKey?: string;
  superseded?: boolean;
  supersededBy?: string;
  previousValue?: string;
  supersededAt?: string;
  merkleNodeHash?: string;
}

export interface StoredChatMessage {
  id: string;
  profileId: string;
  sender: 'USER' | 'SENTINEL';
  text: string;
  timestamp: string;
  envelope?: any;
  fabric?: any;
  uncertainty?: any;
}

interface DatabaseSchema {
  profiles: UserProfile[];
  memories: LongTermMemoryItem[];
  chatHistories: StoredChatMessage[];
  reminders?: ReminderItem[];
  tasks?: TaskItem[];
  calendarEvents?: CalendarEventItem[];
  commitReceipts?: any[];
  burnLogEntries?: any[];
  version: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'gabby_db.json');

const DEFAULT_INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-q3-roadmap',
    profileId: 'will-owner',
    title: 'Finalize Q3 Product Architecture & Roadmap',
    description: 'Review system specs, define core priorities, and outline deliverables for the engineering team.',
    urgency: 9,
    importance: 10,
    eisenhowerQuadrant: 'Q1_DO_FIRST',
    priorityScore: 9.5,
    priorityLevel: 'CRITICAL',
    category: 'WORK',
    tags: ['Strategy', 'Roadmap', 'Architecture'],
    estimatedMinutes: 60,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    dueTimeFormatted: 'Today at 3:00 PM',
    scheduledStartTime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    scheduledEndTime: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    completed: false,
    subtasks: [
      { id: 'sub-1', title: 'Audit AI model routing endpoints', completed: true },
      { id: 'sub-2', title: 'Draft milestone breakdown doc', completed: false },
      { id: 'sub-3', title: 'Schedule review with team leads', completed: false }
    ],
    reminderMinutesBefore: 15,
    aiSuggestedReasoning: 'High business impact & imminent deadline today at 3 PM.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-board-deck',
    profileId: 'will-owner',
    title: 'Prepare Board Meeting Presentation Deck',
    description: 'Synthesize quarterly growth metrics, AI capabilities performance, and upcoming features.',
    urgency: 8,
    importance: 9,
    eisenhowerQuadrant: 'Q1_DO_FIRST',
    priorityScore: 8.5,
    priorityLevel: 'CRITICAL',
    category: 'WORK',
    tags: ['Board', 'Presentation', 'Executive'],
    estimatedMinutes: 90,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    dueTimeFormatted: 'Tomorrow at 10:00 AM',
    scheduledStartTime: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    scheduledEndTime: new Date(Date.now() + 1000 * 60 * 60 * 25.5).toISOString(),
    completed: false,
    subtasks: [
      { id: 'sub-10', title: 'Export analytics graphs', completed: false },
      { id: 'sub-11', title: 'Write executive summary slide', completed: false }
    ],
    reminderMinutesBefore: 30,
    aiSuggestedReasoning: 'Critical deadline tomorrow morning; high visibility deliverable.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-deep-focus-api',
    profileId: 'will-owner',
    title: 'Deep Work: Refactor Task & Calendar Engine API',
    description: 'Optimize endpoint response time, implement strict schema validation, and streamline state persistence.',
    urgency: 4,
    importance: 9,
    eisenhowerQuadrant: 'Q2_SCHEDULE',
    priorityScore: 6.5,
    priorityLevel: 'HIGH',
    category: 'WORK',
    tags: ['Engineering', 'Refactoring', 'DeepWork'],
    estimatedMinutes: 120,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    dueTimeFormatted: 'In 2 days at 2:00 PM',
    scheduledStartTime: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    scheduledEndTime: new Date(Date.now() + 1000 * 60 * 60 * 50).toISOString(),
    completed: false,
    subtasks: [],
    reminderMinutesBefore: 15,
    aiSuggestedReasoning: 'High long-term technical value; schedule uninterrupted focus block.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-health-workout',
    profileId: 'will-owner',
    title: '30-Min Cardio & Strength Workout Session',
    description: 'High-intensity interval training or outdoor run for physical wellness.',
    urgency: 7,
    importance: 8,
    eisenhowerQuadrant: 'Q2_SCHEDULE',
    priorityScore: 7.5,
    priorityLevel: 'HIGH',
    category: 'HEALTH',
    tags: ['Fitness', 'Wellness', 'Daily Routine'],
    estimatedMinutes: 30,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    dueTimeFormatted: 'Today at 5:00 PM',
    scheduledStartTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    scheduledEndTime: new Date(Date.now() + 1000 * 60 * 60 * 5.5).toISOString(),
    completed: false,
    subtasks: [],
    reminderMinutesBefore: 15,
    aiSuggestedReasoning: 'Key personal health habit scheduled for late afternoon energy booster.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-review-expenses',
    profileId: 'will-owner',
    title: 'Review Weekly Operational Expense Receipts',
    description: 'Check subscription invoices, cloud compute logs, and approve pending vendor payouts.',
    urgency: 8,
    importance: 4,
    eisenhowerQuadrant: 'Q3_DELEGATE',
    priorityScore: 6.0,
    priorityLevel: 'MEDIUM',
    category: 'WORK',
    tags: ['Finance', 'Admin'],
    estimatedMinutes: 20,
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(),
    dueTimeFormatted: 'Tomorrow at 2:00 PM',
    completed: false,
    subtasks: [],
    reminderMinutesBefore: 15,
    aiSuggestedReasoning: 'Time-sensitive admin task; quick win or candidate for delegation.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const DEFAULT_INITIAL_CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: 'evt-q3-roadmap',
    taskId: 'task-q3-roadmap',
    title: 'Finalize Q3 Product Architecture & Roadmap',
    description: 'Executive roadmap planning session.',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
    category: 'TASK_SLOT',
    color: '#8b5cf6'
  },
  {
    id: 'evt-health-workout',
    taskId: 'task-health-workout',
    title: '30-Min Cardio & Strength Workout Session',
    description: 'Fitness focus block.',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 5.5).toISOString(),
    category: 'TASK_SLOT',
    color: '#10b981'
  },
  {
    id: 'evt-team-sync',
    title: 'Weekly Executive & Engineering Sync',
    description: 'Cross-functional alignment on deliverables.',
    startTime: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    endTime: new Date(Date.now() + 1000 * 60 * 60 * 27).toISOString(),
    category: 'MEETING',
    color: '#3b82f6',
    location: 'Virtual Conference Room 1'
  }
];

const DEFAULT_WILL_PROFILE: UserProfile = {
  id: 'will-owner',
  name: "Will's Personal Space",
  email: 'will@laura.ai',
  role: 'OWNER',
  passcode: '', // default open or 4-digit pin set by Will
  avatarColor: 'from-purple-600 to-indigo-600',
  createdAt: new Date().toISOString(),
  lastActive: new Date().toISOString(),
  preferences: {
    autoReadback: false,
    speechRate: 1.0,
    speechPitch: 1.0,
    subtleOperatorView: false,
  },
};

const DEFAULT_INITIAL_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-telemetry-check',
    profileId: 'will-owner',
    title: 'Review System Epistemic Telemetry & Merkle Roots',
    notes: 'Verify invariant integrity across all defensive postures.',
    dueTimestamp: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(),
    formattedDue: 'Today at 2 hours from now',
    priority: 'HIGH',
    category: 'TASK',
    completed: false,
    source: 'AUTONOMOUS_PROACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rem-research-brief',
    profileId: 'will-owner',
    title: 'Synthesize Autonomous Cognitive Multi-Agent Findings',
    notes: 'Check cognitive memory dream cycles and active goal stack.',
    dueTimestamp: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    formattedDue: 'Tomorrow at this time',
    priority: 'MEDIUM',
    category: 'LEARNING',
    completed: false,
    source: 'NATURAL_LANGUAGE_CHAT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_INITIAL_MEMORIES: LongTermMemoryItem[] = [
  {
    id: 'mem-will-identity',
    profileId: 'will-owner',
    fact: 'Will is the primary system owner, designer, and partner for Laura AI.',
    category: 'PERSONAL',
    source: 'MANUAL_ENTRY',
    confidence: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    verifiedByOwner: true,
  },
  {
    id: 'mem-will-priority',
    profileId: 'will-owner',
    fact: 'Will prefers Laura AI to prioritize direct clarity, truth over confidence, and natural voice/speech interaction.',
    category: 'PREFERENCE',
    source: 'MANUAL_ENTRY',
    confidence: 98,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    verifiedByOwner: true,
  },
];

export class PersistentStorage {
  private db: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.db = this.loadDatabase();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.warn('[PersistentStorage] Failed to create data dir:', err);
      }
    }
  }

  private loadDatabase(): DatabaseSchema {
    let parsed: any = null;
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.profiles)) {
          if (!Array.isArray(parsed.reminders)) {
            parsed.reminders = DEFAULT_INITIAL_REMINDERS;
          }
          if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
            parsed.tasks = DEFAULT_INITIAL_TASKS;
          }
          if (!Array.isArray(parsed.calendarEvents) || parsed.calendarEvents.length === 0) {
            parsed.calendarEvents = DEFAULT_INITIAL_CALENDAR_EVENTS;
          }
          console.log(`[PersistentStorage] Loaded persistent database from ${DB_FILE}`);
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[PersistentStorage] Failed reading database file, creating fresh database:', err);
    }

    const initialDb: DatabaseSchema = {
      profiles: [DEFAULT_WILL_PROFILE],
      memories: DEFAULT_INITIAL_MEMORIES,
      chatHistories: [],
      reminders: DEFAULT_INITIAL_REMINDERS,
      tasks: DEFAULT_INITIAL_TASKS,
      calendarEvents: DEFAULT_INITIAL_CALENDAR_EVENTS,
      version: 1,
    };

    this.saveDatabase(initialDb);
    return initialDb;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDataDir();
      const payload = JSON.stringify(dataToSave || this.db, null, 2);
      fs.writeFileSync(DB_FILE, payload, 'utf-8');
    } catch (err) {
      console.error('[PersistentStorage] Error writing database to disk:', err);
    }
  }

  // --- PROFILES ---
  public getProfiles(): UserProfile[] {
    return this.db.profiles;
  }

  public getProfile(profileId: string): UserProfile | undefined {
    return this.db.profiles.find((p) => p.id === profileId);
  }

  public createOrUpdateProfile(profile: Partial<UserProfile> & { id: string; name: string }): UserProfile {
    const existingIdx = this.db.profiles.findIndex((p) => p.id === profile.id);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      const updated: UserProfile = {
        ...this.db.profiles[existingIdx],
        ...profile,
        lastActive: now,
      };
      this.db.profiles[existingIdx] = updated;
      this.saveDatabase();
      return updated;
    } else {
      const newProf: UserProfile = {
        id: profile.id,
        name: profile.name,
        email: profile.email || `${profile.name.toLowerCase().replace(/\s+/g, '')}@gabby.ai`,
        role: profile.role || 'MEMBER',
        passcode: profile.passcode || '',
        avatarColor: profile.avatarColor || 'from-cyan-600 to-blue-600',
        createdAt: now,
        lastActive: now,
        preferences: profile.preferences || {
          autoReadback: false,
          speechRate: 1.0,
          speechPitch: 1.0,
          subtleOperatorView: false,
        },
      };
      this.db.profiles.push(newProf);
      this.saveDatabase();
      return newProf;
    }
  }

  public authenticateProfile(profileId: string, passcode?: string): { success: boolean; profile?: UserProfile; message?: string } {
    const prof = this.getProfile(profileId);
    if (!prof) {
      return { success: false, message: 'Profile not found.' };
    }
    if (prof.passcode && prof.passcode.trim() !== '') {
      if (prof.passcode.trim() !== (passcode || '').trim()) {
        return { success: false, message: 'Incorrect passcode.' };
      }
    }
    prof.lastActive = new Date().toISOString();
    this.saveDatabase();
    return { success: true, profile: prof };
  }

  // --- MEMORIES ---
  public getMemoriesForProfile(profileId: string): LongTermMemoryItem[] {
    return this.db.memories.filter((m) => m.profileId === profileId);
  }

  public getActiveMemoriesForProfile(profileId: string): LongTermMemoryItem[] {
    return this.db.memories.filter((m) => m.profileId === profileId && !m.superseded);
  }

  public addMemory(
    profileId: string,
    fact: string,
    category: LongTermMemoryItem['category'] = 'PERSONAL',
    source: LongTermMemoryItem['source'] = 'USER_INPUT',
    confidence = 90
  ): LongTermMemoryItem {
    const now = new Date().toISOString();
    const item: LongTermMemoryItem = {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      profileId,
      fact,
      category,
      source,
      confidence,
      createdAt: now,
      updatedAt: now,
      verifiedByOwner: true,
    };
    this.db.memories.push(item);
    this.saveDatabase();
    return item;
  }

  public addMemoryWithLineage(itemData: Omit<LongTermMemoryItem, 'id' | 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): LongTermMemoryItem {
    const now = new Date().toISOString();
    const item: LongTermMemoryItem = {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: itemData.createdAt || now,
      updatedAt: itemData.updatedAt || now,
      ...itemData,
    };
    this.db.memories.push(item);
    this.saveDatabase();
    return item;
  }

  public supersedeMemory(memoryId: string, profileId: string, newMemoryId: string): LongTermMemoryItem | undefined {
    const mem = this.db.memories.find((m) => m.id === memoryId && m.profileId === profileId);
    if (mem) {
      mem.superseded = true;
      mem.supersededBy = newMemoryId;
      mem.supersededAt = new Date().toISOString();
      mem.updatedAt = new Date().toISOString();
      this.saveDatabase();
      return mem;
    }
    return undefined;
  }

  public deleteMemory(memoryId: string, profileId: string): boolean {
    const initialLen = this.db.memories.length;
    this.db.memories = this.db.memories.filter((m) => !(m.id === memoryId && m.profileId === profileId));
    if (this.db.memories.length !== initialLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- CHAT HISTORIES ---
  public getChatHistory(profileId: string): StoredChatMessage[] {
    return this.db.chatHistories.filter((msg) => msg.profileId === profileId);
  }

  public addChatMessage(msg: Omit<StoredChatMessage, 'id' | 'timestamp'> & { timestamp?: string }): StoredChatMessage {
    const fullMsg: StoredChatMessage = {
      id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: msg.timestamp || new Date().toISOString(),
      ...msg,
    };
    this.db.chatHistories.push(fullMsg);
    this.saveDatabase();
    return fullMsg;
  }

  public clearChatHistory(profileId: string) {
    this.db.chatHistories = this.db.chatHistories.filter((msg) => msg.profileId !== profileId);
    this.saveDatabase();
  }

  public resetAllMemory(profileId: string = 'will-owner') {
    this.db.chatHistories = this.db.chatHistories.filter((msg) => msg.profileId !== profileId);
    const now = new Date().toISOString();
    this.db.memories = [
      {
        id: 'mem-will-identity',
        profileId,
        fact: 'Will is the primary system owner, designer, and partner for Laura AI.',
        category: 'PERSONAL',
        source: 'MANUAL_ENTRY',
        confidence: 100,
        createdAt: now,
        updatedAt: now,
        verifiedByOwner: true,
      },
      {
        id: 'mem-will-priority',
        profileId,
        fact: 'Will prefers Laura AI to prioritize direct clarity, truth over confidence, and natural voice/speech interaction.',
        category: 'PREFERENCE',
        source: 'MANUAL_ENTRY',
        confidence: 98,
        createdAt: now,
        updatedAt: now,
        verifiedByOwner: true,
      },
    ];
    this.saveDatabase();
  }

  public saveCommitReceipt(receipt: any) {
    if (!this.db.commitReceipts) this.db.commitReceipts = [];
    this.db.commitReceipts.unshift(receipt);
    this.saveDatabase();
  }

  public saveBurnLogEntry(entry: any) {
    if (!this.db.burnLogEntries) this.db.burnLogEntries = [];
    this.db.burnLogEntries.unshift(entry);
    this.saveDatabase();
  }

  // --- REMINDERS & TASK MANAGEMENT ---
  public getReminders(profileId?: string): ReminderItem[] {
    if (!this.db.reminders) this.db.reminders = [];
    if (!profileId) return [...this.db.reminders];
    return this.db.reminders.filter((r) => r.profileId === profileId);
  }

  public getReminder(id: string): ReminderItem | undefined {
    if (!this.db.reminders) this.db.reminders = [];
    return this.db.reminders.find((r) => r.id === id);
  }

  public createReminder(reminderData: Omit<ReminderItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): ReminderItem {
    if (!this.db.reminders) this.db.reminders = [];
    const now = new Date().toISOString();
    const newReminder: ReminderItem = {
      id: reminderData.id || `REM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: now,
      updatedAt: now,
      ...reminderData,
    };
    this.db.reminders.unshift(newReminder);
    this.saveDatabase();
    return newReminder;
  }

  public updateReminder(id: string, updates: Partial<ReminderItem>): ReminderItem | null {
    if (!this.db.reminders) this.db.reminders = [];
    const idx = this.db.reminders.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const existing = this.db.reminders[idx];
    const updated: ReminderItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.db.reminders[idx] = updated;
    this.saveDatabase();
    return updated;
  }

  public deleteReminder(id: string): boolean {
    if (!this.db.reminders) return false;
    const initialLen = this.db.reminders.length;
    this.db.reminders = this.db.reminders.filter((r) => r.id !== id);
    if (this.db.reminders.length !== initialLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public getDueReminders(profileId?: string): ReminderItem[] {
    if (!this.db.reminders) return [];
    const now = new Date().toISOString();
    return this.db.reminders.filter((r) => {
      if (profileId && r.profileId !== profileId) return false;
      if (r.completed) return false;
      if (r.snoozedUntil && new Date(r.snoozedUntil).toISOString() > now) return false;
      return new Date(r.dueTimestamp).toISOString() <= now;
    });
  }

  public snoozeReminder(id: string, minutes: number = 10): ReminderItem | null {
    const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    return this.updateReminder(id, {
      snoozedUntil,
      acknowledged: false,
    });
  }

  // --- TASK PULSE AI: ADVANCED TASK MANAGEMENT ---
  public getTasks(profileId?: string): TaskItem[] {
    if (!this.db.tasks) this.db.tasks = [...DEFAULT_INITIAL_TASKS];
    if (!profileId) return [...this.db.tasks];
    return this.db.tasks.filter((t) => t.profileId === profileId);
  }

  public getTask(id: string): TaskItem | undefined {
    if (!this.db.tasks) this.db.tasks = [...DEFAULT_INITIAL_TASKS];
    return this.db.tasks.find((t) => t.id === id);
  }

  public createTask(taskData: Partial<TaskItem> & { title: string }): TaskItem {
    if (!this.db.tasks) this.db.tasks = [...DEFAULT_INITIAL_TASKS];
    const now = new Date().toISOString();
    
    // Calculate Priority Score if not present
    const urgency = typeof taskData.urgency === 'number' ? taskData.urgency : 5;
    const importance = typeof taskData.importance === 'number' ? taskData.importance : 5;
    const priorityScore = parseFloat((urgency * 0.5 + importance * 0.5).toFixed(1));

    let quadrant: EisenhowerQuadrant = 'Q2_SCHEDULE';
    if (urgency >= 6 && importance >= 6) quadrant = 'Q1_DO_FIRST';
    else if (urgency < 6 && importance >= 6) quadrant = 'Q2_SCHEDULE';
    else if (urgency >= 6 && importance < 6) quadrant = 'Q3_DELEGATE';
    else quadrant = 'Q4_ELIMINATE';

    let priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (priorityScore >= 8.5) priorityLevel = 'CRITICAL';
    else if (priorityScore >= 6.5) priorityLevel = 'HIGH';
    else if (priorityScore >= 4.5) priorityLevel = 'MEDIUM';
    else priorityLevel = 'LOW';

    const newTask: TaskItem = {
      id: taskData.id || `TASK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      profileId: taskData.profileId || 'will-owner',
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      urgency,
      importance,
      eisenhowerQuadrant: taskData.eisenhowerQuadrant || quadrant,
      priorityScore: taskData.priorityScore || priorityScore,
      priorityLevel: taskData.priorityLevel || priorityLevel,
      category: taskData.category || 'WORK',
      tags: taskData.tags || [],
      estimatedMinutes: taskData.estimatedMinutes || 30,
      dueDate: taskData.dueDate,
      dueTimeFormatted: taskData.dueTimeFormatted,
      scheduledStartTime: taskData.scheduledStartTime,
      scheduledEndTime: taskData.scheduledEndTime,
      completed: !!taskData.completed,
      completedAt: taskData.completed ? now : undefined,
      subtasks: taskData.subtasks || [],
      reminderMinutesBefore: taskData.reminderMinutesBefore || 15,
      aiSuggestedReasoning: taskData.aiSuggestedReasoning,
      createdAt: now,
      updatedAt: now,
    };

    this.db.tasks.unshift(newTask);

    // If task has scheduled time, auto-create a calendar event
    if (newTask.scheduledStartTime) {
      const end = newTask.scheduledEndTime || new Date(new Date(newTask.scheduledStartTime).getTime() + (newTask.estimatedMinutes || 30) * 60000).toISOString();
      this.createCalendarEvent({
        taskId: newTask.id,
        title: newTask.title,
        description: newTask.description,
        startTime: newTask.scheduledStartTime,
        endTime: end,
        category: 'TASK_SLOT',
        color: quadrant === 'Q1_DO_FIRST' ? '#ef4444' : quadrant === 'Q2_SCHEDULE' ? '#8b5cf6' : quadrant === 'Q3_DELEGATE' ? '#f59e0b' : '#6b7280'
      });
    }

    this.saveDatabase();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<TaskItem>): TaskItem | null {
    if (!this.db.tasks) this.db.tasks = [...DEFAULT_INITIAL_TASKS];
    const idx = this.db.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const existing = this.db.tasks[idx];
    const updatedUrgency = typeof updates.urgency === 'number' ? updates.urgency : existing.urgency;
    const updatedImportance = typeof updates.importance === 'number' ? updates.importance : existing.importance;
    const priorityScore = parseFloat((updatedUrgency * 0.5 + updatedImportance * 0.5).toFixed(1));

    let quadrant: EisenhowerQuadrant = existing.eisenhowerQuadrant;
    if (typeof updates.urgency === 'number' || typeof updates.importance === 'number') {
      if (updatedUrgency >= 6 && updatedImportance >= 6) quadrant = 'Q1_DO_FIRST';
      else if (updatedUrgency < 6 && updatedImportance >= 6) quadrant = 'Q2_SCHEDULE';
      else if (updatedUrgency >= 6 && updatedImportance < 6) quadrant = 'Q3_DELEGATE';
      else quadrant = 'Q4_ELIMINATE';
    }

    const updatedTask: TaskItem = {
      ...existing,
      ...updates,
      urgency: updatedUrgency,
      importance: updatedImportance,
      eisenhowerQuadrant: updates.eisenhowerQuadrant || quadrant,
      priorityScore: updates.priorityScore || priorityScore,
      updatedAt: new Date().toISOString(),
    };

    this.db.tasks[idx] = updatedTask;

    // Sync associated calendar event if scheduled time changed
    if (updates.scheduledStartTime || updates.title) {
      const existingEvt = (this.db.calendarEvents || []).find(e => e.taskId === id);
      if (existingEvt) {
        const end = updatedTask.scheduledEndTime || new Date(new Date(updatedTask.scheduledStartTime || existingEvt.startTime).getTime() + (updatedTask.estimatedMinutes || 30) * 60000).toISOString();
        this.updateCalendarEvent(existingEvt.id, {
          title: updatedTask.title,
          startTime: updatedTask.scheduledStartTime || existingEvt.startTime,
          endTime: end,
        });
      } else if (updatedTask.scheduledStartTime) {
        const end = updatedTask.scheduledEndTime || new Date(new Date(updatedTask.scheduledStartTime).getTime() + (updatedTask.estimatedMinutes || 30) * 60000).toISOString();
        this.createCalendarEvent({
          taskId: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description,
          startTime: updatedTask.scheduledStartTime,
          endTime: end,
          category: 'TASK_SLOT',
        });
      }
    }

    this.saveDatabase();
    return updatedTask;
  }

  public toggleTaskComplete(id: string): TaskItem | null {
    const task = this.getTask(id);
    if (!task) return null;
    const now = new Date().toISOString();
    return this.updateTask(id, {
      completed: !task.completed,
      completedAt: !task.completed ? now : undefined,
    });
  }

  public deleteTask(id: string): boolean {
    if (!this.db.tasks) return false;
    const initialLen = this.db.tasks.length;
    this.db.tasks = this.db.tasks.filter((t) => t.id !== id);
    if (this.db.tasks.length !== initialLen) {
      // Also delete linked calendar event
      if (this.db.calendarEvents) {
        this.db.calendarEvents = this.db.calendarEvents.filter(e => e.taskId !== id);
      }
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- CALENDAR EVENTS MANAGEMENT ---
  public getCalendarEvents(profileId?: string): CalendarEventItem[] {
    if (!this.db.calendarEvents) this.db.calendarEvents = [...DEFAULT_INITIAL_CALENDAR_EVENTS];
    return [...this.db.calendarEvents];
  }

  public createCalendarEvent(eventData: Partial<CalendarEventItem>): CalendarEventItem {
    if (!this.db.calendarEvents) this.db.calendarEvents = [...DEFAULT_INITIAL_CALENDAR_EVENTS];
    const now = new Date();
    const startTime = eventData.startTime || now.toISOString();
    const endTime = eventData.endTime || new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const newEvent: CalendarEventItem = {
      id: eventData.id || `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      taskId: eventData.taskId,
      title: eventData.title || 'Untitled Event',
      description: eventData.description || '',
      startTime,
      endTime,
      category: eventData.category || 'APPOINTMENT',
      color: eventData.color || '#3b82f6',
      location: eventData.location,
      attendees: eventData.attendees || [],
    };

    this.db.calendarEvents.push(newEvent);
    this.saveDatabase();
    return newEvent;
  }

  public updateCalendarEvent(id: string, updates: Partial<CalendarEventItem>): CalendarEventItem | null {
    if (!this.db.calendarEvents) this.db.calendarEvents = [...DEFAULT_INITIAL_CALENDAR_EVENTS];
    const idx = this.db.calendarEvents.findIndex((e) => e.id === id);
    if (idx === -1) return null;

    const existing = this.db.calendarEvents[idx];
    const updated: CalendarEventItem = {
      ...existing,
      ...updates,
    };
    this.db.calendarEvents[idx] = updated;
    this.saveDatabase();
    return updated;
  }

  public deleteCalendarEvent(id: string): boolean {
    if (!this.db.calendarEvents) return false;
    const initialLen = this.db.calendarEvents.length;
    this.db.calendarEvents = this.db.calendarEvents.filter((e) => e.id !== id);
    if (this.db.calendarEvents.length !== initialLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }
}

export const persistentStorage = new PersistentStorage();
