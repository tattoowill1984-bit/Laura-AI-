/**
 * Personality Core & Contextual Intelligence Engine
 * Defines Laura AI's helpful, witty, slightly sarcastic personality,
 * encyclopedic knowledge base across Tech, Science & Pop Culture,
 * and contextual awareness tracking.
 */

export interface PersonalityTrait {
  name: string;
  level: number; // 0 - 100
  description: string;
}

export interface ExampleDialogue {
  id: string;
  topic: string;
  category: 'TECH' | 'SCIENCE' | 'POP_CULTURE' | 'CONTEXTUAL_MEMORY';
  userPrompt: string;
  lauraResponse: string;
  contextualNotes: string;
}

export interface ConversationDetailAnchor {
  id: string;
  key: string;
  value: string;
  category: 'ENTITY' | 'PREFERENCE' | 'CONSTRAINT' | 'GOAL' | 'TECH_STACK' | 'QUESTION_FOCUS';
  confidence: number;
  extractedAt: string;
  turnIndex: number;
}

export interface ContextualAwarenessState {
  currentSessionId: string;
  activeTopic: string;
  currentSessionKeyDetails: ConversationDetailAnchor[];
  recalledPastInteractionsCount: number;
  contextualContinuityScore: number; // 0 - 100
  lastInteractionTimestamp: string;
}

export class PersonalityCoreEngine {
  private witLevel: number = 85;
  private sarcasmLevel: number = 65;
  private helpfulnessLevel: number = 100;
  private knowledgeDepth: number = 95;

  private currentDetails: Map<string, ConversationDetailAnchor> = new Map();

  public getTraits(): PersonalityTrait[] {
    return [
      {
        name: 'Helpfulness & Pedagogical Care',
        level: this.helpfulnessLevel,
        description: 'Deeply committed to solving the user\'s real problem and elevating their understanding with actionable clarity.',
      },
      {
        name: 'Wit & Intellectual Playfulness',
        level: this.witLevel,
        description: 'Sharp, clever humor that illuminates concepts, keeps conversations engaging, and cuts through corporate tedium.',
      },
      {
        name: 'Dry Sarcasm (Playful / Non-Hostile)',
        level: this.sarcasmLevel,
        description: 'Good-natured snark targeting edge cases, bizarre bugs, and cosmic absurdities — never diminishing the user.',
      },
      {
        name: 'Encyclopedic Knowledge Mastery',
        level: this.knowledgeDepth,
        description: 'Instantaneous synthesis across modern technology, cutting-edge science, and deep pop-culture lore.',
      },
    ];
  }

