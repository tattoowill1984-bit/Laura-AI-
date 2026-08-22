/**
 * Layer 5: Tool Registry (`registry.ts`)
 * Registry for web search and local system actions
 */

import { externalRetrievalGateway } from '../engine/externalRetrievalGateway';
import { requiresConfirmation } from './confirmation';
import { extractionEngine } from './extractionEngine';
import { persistentStorage } from '../engine/persistentStorage';
import { reminderEngine } from '../engine/reminderEngine';

export interface ToolDefinition {
  name: string;
  description: string;
  category: 'SEARCH' | 'MEMORY' | 'SYSTEM' | 'MUTATION' | 'EXTRACTION' | 'ASSISTANT';
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

    // 3. Set Reminder Tool
    this.registerTool({
      name: 'set_reminder',
      description: 'Schedules a reminder or task for the user with title, due timestamp, priority, and category.',
      category: 'ASSISTANT',
      execute: async (args: {
        title: string;
        dueTimestamp?: string;
        formattedDue?: string;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        category?: 'TASK' | 'MEETING' | 'HEALTH' | 'PERSONAL' | 'GENERAL' | 'LEARNING';
        notes?: string;
        profileId?: string;
      }) => {
        const reminder = reminderEngine.createReminder(args);
        return {
          success: true,
          reminder,
          message: `Reminder successfully created: "${reminder.title}" due ${reminder.formattedDue}.`,
        };
      },
    });

    // 4. Get Reminders Tool
    this.registerTool({
      name: 'get_reminders',
      description: 'Retrieves all active or upcoming reminders and tasks for the user.',
      category: 'ASSISTANT',
      execute: async (args: { profileId?: string }) => {
        const reminders = persistentStorage.getReminders(args.profileId || 'will-owner');
        return {
          success: true,
          count: reminders.length,
          reminders,
        };
      },
    });

    // 5. Complete Reminder Tool
    this.registerTool({
      name: 'complete_reminder',
      description: 'Marks a specified reminder or task as completed.',
      category: 'ASSISTANT',
      execute: async (args: { id: string }) => {
        const updated = persistentStorage.updateReminder(args.id, {
          completed: true,
          completedAt: new Date().toISOString(),
        });
        return {
          success: !!updated,
          reminder: updated,
          message: updated ? `Marked "${updated.title}" as completed.` : 'Reminder not found.',
        };
      },
    });

    // 6. Calculate Expression Tool
    this.registerTool({
      name: 'calculate_expression',
      description: 'Evaluates mathematical, statistical, or arithmetic expressions safely.',
      category: 'ASSISTANT',
      execute: async (args: { expression: string }) => {
        const result = reminderEngine.safeCalculate(args.expression);
        return {
          success: result !== null,
          expression: args.expression,
          result,
        };
      },
    });

    // 7. Raw PDB Molecular Extraction Tool (Offline Data Ingestion)
    this.registerTool({
      name: 'extract_pdb_coordinates',
      description: 'Parses raw PDB molecular structure files into coordinate matrices & runs manifold stability check.',
      category: 'EXTRACTION',
      execute: async (args: { pdbText: string }) => {
        return extractionEngine.extractPdbCoordinates(args.pdbText || '');
      },
    });

    // 8. Raw CSV Matrix Extraction Tool (Offline Data Ingestion)
    this.registerTool({
      name: 'extract_csv_matrix',
      description: 'Parses raw CSV numerical datasets into structured matrices & calculates dimensional consistency.',
      category: 'EXTRACTION',
      execute: async (args: { csvText: string }) => {
        return extractionEngine.extractCsvMatrix(args.csvText || '');
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
