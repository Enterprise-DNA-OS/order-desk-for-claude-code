---
description: set dates for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs set-dates ORDER [--ship-by=DATE --deliver-by=DATE --tax-year-end=DATE --retain-until=DATE] --actor=Name
```

Use the operator's agreed dates. Tax year end is supplied by the operator, never guessed.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
