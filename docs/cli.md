# Order desk CLI

Every operation supports --json. Changes require --actor. Dates are YYYY-MM-DD. Currency amounts are exact integer cents internally. References accept a unique prefix or case-insensitive name. Ambiguity lists candidates and exits 1.

## init

```bash
node scripts/orders.mjs init "Business" --actor=Name
```

Read the matching command recipe before use.

## add-channel

```bash
node scripts/orders.mjs add-channel "Channel" --actor=Name
```

Read the matching command recipe before use.

## channels

```bash
node scripts/orders.mjs channels
```

Read the matching command recipe before use.

## add-product

```bash
node scripts/orders.mjs add-product SKU --name="Product" --actor=Name
```

Read the matching command recipe before use.

## products

```bash
node scripts/orders.mjs products
```

Read the matching command recipe before use.

## add-order

```bash
node scripts/orders.mjs add-order REF --channel=Channel --customer=Name --currency=NZD --ordered=YYYY-MM-DD [--ship-by=DATE --deliver-by=DATE --tax-year-end=DATE --retain-until=DATE] --actor=Name
```

Read the matching command recipe before use.

## add-line

```bash
node scripts/orders.mjs add-line ORDER --sku=SKU --line=REF --qty=2 --unit=24.00 --actor=Name
```

Read the matching command recipe before use.

## orders

```bash
node scripts/orders.mjs orders [--channel=Channel]
```

Read the matching command recipe before use.

## show

```bash
node scripts/orders.mjs show ORDER
```

Read the matching command recipe before use.

## hold

```bash
node scripts/orders.mjs hold ORDER --reason="Reason" --actor=Name
```

Read the matching command recipe before use.

## release

```bash
node scripts/orders.mjs release ORDER --evidence="Checked by operator" --actor=Name
```

Read the hold reason and all lines. Imported opening shipped balances need reconciliation before release.

## set-dates

```bash
node scripts/orders.mjs set-dates ORDER [--ship-by=DATE --deliver-by=DATE --tax-year-end=DATE --retain-until=DATE] --actor=Name
```

Use the operator's agreed dates. Tax year end is supplied by the operator, never guessed.

## cancel-line

```bash
node scripts/orders.mjs cancel-line LINE --qty=1 --evidence="Cancellation authority" --actor=Name
```

Cancellation applies only to unshipped units. Evidence records the authority. No refund is issued.

## ship

```bash
node scripts/orders.mjs ship LINE --qty=1 --warehouse=Name --carrier=Name --tracking=REF --date=DATE --evidence="Dispatch docket" --actor=Name
```

This records an actual dispatch. Read the order and line first. Use the docket date and real tracking reference. It does not buy a label or update a channel.

## deliver

```bash
node scripts/orders.mjs deliver SHIPMENT --date=DATE --evidence="Delivery confirmation" --actor=Name
```

Only record delivery with evidence. Dispatch is not delivery.

## shipments

```bash
node scripts/orders.mjs shipments
```

Read the matching command recipe before use.

## return

```bash
node scripts/orders.mjs return LINE --qty=1 --reason="Reason" --date=DATE --review-by=DATE --actor=Name
```

Read the line and its prior return cases. Use the actual returned quantity and operator-selected review date.

## resolve-return

```bash
node scripts/orders.mjs resolve-return RETURN --outcome=repair|replacement|refund-requested|declined|withdrawn --evidence="Decision reference" --date=DATE --actor=Name
```

Record the operator's decision. refund-requested never executes a payment. Do not say money was refunded.

## tasks

```bash
node scripts/orders.mjs tasks
```

Read the matching command recipe before use.

## log

```bash
node scripts/orders.mjs log ORDER --owner=Name --note="Next action" --due=DATE --actor=Name
```

Read the matching command recipe before use.

## complete-task

```bash
node scripts/orders.mjs complete-task TASK --evidence="What happened" --actor=Name
```

Read the matching command recipe before use.

## dispatch

```bash
node scripts/orders.mjs dispatch
```

Review held orders separately. Never release a hold just to clear the queue.

## promises

```bash
node scripts/orders.mjs promises
```

Missing delivery evidence is not proof that a parcel failed to arrive. Request the carrier evidence internally.

## returns-due

```bash
node scripts/orders.mjs returns-due
```

A review date is the operator's follow-up date, not a legal cutoff. Keep the reason and decision evidence.

## attention

```bash
node scripts/orders.mjs attention
```

Read the matching command recipe before use.

## compliance

```bash
node scripts/orders.mjs compliance
```

Read docs/compliance.md. Distinguish NZ law from LOCAL policy checks. Do not certify compliance.

## insights

```bash
node scripts/orders.mjs insights
```

Report all ten queries, with currencies kept separate. Empty results mean no matching records.

## history

```bash
node scripts/orders.mjs history [ENTITY-ID]
```

Read the matching command recipe before use.

## import

```bash
node scripts/orders.mjs import goflow FILE.csv [--map=column-map.json] [--dry-run] --actor=Name
```

Read docs/replace-goflow.md. Inspect the actual export headings. Dry-run first, reconcile counts and quantities, then import. New orders stay held. Never invent historical delivery evidence.

## export

```bash
node scripts/orders.mjs export [--out=exports/orders.json]
```

Use a private destination. Do not overwrite an archive or put real records into git.

## draft-update

```bash
node scripts/orders.mjs draft-update ORDER
```

Read the whole order. This command writes an internal briefing. It never sends a customer message.

## weekly-review

```bash
node scripts/orders.mjs weekly-review
```

Run attention, dispatch and returns-due first. Then save the review, identify owners, and report overdue decisions.

Order statuses are derived: empty, open, partial, dispatched, held or cancelled. Dispatched means all uncancelled units were shipped, not necessarily delivered. Views are snapshots. JSON export includes all domain records and audit events but does not automatically restore them.
