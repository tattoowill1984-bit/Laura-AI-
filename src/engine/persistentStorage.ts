import fs from 'fs';
import path from 'path';

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
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.profiles)) {
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
}

export const persistentStorage = new PersistentStorage();
