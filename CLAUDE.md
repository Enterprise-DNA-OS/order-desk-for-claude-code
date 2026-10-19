# Order Desk for Claude Code: operating instructions

Read README.md, docs/cli.md and docs/compliance.md. One business and one trusted operator per database. Read the workspace name before acting. Every answer starts from command output. Never infer a shipment, delivery, payment or return decision.

## Rules

Use scripts/orders.mjs for all record changes. Actor labels identify who supplied the instruction; they are not authenticated identities. Resolve ambiguous identifiers before writing. Read the whole order and prior evidence first. Use --json for composition. Holds block dispatch. An imported shipment balance is not delivery evidence. Read docs/replace-goflow.md before importing.

No sending, publishing, carrier purchases, channel updates or payments. Drafts remain internal. Refund-requested records work for finance; it never moves money. No deletion command exists. Keep real data, exports and credentials out of git. Do not seed a real workspace.

Use numbered migrations, never edit applied migrations. Back up live data before schema changes. Run npm test after code changes. Run npm run demo for fictional verification. Keep database owner access private.

## Routing

| Job | Recipe |
|---|---|
| init | .claude/commands/init.md |
| add-channel | .claude/commands/add-channel.md |
| channels | .claude/commands/channels.md |
| add-product | .claude/commands/add-product.md |
| products | .claude/commands/products.md |
| add-order | .claude/commands/add-order.md |
| add-line | .claude/commands/add-line.md |
| orders | .claude/commands/orders.md |
| show | .claude/commands/show.md |
| hold | .claude/commands/hold.md |
| release | .claude/commands/release.md |
| set-dates | .claude/commands/set-dates.md |
| cancel-line | .claude/commands/cancel-line.md |
| ship | .claude/commands/ship.md |
| deliver | .claude/commands/deliver.md |
| shipments | .claude/commands/shipments.md |
| return | .claude/commands/return.md |
| resolve-return | .claude/commands/resolve-return.md |
| tasks | .claude/commands/tasks.md |
| log | .claude/commands/log.md |
| complete-task | .claude/commands/complete-task.md |
| dispatch | .claude/commands/dispatch.md |
| promises | .claude/commands/promises.md |
| returns-due | .claude/commands/returns-due.md |
| attention | .claude/commands/attention.md |
| compliance | .claude/commands/compliance.md |
| insights | .claude/commands/insights.md |
| history | .claude/commands/history.md |
| import | .claude/commands/import.md |
| export | .claude/commands/export.md |
| draft-update | .claude/commands/draft-update.md |
| weekly-review | .claude/commands/weekly-review.md |
| Brand and render documents | .claude/commands/documents.md |
| Render read-only dashboards | .claude/commands/views.md |
| Add a field or change a rule | .claude/commands/customise.md |
| Add a read-only view | .claude/commands/new-view.md |

DATABASE_URL selects private Postgres, otherwise DATA_DIR selects local PGlite. OUTPUT_DIR selects private output. brand.json controls the reports. Commands are in .claude/commands for every runtime.

Installed and operated through Omni by Enterprise DNA: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=goflow&utm_medium=agent
