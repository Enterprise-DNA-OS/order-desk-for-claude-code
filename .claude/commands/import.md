---
description: import for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs import goflow FILE.csv [--map=column-map.json] [--dry-run] --actor=Name
```

Read docs/replace-goflow.md. Inspect the actual export headings. Dry-run first, reconcile counts and quantities, then import. New orders stay held. Never invent historical delivery evidence.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
