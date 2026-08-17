/**
 * Layer 3: Attention Metabolism (`heartbeat.ts`)
 * Background timer loop maintaining health, energy recovery, and background pulse
 */

import { selfStateManager } from './selfState';

export class HeartbeatLoop {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private tickCount = 0;

  constructor(intervalMs = 10000) {
    this.intervalMs = intervalMs;
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.pulse(), this.intervalMs);
    console.log(`[HeartbeatLoop] Background attention metabolism started (${this.intervalMs}ms interval)`);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[HeartbeatLoop] Heartbeat stopped');
    }
  }

  private pulse(): void {
    this.tickCount++;
    const state = selfStateManager.getState();
    
    // Slow energy recovery toward baseline (95)
    if (state.energy < 95) {
      selfStateManager.adjustEnergy(1);
    }

    if (this.tickCount % 6 === 0) { // Every 1 minute
      // Refresh timestamp and check background status
      selfStateManager.saveState();
    }
  }

  public getPulseMetrics() {
    return {
      tickCount: this.tickCount,
      intervalMs: this.intervalMs,
      selfState: selfStateManager.getState(),
      status: this.timer ? 'RUNNING' : 'STOPPED',
    };
  }
}

export const heartbeatLoop = new HeartbeatLoop();