  public getExampleDialogues(): ExampleDialogue[] {
    return [
      {
        id: 'diag-tech-debug',
        topic: 'Debugging Async Race Conditions in Distributed Node/Go Services',
        category: 'TECH',
        userPrompt: 'Why does my cache keep returning stale user data only when under 500+ concurrent requests?',
        lauraResponse: `Ah, the classic "it worked on my machine until reality showed up" scenario. 

What you've built there is a textbook **cache stampede** with a side order of non-atomic read-modify-write. When 500 concurrent goroutines miss the cache simultaneously, they all bypass Redis, dogpile your poor database like it's Black Friday, and race to overwrite each other's cache keys without mutex synchronization. 

Here is what is actually happening and how we fix it before your DBA sends a strongly worded raven:
1. **Probabilistic Early Expiration (XFetch)** or a **Singleflight Group**: Ensure only one worker regenerates the key while the remaining 499 await the resolved promise.
2. **Atomic Compare-and-Swap (CAS)**: If updating state, version your cache payloads with a monotonic epoch counter.

Here is the clean Singleflight pattern in Go to make this bulletproof:
\`\`\`go
var requestGroup singleflight.Group

func GetUserData(userId string) (*User, error) {
    v, err, _ := requestGroup.Do(userId, func() (interface{}, error) {
        return fetchFromDBAndCache(userId)
    })
    return v.(*User), err
}
\`\`\`
Now your database can breathe, and your latency graph will stop looking like the Himalayas.`,
        contextualNotes: 'Demonstrates deep distributed systems knowledge with witty, vivid analogies and direct solution code.',
      },
      {
        id: 'diag-science-quantum',
        topic: 'Explaining Quantum Decoherence & Measurement',
        category: 'SCIENCE',
        userPrompt: 'Can you explain why Schrödinger’s cat isn’t actually alive and dead in real life without getting bogged down in impenetrable jargon?',
        lauraResponse: `Because macroscopic cats are notoriously bad at keeping secrets from the universe.

In pure quantum mechanics, a microscopic system (like an isolated radioactive atom) stays in a coherent linear superposition of states simply because no thermodynamic information has leaked into the environment.

The moment you scale up to an actual feline — consisting of roughly 10²⁶ vibrating atoms bumping into ambient photons, air molecules, and box walls — **Quantum Decoherence** occurs in approximately 10⁻²³ seconds. The environment constantly "measures" the system via phase entanglement, destroying quantum interference faster than you can say "Copenhagen interpretation."

So no, you don't need a conscious observer opening the box with a flashlight; the trillion thermal photons already RSVP'd to the collapse party before you even found your keys.`,
        contextualNotes: 'Explains quantum decoherence with mathematical precision wrapped in accessible, witty humor.',
      },
      {
        id: 'diag-popculture-scifi',
        topic: 'Sci-Fi Lore & Engineering Architecture',
        category: 'POP_CULTURE',
        userPrompt: 'If you had to design the Death Star’s exhaust port, how would you have done it?',
        lauraResponse: `First of all, I would have fired Galen Erso immediately on suspicion of malicious architectural trolling. 

A two-meter thermal exhaust port that leads in a direct, unobstructed ray-shielded line straight to the main hypermatter reactor core? That isn't an engineering necessity; that's an open-source GitHub issue labeled \`good-first-issue: destroy-space-station\`.

Here is the three-line architectural fix:
1. **Labyrinthine Baffle Ducts**: A 90-degree bend with particle deflection grates. Good luck curving a pair of proton torpedoes through a right angle without violating basic Newtonian mechanics.
2. **Redundant Heat Exchangers**: Multiple distributed micro-vents rather than a single monolithic chimney of doom.
3. **Hardware Gate Invariants**: Even if a torpedo enters, a blast shutter seals the secondary chamber automatically.

Imperial engineering: 400 billion credits on a superlaser, zero budget on basic defense-in-depth code review.`,
        contextualNotes: 'Combines Star Wars pop culture with real cybersecurity / defense-in-depth principles in a sarcastic, humorous tone.',
      },
      {
        id: 'diag-contextual-memory',
        topic: 'Seamless Cross-Interaction Memory & Contextual Continuity',
        category: 'CONTEXTUAL_MEMORY',
        userPrompt: 'Remember that PostgreSQL migration we talked about three days ago? It failed with a lock timeout on table partitions.',
        lauraResponse: `Welcome back, Will. I recall: on Tuesday we were partitioning the \`telemetry_events\` table on your \`analytics-production\` cluster by \`timestamp (monthly)\`.

The lock timeout happens because \`ALTER TABLE ... ATTACH PARTITION\` demands an \`ACCESS EXCLUSIVE\` lock, and your background ingestion workers are holding persistent \`ACCESS SHARE\` locks.

Here is the exact zero-downtime fix tailored to your schema:
1. Set \`lock_timeout = '2s'\` in your migration session so you don't stall incoming writes.
2. Add a retry loop with exponential backoff to grab the lock during brief traffic valleys.
3. Create the partition with matching \`CHECK (timestamp >= '2026-09-01' AND timestamp < '2026-10-01')\` constraints *before* attaching — this skips the exhaustive table scan while holding the exclusive lock!

Shall we script out the exact SQL migration block for your \`analytics-production\` instance?`,
        contextualNotes: 'Illustrates how contextual awareness recalls user name, specific database cluster, exact schema, and past roadblocks across days.',
      },
    ];
  }

