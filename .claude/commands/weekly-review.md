---
description: weekly review for the merchant order desk.
---

Read CLAUDE.md. Identify the business and relevant record before running:

```bash
node scripts/orders.mjs weekly-review
```

Run attention, dispatch and returns-due first. Then save the review, identify owners, and report overdue decisions.

Use --json for composition. If a name is ambiguous, show the returned candidates and resolve it before proceeding. Answer from actual output. Keep drafts and exports private. Nothing sends or publishes.
