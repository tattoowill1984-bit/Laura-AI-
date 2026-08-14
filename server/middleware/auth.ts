import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Read API keys from environment variable ADMIN_API_KEYS or API_KEYS (comma separated)
function getApiKeys(): string[] {
  const env = process.env.ADMIN_API_KEYS || process.env.API_KEYS || '';
  return env.split(',').map(s => s.trim()).filter(Boolean);
}

// Helper to generate a new API key (used in PR instructions, not committed anywhere)
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Simple auth middleware that accepts x-api-key or Authorization: Bearer <key>
export function authMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const headerKey = req.header('x-api-key');
      const bearer = req.header('authorization') || '';
      const bearerKey = bearer.startsWith('Bearer ') ? bearer.slice(7).trim() : '';
      const provided = (headerKey || bearerKey || '').trim();

      const validKeys = getApiKeys();
      if (!provided || !validKeys.includes(provided)) {
        return res.status(401).json({ error: 'Unauthorized: valid API key required' });
      }

      // Attach some minimal identity to the request for downstream use
      (req as any).auth = { apiKey: provided };
      next();
    } catch (err) {
      console.error('[Auth Middleware] Error validating API key', err);
      return res.status(500).json({ error: 'Internal auth error' });
    }
  };
}
