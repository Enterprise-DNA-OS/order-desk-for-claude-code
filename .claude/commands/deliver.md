---
description: deliver for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs deliver SHIPMENT --date=DATE --evidence="Delivery confirmation" --actor=Name
```

Only record delivery with evidence. Dispatch is not delivery.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
