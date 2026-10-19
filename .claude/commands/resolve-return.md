---
description: resolve return for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs resolve-return RETURN --outcome=repair|replacement|refund-requested|declined|withdrawn --evidence="Decision reference" --date=DATE --actor=Name
```

Record the operator's decision. refund-requested never executes a payment. Do not say money was refunded.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
