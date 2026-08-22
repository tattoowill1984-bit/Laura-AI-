/**
 * Layer 5 & Assistant Intelligence: Reminder & Command Engine (`reminderEngine.ts`)
 * Natural language command parsing, relative/absolute temporal extraction,
 * reminder scheduler, and conversational assistant task coordinator.
 */

import { ReminderItem, NaturalCommandParseResult } from '../types';
import { persistentStorage } from './persistentStorage';

export class ReminderEngine {
  private static instance: ReminderEngine;

  public static getInstance(): ReminderEngine {
    if (!ReminderEngine.instance) {
      ReminderEngine.instance = new ReminderEngine();
    }
    return ReminderEngine.instance;
  }

  /**
   * Parse natural language command into structured intent
   */
  public parseNaturalCommand(text: string, defaultProfileId: string = 'will-owner'): NaturalCommandParseResult {
    const raw = text.trim();
    const lower = raw.toLowerCase();

    // 1. Check for Reminder Commands
    if (
      lower.startsWith('remind me') ||
      lower.startsWith('set a reminder') ||
      lower.startsWith('set reminder') ||
      lower.startsWith('add reminder') ||
      lower.startsWith('create a reminder') ||
      lower.startsWith('set a timer for') ||
      lower.startsWith('timer for') ||
      lower.includes('remind me to') ||
      lower.includes('remind me about')
    ) {
      const extracted = this.extractReminderDetails(raw);
      return {
        isCommand: true,
        commandType: 'SET_REMINDER',
        confidence: 95,
        extractedParams: extracted,
        suggestedResponse: `I've set a reminder for you: **"${extracted.title}"** for ${extracted.formattedDue}.`,
      };
    }

    // 2. Check for "Show/List Reminders"
    if (
      lower.includes('show my reminders') ||
      lower.includes('list my reminders') ||
      lower.includes('what are my reminders') ||
      lower.includes('show reminders') ||
      lower.includes('get reminders') ||
      lower.includes('do i have any reminders') ||
      lower.includes('check reminders')
    ) {
      return {
        isCommand: true,
        commandType: 'GET_REMINDERS',
        confidence: 90,
        extractedParams: {},
        suggestedResponse: `Here are your current active reminders.`,
      };
    }

    // 3. Check for Math / Calculation commands
    if (
      lower.startsWith('calculate') ||
      lower.startsWith('compute') ||
      lower.startsWith('what is ') && lower.match(/[0-9\+\-\*\/\^\(\)]+/)
    ) {
      const mathExpr = raw.replace(/^(calculate|compute|what is)\s+/i, '').replace(/[?]$/, '').trim();
      const calcResult = this.safeCalculate(mathExpr);
      if (calcResult !== null) {
        return {
          isCommand: true,
          commandType: 'CALCULATE',
          confidence: 90,
          extractedParams: {
            expression: mathExpr,
            calculationResult: String(calcResult),
          },
          suggestedResponse: `The calculation result for \`${mathExpr}\` is **${calcResult}**.`,
        };
      }
    }

    // 4. Default: General Conversational / Q&A
    return {
      isCommand: false,
      commandType: 'ANSWER_QUESTION',
      confidence: 85,
      extractedParams: {
        query: raw,
      },
    };
  }

