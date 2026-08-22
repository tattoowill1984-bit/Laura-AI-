import { personalityCoreEngine, ConversationDetailAnchor } from '../engine/personalityCore';

/**
 * Layer 2: Epistemic Vaults - Short-term Context Window
 * Manages recent turn history in memory (last N turns verbatim) and tracks
 * key conversation anchors for high-fidelity contextual awareness.
 */

export interface ChatMessageTurn {
  id: string;
  sender: 'USER' | 'SENTINEL' | 'SYSTEM';
  text: string;
  timestamp: string;
  role?: 'user' | 'model' | 'system';
}

export class ContextWindow {
  private history: ChatMessageTurn[] = [];
  private maxTurns: number;

  constructor(maxTurns = 25) {
    this.maxTurns = maxTurns;
  }

  public addTurn(sender: 'USER' | 'SENTINEL' | 'SYSTEM', text: string, id?: string): ChatMessageTurn {
    const turn: ChatMessageTurn = {
      id: id || `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
      role: sender === 'SENTINEL' ? 'model' : 'user',
    };
    this.history.push(turn);
    if (this.history.length > this.maxTurns) {
      this.history.shift();
    }

    // Extract contextual anchors if user message
    if (sender === 'USER') {
      personalityCoreEngine.extractAndRecordContextAnchors(text, this.history.length);
    }

    return turn;
  }

  public getHistory(): ChatMessageTurn[] {
    return [...this.history];
  }

  public setHistory(turns: ChatMessageTurn[]): void {
    this.history = turns.slice(-this.maxTurns);
  }

  public getTrackedAnchors(): ConversationDetailAnchor[] {
    return personalityCoreEngine.getActiveAnchors();
  }

  public clear(): void {
    this.history = [];
    personalityCoreEngine.clearSessionAnchors();
  }
}

export const activeContextWindow = new ContextWindow();