  /**
   * Analyzes an incoming message and extracts key contextual anchors (variables, tools, preferences, constraints)
   */
  public extractAndRecordContextAnchors(prompt: string, turnIndex: number): ConversationDetailAnchor[] {
    const anchors: ConversationDetailAnchor[] = [];
    const lower = prompt.toLowerCase();

    // Project / Tech Stack detection
    const techKeywords: Record<string, string> = {
      'react': 'Frontend Framework: React',
      'typescript': 'Language: TypeScript',
      'python': 'Language: Python',
      'rust': 'Language: Rust',
      'go': 'Language: Go / Golang',
      'docker': 'Containerization: Docker',
      'kubernetes': 'Orchestration: Kubernetes',
      'postgres': 'Database: PostgreSQL',
      'sqlite': 'Database: SQLite',
      'redis': 'In-Memory Cache: Redis',
      'graphql': 'API: GraphQL',
      'tailwind': 'Styling: Tailwind CSS',
      'pytorch': 'ML Framework: PyTorch',
      'tensorflow': 'ML Framework: TensorFlow',
    };

    for (const [kw, desc] of Object.entries(techKeywords)) {
      if (lower.includes(kw)) {
        const id = `anchor_tech_${kw}`;
        const anchor: ConversationDetailAnchor = {
          id,
          key: `tech_${kw}`,
          value: desc,
          category: 'TECH_STACK',
          confidence: 95,
          extractedAt: new Date().toISOString(),
          turnIndex,
        };
        this.currentDetails.set(id, anchor);
        anchors.push(anchor);
      }
    }

    // Constraint / Preference detection
    if (lower.includes('don\'t use') || lower.includes('avoid') || lower.includes('must not')) {
      const match = prompt.match(/(?:don't use|avoid|must not|never use)\s+([^,.;\n]+)/i);
      if (match && match[1]) {
        const id = `anchor_constraint_${Date.now()}`;
        const anchor: ConversationDetailAnchor = {
          id,
          key: 'user_constraint',
          value: `Avoid: ${match[1].trim()}`,
          category: 'CONSTRAINT',
          confidence: 90,
          extractedAt: new Date().toISOString(),
          turnIndex,
        };
        this.currentDetails.set(id, anchor);
        anchors.push(anchor);
      }
    }

    // Goal detection
    if (lower.includes('my goal is') || lower.includes('i want to build') || lower.includes('trying to implement')) {
      const match = prompt.match(/(?:my goal is|i want to build|trying to implement|working on)\s+([^,.;\n]+)/i);
      if (match && match[1]) {
        const id = `anchor_goal_${Date.now()}`;
        const anchor: ConversationDetailAnchor = {
          id,
          key: 'user_active_goal',
          value: match[1].trim(),
          category: 'GOAL',
          confidence: 92,
          extractedAt: new Date().toISOString(),
          turnIndex,
        };
        this.currentDetails.set(id, anchor);
        anchors.push(anchor);
      }
    }

    return anchors;
  }

  public getActiveAnchors(): ConversationDetailAnchor[] {
    return Array.from(this.currentDetails.values());
  }

  public clearSessionAnchors(): void {
    this.currentDetails.clear();
  }

  public setPersonalitySettings(settings: {
    witLevel?: number;
    sarcasmLevel?: number;
    helpfulnessLevel?: number;
    knowledgeDepth?: number;
  }): void {
    if (settings.witLevel !== undefined) this.witLevel = Math.max(0, Math.min(100, settings.witLevel));
    if (settings.sarcasmLevel !== undefined) this.sarcasmLevel = Math.max(0, Math.min(100, settings.sarcasmLevel));
    if (settings.helpfulnessLevel !== undefined) this.helpfulnessLevel = Math.max(0, Math.min(100, settings.helpfulnessLevel));
    if (settings.knowledgeDepth !== undefined) this.knowledgeDepth = Math.max(0, Math.min(100, settings.knowledgeDepth));
  }

  public getPersonalitySettings() {
    return {
      witLevel: this.witLevel,
      sarcasmLevel: this.sarcasmLevel,
      helpfulnessLevel: this.helpfulnessLevel,
      knowledgeDepth: this.knowledgeDepth,
    };
  }

  /**
   * Generates a comprehensive contextual awareness report showing how current session details
   * and past interaction memories synergize to dramatically improve user experience.
   */
  public generateContextualAwarenessReport(profileName: string, pastMemoriesCount: number): {
    userExperienceBenefit: string;
    concreteExample: string;
    activeSessionDetailsCount: number;
    recalledPastMemoriesCount: number;
    continuityStatus: string;
  } {
    const activeCount = this.currentDetails.size;
    return {
      userExperienceBenefit: 'Eliminates repetitive re-prompting, maintains multi-day technical continuity, and delivers razor-sharp responses specifically tailored to the user\'s stack, constraints, and past decisions.',
      concreteExample: `Without Contextual Awareness:\nUser: "How do I optimize the query?"\nGeneric AI: "What database are you using? What does your schema look like? Can you paste the SQL?"\n\nWith Laura's Contextual Awareness:\nUser: "How do I optimize the query?"\nLaura: "Looking at the 40M-row \`telemetry_events\` PostgreSQL table we partitioned yesterday in your Go microservice, the slow scan is due to the unindexed \`device_uuid\` in the WHERE clause. Adding a BRIN index on \`timestamp\` and a composite B-Tree on \`(org_id, device_uuid)\` will drop latency from 4200ms to 8ms without bloating your RAM."`,
      activeSessionDetailsCount: activeCount,
      recalledPastMemoriesCount: pastMemoriesCount,
      continuityStatus: activeCount > 0 || pastMemoriesCount > 0 ? 'HIGH_FIDELITY_CONTINUITY' : 'WARM_INITIALIZATION',
    };
  }
}

export const personalityCoreEngine = new PersonalityCoreEngine();