  /**
   * Helper to parse natural date/time phrases
   */
  public extractReminderDetails(rawText: string): {
    title: string;
    dueTimestamp: string;
    formattedDue: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'TASK' | 'MEETING' | 'HEALTH' | 'PERSONAL' | 'GENERAL' | 'LEARNING';
  } {
    let cleanText = rawText
      .replace(/^(please\s+)?(can you\s+)?(remind me to|remind me about|set a reminder to|set a reminder for|set reminder to|set reminder for|add reminder to|add reminder for|create a reminder to|create a reminder for)\s+/i, '')
      .trim();

    // Priority extraction
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    if (/urgent|critical|asap|high priority/i.test(rawText)) {
      priority = 'HIGH';
    } else if (/low priority|whenever/i.test(rawText)) {
      priority = 'LOW';
    }

    // Category extraction
    let category: 'TASK' | 'MEETING' | 'HEALTH' | 'PERSONAL' | 'GENERAL' | 'LEARNING' = 'TASK';
    if (/meeting|call|sync|standup|interview/i.test(rawText)) {
      category = 'MEETING';
    } else if (/doctor|medication|pill|water|workout|gym|health|walk/i.test(rawText)) {
      category = 'HEALTH';
    } else if (/study|read|research|learn|paper|course/i.test(rawText)) {
      category = 'LEARNING';
    } else if (/birthday|call mom|call dad|family|groceries|buy/i.test(rawText)) {
      category = 'PERSONAL';
    }

    const now = new Date();
    let targetDate = new Date(now.getTime() + 1000 * 60 * 30); // default in 30 mins
    let formattedDue = 'in 30 minutes';

    // Pattern 1: "in X minutes / hours / days / seconds"
    const inMatch = cleanText.match(/\bin\s+(\d+)\s+(second|sec|minute|min|hour|hr|day|week)s?\b/i);
    if (inMatch) {
      const amount = parseInt(inMatch[1], 10);
      const unit = inMatch[2].toLowerCase();
      let msToAdd = 0;
      if (unit.startsWith('sec')) msToAdd = amount * 1000;
      else if (unit.startsWith('min')) msToAdd = amount * 60 * 1000;
      else if (unit.startsWith('hour') || unit.startsWith('hr')) msToAdd = amount * 60 * 60 * 1000;
      else if (unit.startsWith('day')) msToAdd = amount * 24 * 60 * 60 * 1000;
      else if (unit.startsWith('week')) msToAdd = amount * 7 * 24 * 60 * 60 * 1000;

      targetDate = new Date(now.getTime() + msToAdd);
      formattedDue = `in ${amount} ${inMatch[2]}${amount > 1 ? 's' : ''}`;
      cleanText = cleanText.replace(inMatch[0], '').trim();
    }

    // Pattern 2: "tomorrow at X:XX AM/PM" or "tomorrow morning/afternoon/evening"
    else if (/\btomorrow\b/i.test(cleanText)) {
      targetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const timeMatch = cleanText.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch && (timeMatch[3] || cleanText.includes('at '))) {
        let hours = parseInt(timeMatch[1], 10);
        const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3]?.toLowerCase();
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        targetDate.setHours(hours, mins, 0, 0);
        formattedDue = `Tomorrow at ${hours % 12 || 12}:${mins.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
        cleanText = cleanText.replace(/tomorrow\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/i, '').trim();
      } else if (/morning/i.test(cleanText)) {
        targetDate.setHours(9, 0, 0, 0);
        formattedDue = 'Tomorrow morning at 9:00 AM';
        cleanText = cleanText.replace(/tomorrow\s+morning/i, '').trim();
      } else if (/afternoon/i.test(cleanText)) {
        targetDate.setHours(14, 0, 0, 0);
        formattedDue = 'Tomorrow afternoon at 2:00 PM';
        cleanText = cleanText.replace(/tomorrow\s+afternoon/i, '').trim();
      } else if (/evening|tonight/i.test(cleanText)) {
        targetDate.setHours(19, 0, 0, 0);
        formattedDue = 'Tomorrow evening at 7:00 PM';
        cleanText = cleanText.replace(/tomorrow\s+evening/i, '').trim();
      } else {
        targetDate.setHours(9, 0, 0, 0);
        formattedDue = 'Tomorrow at 9:00 AM';
        cleanText = cleanText.replace(/\btomorrow\b/i, '').trim();
      }
    }

    // Pattern 3: "at X:XX AM/PM" or "at X PM"
    else {
      const atTimeMatch = cleanText.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
      if (atTimeMatch) {
        let hours = parseInt(atTimeMatch[1], 10);
        const mins = atTimeMatch[2] ? parseInt(atTimeMatch[2], 10) : 0;
        const ampm = atTimeMatch[3]?.toLowerCase();
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        targetDate = new Date(now);
        targetDate.setHours(hours, mins, 0, 0);
        if (targetDate.getTime() <= now.getTime()) {
          // If time already passed today, assume tomorrow
          targetDate.setDate(targetDate.getDate() + 1);
          formattedDue = `Tomorrow at ${hours % 12 || 12}:${mins.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
        } else {
          formattedDue = `Today at ${hours % 12 || 12}:${mins.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
        }
        cleanText = cleanText.replace(atTimeMatch[0], '').trim();
      }
    }

    // Cleanup lingering prefix/suffix prepositions
    let title = cleanText
      .replace(/^(to|that|about)\s+/i, '')
      .replace(/[,\.?!]+$/, '')
      .trim();

    if (!title || title.length < 2) {
      title = 'General Assistant Reminder';
    }

    // Capitalize first letter of title
    title = title.charAt(0).toUpperCase() + title.slice(1);

    return {
      title,
      dueTimestamp: targetDate.toISOString(),
      formattedDue,
      priority,
      category,
    };
  }

  /**
   * Safe mathematical expression evaluator
   */
  public safeCalculate(expr: string): number | null {
    try {
      const sanitized = expr.replace(/[^0-9\+\-\*\/\^\(\)\.\s]/g, '');
      if (!sanitized.trim()) return null;
      // Transform power syntax ^ to **
      const powerConverted = sanitized.replace(/\^/g, '**');
      // Evaluate using Function constructor in isolation
      const fn = new Function(`return (${powerConverted});`);
      const val = fn();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return Math.round(val * 1000000) / 1000000;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create a reminder programmatically from user request or Gemini tool call
   */
  public createReminder(params: {
    profileId?: string;
    title: string;
    notes?: string;
    dueTimestamp?: string;
    formattedDue?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category?: 'TASK' | 'MEETING' | 'HEALTH' | 'PERSONAL' | 'GENERAL' | 'LEARNING';
    source?: 'NATURAL_LANGUAGE_CHAT' | 'MANUAL_ENTRY' | 'AUTONOMOUS_PROACTIVE';
  }): ReminderItem {
    const profileId = params.profileId || 'will-owner';
    const dueTimestamp = params.dueTimestamp || new Date(Date.now() + 1000 * 60 * 30).toISOString();
    const formattedDue = params.formattedDue || new Date(dueTimestamp).toLocaleString();

    return persistentStorage.createReminder({
      profileId,
      title: params.title,
      notes: params.notes || '',
      dueTimestamp,
      formattedDue,
      priority: params.priority || 'MEDIUM',
      category: params.category || 'TASK',
      completed: false,
      source: params.source || 'NATURAL_LANGUAGE_CHAT',
    });
  }
}

export const reminderEngine = ReminderEngine.getInstance();
