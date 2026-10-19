---
description: ship for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs ship LINE --qty=1 --warehouse=Name --carrier=Name --tracking=REF --date=DATE --evidence="Dispatch docket" --actor=Name
```

This records an actual dispatch. Read the order and line first. Use the docket date and real tracking reference. It does not buy a label or update a channel.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
