import fs from 'fs';
import path from 'path';
import { ReminderItem } from '../types';

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
  commitReceipts?: any[];
  burnLogEntries?: any[];
  version: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'gabby_db.json');

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
}

export const persistentStorage = new PersistentStorage();
