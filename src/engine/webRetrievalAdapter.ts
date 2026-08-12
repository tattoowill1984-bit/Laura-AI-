import crypto from 'crypto';

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  fetchedAt: string;
}

export interface QuarantinedWebObservation {
  observationId: string;
  query: string;
  results: WebSearchResult[];
  sha256Hash: string;
  quarantineState: 'QUARANTINED_OBSERVATION';
  provenance: {
    sourceDomain: string;
    authorityRating: number;
    confidenceScore: number;
    uncertaintyScore: number;
    fetchedAt: string;
  };
  merkleNodeId?: string;
}

export class WebRetrievalAdapter {
  private static instance: WebRetrievalAdapter;

  private constructor() {}

  public static getInstance(): WebRetrievalAdapter {
    if (!WebRetrievalAdapter.instance) {
      WebRetrievalAdapter.instance = new WebRetrievalAdapter();
    }
    return WebRetrievalAdapter.instance;
  }

  /**
   * Executes genuine external HTTP web search across real web search & knowledge APIs
   */
  public async executeWebSearch(query: string): Promise<QuarantinedWebObservation> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new Error('Web retrieval error: Query cannot be empty.');
    }

    const fetchedAt = new Date().toISOString();
    const results: WebSearchResult[] = [];

    const lowerQuery = trimmedQuery.toLowerCase();
    const isNewsQuery = lowerQuery.includes('news') || lowerQuery.includes('headline') || lowerQuery.includes('today') || lowerQuery.includes('this morning') || lowerQuery.includes('breaking') || lowerQuery.includes('tulsa');

    // Source 1: Google News Live RSS Feed (High-freshness external news endpoint)
    if (isNewsQuery) {
      try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(trimmedQuery)}&hl=en-US&gl=US&ceid=US:en`;
        const rssRes = await fetch(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LauraAI-WebRetrievalAdapter/2.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (rssRes.ok) {
          const xmlText = await rssRes.text();
          const items = Array.from(
            xmlText.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>/g)
          );

          for (const item of items.slice(0, 6)) {
            const rawTitle = item[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() || '';
            const link = item[2]?.trim() || '';
            const pubDate = item[3]?.trim() || fetchedAt;

            // Extract source name if title is "Headline - Source Name"
            let sourceName = 'Google News Live RSS';
            let title = rawTitle;
            if (rawTitle.includes(' - ')) {
              const parts = rawTitle.split(' - ');
              sourceName = parts.pop() || sourceName;
              title = parts.join(' - ');
            }

            if (title) {
              results.push({
                title,
                snippet: `Published ${pubDate}. Live news coverage for query '${trimmedQuery}'.`,
                url: link || `https://news.google.com`,
                source: sourceName,
                fetchedAt,
              });
            }
          }
        }
      } catch (err) {
        console.log('[WebRetrievalAdapter] Google News RSS fetch attempt note:', (err as Error).message);
      }
    }

    // Source 2: Wikipedia Search API (Real, high-reliability external knowledge endpoint)
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(trimmedQuery)}&format=json&origin=*`;
      const wikiRes = await fetch(wikiUrl, {
        headers: { 'User-Agent': 'LauraAI-WebRetrievalAdapter/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        const searchHits = wikiData?.query?.search || [];
        for (const hit of searchHits.slice(0, 4)) {
          const cleanSnippet = (hit.snippet || '')
            .replace(/<[^>]+>/g, '')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');
          results.push({
            title: hit.title,
            snippet: cleanSnippet,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`,
            source: 'Wikipedia Live Search API',
            fetchedAt,
          });
        }
      }
    } catch (err) {
      console.log('[WebRetrievalAdapter] Wikipedia API fetch attempt note:', (err as Error).message);
    }

    // Source 2: DuckDuckGo Instant Answer / HTML Search API
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmedQuery)}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl, {
        headers: { 'User-Agent': 'LauraAI-WebRetrievalAdapter/2.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (ddgRes.ok) {
        const ddgData = await ddgRes.json();
        if (ddgData.AbstractText) {
          results.push({
            title: ddgData.Heading || trimmedQuery,
            snippet: ddgData.AbstractText,
            url: ddgData.AbstractURL || 'https://duckduckgo.com',
            source: 'DuckDuckGo Abstract API',
            fetchedAt,
          });
        }

        if (Array.isArray(ddgData.RelatedTopics)) {
          for (const topic of ddgData.RelatedTopics.slice(0, 3)) {
            if (topic.Text && topic.FirstURL) {
              results.push({
                title: topic.Text.slice(0, 60) + '...',
                snippet: topic.Text,
                url: topic.FirstURL,
                source: 'DuckDuckGo Related Topics',
                fetchedAt,
              });
            }
          }
        }
      }
    } catch (err) {
      console.log('[WebRetrievalAdapter] DuckDuckGo API fetch attempt note:', (err as Error).message);
    }

    // Fallback/Augmentation: If zero external API results obtained (network restriction), fetch Google Search HTML / Open API fallback
    if (results.length === 0) {
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmedQuery)}`;
        const htmlRes = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (htmlRes.ok) {
          const htmlText = await htmlRes.text();
          // Extract title/snippet/URL matches from DDG HTML
          const snippetMatches = Array.from(htmlText.matchAll(/<a class="result__snippet[^>]*>([^<]+)<\/a>/g));
          const urlMatches = Array.from(htmlText.matchAll(/<a class="result__url"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g));
          
          for (let i = 0; i < Math.min(snippetMatches.length, 3); i++) {
            const snippet = snippetMatches[i]?.[1]?.trim() || '';
            const rawUrl = urlMatches[i]?.[1]?.trim() || '';
            const displayUrl = urlMatches[i]?.[2]?.trim() || rawUrl;

            if (snippet) {
              results.push({
                title: displayUrl || `Search Result ${i + 1}`,
                snippet: snippet,
                url: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
                source: 'DuckDuckGo Web Scraper Engine',
                fetchedAt,
              });
            }
          }
        }
      } catch (err) {
        console.log('[WebRetrievalAdapter] Web HTML Scraper fallback note:', (err as Error).message);
      }
    }

    // Hash the external results payload using SHA-256 for cryptographic evidence lineage
    const rawPayload = JSON.stringify({ query: trimmedQuery, results, fetchedAt });
    const sha256Hash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    const observationId = `obs_web_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const observation: QuarantinedWebObservation = {
      observationId,
      query: trimmedQuery,
      results,
      sha256Hash,
      quarantineState: 'QUARANTINED_OBSERVATION',
      provenance: {
        sourceDomain: results[0]?.url ? new URL(results[0].url).hostname : 'external_web',
        authorityRating: results.length > 0 ? 0.85 : 0.40,
        confidenceScore: results.length > 0 ? 0.90 : 0.30,
        uncertaintyScore: results.length > 0 ? 0.10 : 0.70,
        fetchedAt,
      },
    };

    return observation;
  }

  /**
   * Fetches raw web content directly from a specific external URL safely
   */
  public async fetchUrlContent(targetUrl: string): Promise<{ title: string; text: string; url: string; sha256Hash: string; fetchedAt: string }> {
    const fetchedAt = new Date().toISOString();
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LauraAI-WebRetrievalAdapter/2.0',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      let textContent = '';
      let title = targetUrl;

      if (contentType.includes('application/json')) {
        const json = await res.json();
        textContent = JSON.stringify(json, null, 2).slice(0, 8000);
        title = `JSON Endpoint: ${targetUrl}`;
      } else {
        const html = await res.text();
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].trim();

        // Strip scripts, styles, HTML tags
        textContent = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000);
      }

      const sha256Hash = crypto.createHash('sha256').update(textContent).digest('hex');

      return {
        title,
        text: textContent,
        url: targetUrl,
        sha256Hash,
        fetchedAt,
      };
    } catch (err) {
      throw new Error(`Failed to retrieve content from URL (${targetUrl}): ${(err as Error).message}`);
    }
  }
}

export const webRetrievalAdapter = WebRetrievalAdapter.getInstance();
