# Verification

Checked 19 October 2026 on Linux, Node 22.23.1.

- npm test: PASS, all 32 CLI operations exercised against an isolated PGlite database, with failure cases for quantity limits, holds, dates, import conflicts, ambiguity and immutable audit events.
- npm run demo: PASS, three captured command runs, three dashboards and seven documents from fictional data.
- scripts/postgres-smoke.mjs: PASS on a disposable PostgreSQL database, including migrations, repeatable seed, all reads, quantity guards, import rollback and a dispatch mutation. The script requires TEST_DATABASE_URL, creates a unique schema and removes only that schema.
- Headless Chromium: the weekly HTML dashboard inspected at desktop size, no horizontal page overflow and no action forms.
- The GitHub Actions workflow runs npm test and npm run demo on Windows and Linux using Node 22. Its remote result is checked after the private push.

No live customer database or third-party write is involved. Prices are checked against the vendor's current browser-rendered calculator. Brand lint passes the README, switch guide and compliance notes.
