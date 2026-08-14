import { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const DEFAULT_JSON_LIMIT = process.env.JSON_LIMIT || '2mb';
const DEFAULT_URLENCODED_LIMIT = process.env.URLENCODED_LIMIT || '2mb';
const DEFAULT_MAX_ATTACHMENT_BYTES = parseInt(process.env.MAX_ATTACHMENT_BYTES || String(2 * 1024 * 1024), 10); // 2MB

function parseAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS || '';
  return env.split(',').map(s => s.trim()).filter(Boolean);
}

export function setupHardening(app: Express) {
  // CORS whitelist
  const allowed = parseAllowedOrigins();
  const corsOptions: cors.CorsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowed.length === 0) return callback(new Error('CORS origin not allowed by configuration'));
      if (allowed.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));

  // Body size limits
  app.use((req: Request, _res: Response, next: NextFunction) => {
    // Replace express.json/urlencoded defaults by creating parsers here
    // We can't re-register built-in parsers easily from here if already registered, but the server will call setupHardening before routes.
    next();
  });

  // Rate limiters
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '60', 10),
    standardHeaders: true,
    legacyHeaders: false,
  });

  const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX || '10', 10),
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general limiter to all API routes
  app.use('/api/', generalLimiter);

  // Apply admin limiter to sensitive prefixes
  app.use('/api/gabby', adminLimiter);
  app.use('/api/migration', adminLimiter);
  app.use('/api/governed-execution', adminLimiter);
  app.use('/api/red-team', adminLimiter);
  app.use('/api/soak-test', adminLimiter);
  app.use('/api/health-loop', adminLimiter);
  app.use('/api/reality', adminLimiter);

  // Attachment size guard middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    try {
      const body: any = req.body || {};
      const attachments = body.attachments;
      if (Array.isArray(attachments)) {
        for (const att of attachments) {
          const dataUrl = att.dataUrl || att.cameraFrameBase64 || att.data || '';
          if (typeof dataUrl === 'string' && dataUrl.length > 0) {
            const base64Clean = dataUrl.replace(/^data:[^;]+;base64,/, '');
            // Approximate byte size: (base64_length * 3) / 4
            const approxBytes = Math.ceil((base64Clean.length * 3) / 4);
            if (approxBytes > DEFAULT_MAX_ATTACHMENT_BYTES) {
              return res.status(413).json({ error: 'Attachment too large' });
            }
          }
        }
      }
      next();
    } catch (err) {
      console.error('[Attachment Guard] Error validating attachments', err);
      return res.status(400).json({ error: 'Invalid attachment payload' });
    }
  });

  // Safe error handler (must be registered after routes in server but exported here for convenience)
}

export function safeErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Unhandled Error]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
}
