# Order Desk for Claude Code

Find the order that missed its dispatch date, the parcel without delivery evidence and the return waiting for a decision. Keep your merchant order desk in a database you own. MIT licensed. Built by Enterprise DNA.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Install, test, then import your orders. | Your channels, rules, paperwork and connections. One setup fee, then a retainer. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=goflow&utm_medium=readme) | [Talk to Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=goflow&utm_medium=readme) |

Goflow's pricing calculator lists Thriving at US$2,249 per month, equivalent to US$26,988 across twelve months, before extras. This is a public plan comparison, not a customer invoice or a savings guarantee. [Vendor pricing](https://goflow.com/pricing), checked 19 October 2026. This base covers the merchant's order desk. Goflow's wider platform includes connections and warehouse functions that are separate implementation work.

## Quick start

Use Node 22 or later.

```bash
git clone https://github.com/Enterprise-DNA-OS/order-desk-for-claude-code.git
cd order-desk-for-claude-code
npm install
npm test
npm run demo
```

The demo uses a fresh temporary PGlite database, ignores DATABASE_URL, renders documents and views, and removes the demo when it finishes. To inspect the files, run npm run demo -- --keep. For a persistent fictional workspace run npm run migrate, then npm run seed. Never seed a business workspace.

For a real business start with an empty database:

```bash
npm run migrate
node scripts/orders.mjs init "Your business" --actor="Your name"
node scripts/orders.mjs add-channel "Web Store" --actor="Your name"
```

DATABASE_URL selects private Postgres. Without it, PGlite stores the database in .data/db. Remote TLS verifies certificates. One business and one trusted operator per database. This is local administration, with no public service or authenticated team permissions. Actor names are supplied labels. Protect the folder and database credentials through your operating system. Open the folder in Claude Code, Codex, OpenCode or Cursor and describe the job. The software makes no model calls.

## Five weekly rituals

- /dispatch: review unshipped quantities and holds before the dispatch cut-off.
- /promises: find agreed delivery dates that passed without complete delivery evidence.
- /returns-due: review open returns and decide who needs to act.
- /attention: assign overdue order and follow-up work.
- /weekly-review: draft the Monday review from attention, dispatch and returns.

[CLI reference](docs/cli.md). Every command supports --json. Unique identifier prefixes and case-insensitive names work. Ambiguous matches list candidates and exit with an error. Full line IDs avoid ambiguity when several orders use line number 1.

## Bring your Goflow orders

Choose a custom line-level order export in Goflow and map its headers. The included CSV is fictional, with documented configurable headers. It is not a captured customer export.

```bash
node scripts/orders.mjs import goflow examples/goflow-lines.csv --dry-run --actor="Your name"
```

Then repeat without --dry-run. Use --map=examples/column-map.json for different headings. The entire file succeeds or rolls back. Identical source records are skipped on repeat import. Changed or incomplete versions of an existing order fail for reconciliation. Every new imported order starts on hold. Existing shipped quantities are opening balances, not invented delivery records. Resolve that history before releasing an order.

[Switching guide](docs/replace-goflow.md) explains the mapping, quantity checks and what needs a separate export. A clean, reviewed CSV imports in one command. Delivery evidence, return history and channel connections need separate reconciliation. Complete that before retiring your current system.

## Documents and read-only views

Set your business name, logo and colours in brand.json. npm run docs produces order handovers, dispatch dockets and return reviews. npm run view produces the weekly desk, delivery promises and returns dashboards. These are HTML snapshots for internal use, with no action buttons. /new-view adds a report. /draft-update writes an internal briefing in drafts/. Nothing sends, buys labels, updates a marketplace or moves money.

## Ten questions answered from your own records

/insights answers these today. They combine the records in this base. They are not assertions that Goflow cannot produce a custom report.
1. Which overdue orders are still on hold?
2. Which customers have partial dispatches past their ship date?
3. Which channels have overdue unshipped units?
4. Which dispatched orders still lack full delivery evidence?
5. Which products have unresolved returns?
6. Which owners have overdue follow-ups?
7. Which orders have retention dates below the recorded tax-year floor?
8. Which channel and currency combinations carry unshipped value?
9. Which imported shipments need delivery reconciliation?
10. Which returned orders have no open follow-up task?

## Your first hour: ten things to ask for

1. Show which overdue orders are held and why.
2. Find partial dispatches that need another parcel.
3. Split unshipped value by channel and currency.
4. Record the dispatch docket for two units of an order line.
5. Record delivery only after the carrier evidence is checked.
6. Open a return for a damaged unit.
7. Record a refund request without issuing a refund.
8. Assign an owner to an overdue follow-up.
9. Put our name and colours on the Monday review.
10. Add our purchase-order reference through /customise.

## Boundaries and records

Shipments cannot exceed the remaining units, cancellations cannot consume shipped units, and return cases cannot exceed shipped units. Holds block dispatch. Delivery requires an evidence reference. Returns retain their decision and reason. Refund-requested records a decision for finance to execute elsewhere. Replacement and repair decisions do not create another order automatically. The system does not track stock availability, allocate warehouse bins or reconcile payments.

The NZ checks flag missed recorded delivery dates and missing or short record-retention dates. They do not decide legal remedies, certify compliance or decide what a reasonable delivery time is. AU consumer and tax rules need separate configuration before use. [Compliance rules and sources](docs/compliance.md).

Source dates use YYYY-MM-DD. Monetary amounts are integer cents with an explicit currency. Reports group currencies separately and never add them together. Product unit prices exclude any separately charged freight, tax or discounts; include those in your accounting system. This is not a tax invoice or a general ledger.

Audit events are append-only through a database trigger. A database owner can bypass controls. There is no deletion command. Back up the database, test restoration and review retention with the operator. JSON export is a portable record archive, not an automatic restore tool. Keep real imports, exports, drafts and credentials out of git. [Scope and limits](docs/why-no-front-end.md).

## Verification

npm test exercises every CLI operation, import rollback, repeated imports, invalid quantities, holds, delivery evidence, return decisions, currency separation, drafts and HTML escaping. The GitHub workflow runs Node 22 on Windows and Linux. See docs/verification.md for the checks actually completed in this build.
