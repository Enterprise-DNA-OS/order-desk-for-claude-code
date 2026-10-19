# Bring your Goflow order desk across

Source checked 19 October 2026: [Goflow custom exports](https://goflow.com/docs/general/custom-exports).

An account with the Exports role can download order lines as CSV. Open Orders, choose Export, and create a custom line-level export with both order and line fields. Goflow lets you name the CSV headers. Export complete orders in a consistent date range. Top-level exports omit the line detail this importer needs.

## Map and test

Use the following target fields. Header names here are our chosen export profile, not a promise about every Goflow default export.

| Target | Profile header | Rule |
|---|---|---|
| reference | Order Number | Required, unique within channel |
| channel | Store | Required |
| line | Line ID | Required, stable and unique within order |
| sku | Item Number | Required |
| product | Product Name | Optional, otherwise the SKU |
| quantity | Quantity | Positive whole units |
| unit | Unit Price | Nonnegative decimal, at most two decimal places |
| customer | Customer | Required |
| currency | Currency | Required ISO currency code |
| ordered | Order Date | Required YYYY-MM-DD |
| ship_by | Ship By | Optional YYYY-MM-DD |
| deliver_by | Deliver By | Optional agreed date |
| status | Status | Required, see supported values below |
| shipped | Shipped Quantity | Historical units already sent |
| cancelled | Cancelled Quantity | Historical units already cancelled |
| tax_year_end | Tax Year End | Operator-supplied tax period end |
| retain_until | Retain Until | Operator-reviewed retention date |

Some columns, including the tax dates and stable line references, may need enrichment after export. Review the available fields in your account. If the source uses different headings, supply a JSON object mapping target names to the exact source headings. If the source has no stable line identifier, assign one once in the reviewed export profile and preserve it for repeat imports. Never group duplicate SKU rows into one without checking their prices and quantities.

```bash
node scripts/orders.mjs import goflow imports/order-lines.csv --map=imports/column-map.json --dry-run --actor="Your name"
node scripts/orders.mjs import goflow imports/order-lines.csv --map=imports/column-map.json --actor="Your name"
```

The dry run validates and rolls back all changes. It reports ignored columns. A committed import creates missing channel and SKU records, then inserts complete orders and lines in one transaction. Matching fingerprints are skipped. A changed fingerprint stops the entire import. No existing order is overwritten.

Accepted source status labels, ignoring case: Open, On Hold, Shipped, Cancelled, In Progress, Ready for Pickup, Ready to Ship, Partial. Map other labels explicitly in a reviewed copy. Every imported order is held regardless of source status. Shipped, Partial and Cancelled require explicit shipped and cancelled quantities. Fully shipped and fully cancelled statuses must reconcile to the line quantity. Source status is retained separately from the base's derived status.

## Reconcile before release

Compare counts of orders and lines, quantities, currency and line values against the export. Reconcile opening shipped quantities with the separate shipment history. They are not automatically marked delivered. Review cancellation evidence, tax period dates and retention decisions. Then release each open order with an evidence reference after checking its remaining units.

Return history, original documents, tracking events, payment records, tax, freight, discounts, stock quantities, kits, channel credentials and marketplace acknowledgements do not come across through this order-line import. Keep their original exports and reconcile them separately. The importer never contacts a channel. Enterprise DNA can build those connections into your installed version.

A reviewed order-line file imports in one command. It does not make a complete platform migration a one-command operation. Do not cancel the incumbent until the operator has signed off the reconciliation and the required connections.
