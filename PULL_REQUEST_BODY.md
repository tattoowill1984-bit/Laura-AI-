# Hardening: API-key auth, rate limiting, and CORS whitelist

This PR adds short-term security hardening to the Laura AI runtime to reduce attack surface and protect admin/test endpoints.

Key changes
- Add API-key based auth middleware (server/middleware/auth.ts). Accepts `x-api-key` or `Authorization: Bearer <key>`. Keys are read from `ADMIN_API_KEYS` or `API_KEYS` environment variable (comma-separated).
- Add hardening middleware (server/middleware/hardening.ts): CORS whitelist (read from `ALLOWED_ORIGINS`), express-rate-limit for general and admin routes, attachment size guard, and safe error handler.
- Wire middleware into server.ts and tighten body parser limits from 50mb -> 2mb by default.
- Update package.json to include `express-rate-limit` dependency.

Initial Admin API Key (one-time)

I generated a one-time initial admin API key so you can test immediately. Treat this like a password — do NOT commit it anywhere. Add it to your deployment or CI secrets as described below.

ADMIN API KEY: 8f14e45f-e1b3-4c7a-9d3e-5b6f2d4a1c9e

How to configure (recommended)
1. Go to your repository Settings → Secrets and variables → Actions → New repository secret.
2. Add `ADMIN_API_KEYS` with value set to the key above. You can add multiple keys by separating with commas.
3. Add `ALLOWED_ORIGINS`, comma-separated. Example: `http://localhost:5173,http://localhost:3000`
4. (Optional) Add `JSON_LIMIT` and `URLENCODED_LIMIT` to adjust body parser limits. Defaults are `2mb`.

Local development (do NOT commit):
Create a `.env` file with:
```
ADMIN_API_KEYS=8f14e45f-e1b3-4c7a-9d3e-5b6f2d4a1c9e
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

Testing the change
- Blocked without key:
  `curl -i -X POST http://localhost:3000/api/gabby/kms/rotate`
- Allowed with key (header `x-api-key`):
  `curl -i -X POST http://localhost:3000/api/gabby/kms/rotate -H "x-api-key: 8f14e45f-e1b3-4c7a-9d3e-5b6f2d4a1c9e"`

Notes & follow-ups
- This is a short-term mitigation. I recommend follow-up PRs to:
  - Hash profile passcodes and migrate persistentStorage off plaintext JSON to an encrypted DB.
  - Move to JWTs signed by a KMS-backed key for stronger RBAC.
  - Add CI checks for secret scanning and dependency audits.

If you want, I can (in a follow-up PR):
- Add passcode hashing and a migration helper.
- Replace API keys with JWT auth scaffold.
- Add CI workflows to run tests and type checks.

