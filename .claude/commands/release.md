---
description: release for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs release ORDER --evidence="Checked by operator" --actor=Name
```

Read the hold reason and all lines. Imported opening shipped balances need reconciliation before release.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
