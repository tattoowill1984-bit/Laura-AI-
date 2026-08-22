import { webRetrievalAdapter } from '../webRetrievalAdapter';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  fetchedAt?: string;
}

/**
 * 1. Live Web Search Tool Handler
 * Executes search across external search engines (Tavily/Serper if SEARCH_API_KEY is set,
 * or native multi-source web retrieval adapter covering Google News RSS, Weather wttr.in, Wikipedia, and DuckDuckGo).
 */
export async function executeWebSearch(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('Query string cannot be empty.');
  }

  // Optional external Tavily/Serper API key check
  const apiKey = process.env.SEARCH_API_KEY || process.env.TAVILY_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query: trimmed,
          search_depth: 'basic',
          include_answer: false,
          max_results: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          return data.results.map((r: any) => ({
            title: r.title || 'Search Result',
            url: r.url || '',
            snippet: r.content || r.snippet || '',
            source: 'Tavily Live Search API',
            fetchedAt: new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      console.warn('[webTools] SEARCH_API_KEY call attempt note:', (e as Error).message);
    }
  }

  // Multi-source engine adapter (Weather wttr.in, Google News RSS, Wikipedia API, DuckDuckGo)
  const obs = await webRetrievalAdapter.executeWebSearch(trimmed);
  return obs.results.map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    source: r.source,
    fetchedAt: r.fetchedAt,
  }));
}

/**
 * 2. Direct Web Page Fetcher Tool Handler
 * Fetches and extracts clean text directly from any target URL, stripping HTML tags & scripts,
 * truncating safely to prompt bounds, and returning SHA-256 cryptographic proof hash.
 */
export async function fetchWebPage(url: string): Promise<{ url: string; title: string; content: string; sha256Hash: string }> {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const fetched = await webRetrievalAdapter.fetchUrlContent(targetUrl);
  return {
    url: fetched.url,
    title: fetched.title,
    content: fetched.text,
    sha256Hash: fetched.sha256Hash,
  };
}

/**
 * Declarations for provider function calling schemas
 */
export const webToolDeclarations = [
  {
    name: 'webSearch',
    description: 'Searches the live web for current real-time information, headlines, weather, and facts.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The search query string.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetchWebPage',
    description: 'Fetches and extracts plain text content directly from a specific web URL.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'The full URL to fetch.' },
      },
      required: ['url'],
    },
  },
  {
    name: 'setReminder',
    description: 'Sets a reminder or scheduled task for the user with title, due timestamp, priority, and category.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'The reminder title or task description.' },
        dueTimestamp: { type: 'STRING', description: 'ISO-8601 target time or relative offset e.g. "in 30 minutes".' },
        formattedDue: { type: 'STRING', description: 'Human readable due date and time e.g. "Tomorrow at 3:00 PM".' },
        priority: { type: 'STRING', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Priority level of the reminder.' },
        category: { type: 'STRING', enum: ['TASK', 'MEETING', 'HEALTH', 'PERSONAL', 'GENERAL', 'LEARNING'], description: 'Category of the reminder.' },
        notes: { type: 'STRING', description: 'Optional extra notes or details.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'getReminders',
    description: 'Retrieves all active reminders and scheduled tasks.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'calculateExpression',
    description: 'Calculates a mathematical or arithmetic expression safely.',
    parameters: {
      type: 'OBJECT',
      properties: {
        expression: { type: 'STRING', description: 'Mathematical expression e.g. "25 * (100 + 45)"' },
      },
      required: ['expression'],
    },
  },
];
