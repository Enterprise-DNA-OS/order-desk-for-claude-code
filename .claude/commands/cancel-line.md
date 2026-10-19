---
description: cancel line for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs cancel-line LINE --qty=1 --evidence="Cancellation authority" --actor=Name
```

Cancellation applies only to unshipped units. Evidence records the authority. No refund is issued.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
