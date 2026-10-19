---
description: return for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs return LINE --qty=1 --reason="Reason" --date=DATE --review-by=DATE --actor=Name
```

Read the line and its prior return cases. Use the actual returned quantity and operator-selected review date.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
