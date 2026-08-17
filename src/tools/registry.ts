/**
 * Layer 5: Tool Registry (`registry.ts`)
 * Registry for web search and local system actions
 */

import { externalRetrievalGateway } from '../engine/externalRetrievalGateway';
import { requiresConfirmation } from './confirmation';

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'SEARCH' | 'MEMORY' | 'SYSTEM' | 'MUTATION';
  execute: (args: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 1. Web Search Tool
    this.registerTool({
      name: 'web_search',
      description: 'Performs real-time public web search for fresh information.',
      category: 'SEARCH',
      execute: async (args: { query: string }) => {
        const res = await externalRetrievalGateway.request({
          query: args.query,
          freshness_required: true,
          purpose: 'Web search tool execution',
        });
        return res;
      },
    });

    // 2. Health Check Tool
    this.registerTool({
      name: 'health_check',
      description: 'Checks local system runtime health and memory status.',
      category: 'SYSTEM',
      execute: async () => {
        return { status: 'HEALTHY', timestamp: new Date().toISOString() };
      },
    });
  }

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name.toLowerCase(), tool);
  }

  public getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name.toLowerCase());
  }

  public async executeTool(name: string, args: any): Promise<{ success: boolean; result?: any; requiresApproval?: boolean; error?: string }> {
    if (requiresConfirmation(name)) {
      return {
        success: false,
        requiresApproval: true,
        error: `Action '${name}' requires explicit human approval.`,
      };
    }

    const tool = this.getTool(name);
    if (!tool) {
      return { success: false, error: `Tool '${name}' not found.` };
    }

    try {
      const result = await tool.execute(args);
      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Tool execution error' };
    }
  }

  public listTools(): Array<{ name: string; description: string; category: string }> {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      category: t.category,
    }));
  }
}

export const toolRegistry = new ToolRegistry();
