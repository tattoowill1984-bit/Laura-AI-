## Tests for admin endpoint auth

This file contains a minimal integration test that checks an admin endpoint is blocked when no API key is supplied and allowed when the key is provided.

It requires a running dev server or the server started in test mode. It’s intentionally minimal; more comprehensive tests should be added in follow-ups.

Usage:
- Ensure the server is running on http://localhost:3000 and ADMIN_API_KEYS contains the test key.
- Run: node test/admin-auth-test.js

