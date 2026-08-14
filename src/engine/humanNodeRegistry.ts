// ---------------------------------------------------------------------------
// HUMAN NODE & RUNTIME SUBJECT BOUNDARY REGISTRY
// ---------------------------------------------------------------------------

export interface HumanNode {
  id: string; // Unique entity identifier, e.g. 'will-owner', 'sabrina-user', 'einstein-node'
  displayName: string; // Human name, e.g. 'Will', 'Sabrina', 'Einstein'
  role: 'OWNER' | 'MEMBER' | 'GUEST' | 'HISTORICAL_ENTITY';
  email?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface RuntimeSubjectContext {
  currentSubjectId: string | null; // Resolved active runtime user/subject ID
  sourceActorId: string | null;    // Identity of the current speaker/actor
  sessionToken?: string;
  authenticatedTime?: string;
  confidence: number;              // Confidence in identity resolution (0-100)
}

/**
  Registry managing world-model HumanNodes independently from active RuntimeSubject bindings.
 */
export class HumanNodeRegistry {
  private static instance: HumanNodeRegistry;
  private humanNodes: Map<string, HumanNode> = new Map();
  private currentSubjectContext: RuntimeSubjectContext = {
    currentSubjectId: null,
    sourceActorId: null,
    confidence: 0,
  };

  constructor() {
    this.seedDefaultHumanNodes();
  }

  public static getInstance(): HumanNodeRegistry {
    if (!HumanNodeRegistry.instance) {
      HumanNodeRegistry.instance = new HumanNodeRegistry();
    }
    return HumanNodeRegistry.instance;
  }

  private seedDefaultHumanNodes(): void {
    const now = new Date().toISOString();
    
    // Seed named HumanNodes into the world model
    const defaultNodes: HumanNode[] = [
      {
        id: 'will-owner',
        displayName: 'Will',
        role: 'OWNER',
        email: 'will@laura.ai',
        createdAt: now,
      },
      {
        id: 'sabrina-user',
        displayName: 'Sabrina',
        role: 'MEMBER',
        email: 'sabrina@laura.ai',
        createdAt: now,
      },
      {
        id: 'einstein-node',
        displayName: 'Einstein',
        role: 'HISTORICAL_ENTITY',
        createdAt: now,
      },
    ];

    for (const node of defaultNodes) {
      this.humanNodes.set(node.id, node);
    }
  }

  // --- HumanNode Management ---

  public getHumanNode(id: string): HumanNode | undefined {
    return this.humanNodes.get(id);
  }

  public findHumanNodeByName(name: string): HumanNode | undefined {
    const lowerName = name.trim().toLowerCase();
    for (const node of this.humanNodes.values()) {
      if (
        node.displayName.toLowerCase() === lowerName ||
        node.id.toLowerCase() === lowerName ||
        node.id.toLowerCase().startsWith(lowerName)
      ) {
        return node;
      }
    }
    return undefined;
  }

  public getAllHumanNodes(): HumanNode[] {
    return Array.from(this.humanNodes.values());
  }

  public registerHumanNode(node: HumanNode): HumanNode {
    this.humanNodes.set(node.id, node);
    return node;
  }

  // --- RuntimeSubject Binding Management ---

  public getCurrentSubjectContext(): RuntimeSubjectContext {
    return { ...this.currentSubjectContext };
  }

  public setCurrentSubject(subjectId: string | null, confidence = 100, sessionToken?: string): void {
    if (subjectId === null) {
      this.currentSubjectContext = {
        currentSubjectId: null,
        sourceActorId: null,
        confidence: 0,
      };
      return;
    }

    const exists = this.humanNodes.has(subjectId);
    if (!exists) {
      // Register new HumanNode dynamically if needed
      this.registerHumanNode({
        id: subjectId,
        displayName: subjectId,
        role: 'MEMBER',
        createdAt: new Date().toISOString(),
      });
    }

    this.currentSubjectContext = {
      currentSubjectId: subjectId,
      sourceActorId: subjectId,
      sessionToken,
      authenticatedTime: new Date().toISOString(),
      confidence,
    };
  }

  public clearCurrentSubject(): void {
    this.currentSubjectContext = {
      currentSubjectId: null,
      sourceActorId: null,
      confidence: 0,
    };
  }

  /**
   * Resolves target memory subject ID given source actor, explicit statement, and runtime context.
   * Does NOT default to 'will-owner' if current subject is unknown!
   */
  public resolveSubjectForProposal(proposal: {
    sourceActorId?: string;
    subjectId?: string;
    profileId?: string;
    rawStatement?: string;
  }): {
    sourceActorId: string | null;
    targetSubjectId: string | null;
    isUncertain: boolean;
  } {
    const currentContext = this.getCurrentSubjectContext();

    // 1. Source Actor Resolution
    const sourceActorId = proposal.sourceActorId || currentContext.sourceActorId || null;

    // 2. Target Subject Resolution
    // Check if proposal explicitly specifies subjectId or profileId
    let targetSubjectId = proposal.subjectId || proposal.profileId || null;

    // 3. Extract target subject from explicit statement if present (e.g. "Sabrina's favorite color is green")
    if (proposal.rawStatement) {
      const stmtLower = proposal.rawStatement.toLowerCase();
      for (const node of this.humanNodes.values()) {
        const nameLower = node.displayName.toLowerCase();
        // Look for possessives like "sabrina's", "about sabrina", "sabrina prefers"
        if (
          stmtLower.includes(`${nameLower}'s`) ||
          stmtLower.includes(`about ${nameLower}`) ||
          stmtLower.includes(`${nameLower} prefers`) ||
          stmtLower.includes(`${nameLower} likes`) ||
          stmtLower.includes(`${nameLower} is`)
        ) {
          targetSubjectId = node.id;
          break;
        }
      }
    }

    // 4. Fallback to currentSubjectId if targetSubjectId not explicitly specified or extracted
    if (!targetSubjectId) {
      targetSubjectId = currentContext.currentSubjectId;
    }

    // 5. Check for uncertainty
    const isUncertain = !targetSubjectId || (currentContext.currentSubjectId === null && !proposal.subjectId && !proposal.profileId);

    return {
      sourceActorId,
      targetSubjectId: isUncertain ? null : targetSubjectId,
      isUncertain,
    };
  }
}

export const humanNodeRegistry = HumanNodeRegistry.getInstance();
