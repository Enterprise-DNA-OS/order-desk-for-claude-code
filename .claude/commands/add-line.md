---
description: add line for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs add-line ORDER --sku=SKU --line=REF --qty=2 --unit=24.00 --actor=Name
```

Read the current record first. Use the operator's facts and an actor label for changes. Do not invent missing values.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
