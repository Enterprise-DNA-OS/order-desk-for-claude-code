# Compliance checks and their limits

Sources checked 19 October 2026. This base supports the NZ order desk. It does not determine legal rights or certify compliance. Australian businesses need their local rules configured before relying on these checks.

| Rule | Check | Source and scope |
|---|---|---|
| NZ-DELIVERY | An agreed delivery date passed and delivered units are below uncancelled ordered units | [NZ Consumer Protection: delivery issues](https://www.consumerprotection.govt.nz/general-help/common-consumer-issues/delivery-issues). The seller handles delivery problems where it arranged delivery. The software requests evidence. It does not determine whether an undocumented delivery failed, whether the sale is within the CGA or what remedy applies. |
| NZ-RECORDS | Missing tax-year end or retention date, or retention below seven years after the supplied tax-year end | [IRD record keeping](https://www.ird.govt.nz/managing-my-tax/record-keeping). Keep business records for at least seven tax years. This check uses the operator's period end. It does not calculate a tax year, check language/offshore approvals or shorten an extension or preservation requirement. |
| LOCAL-PROMISE | Remaining units have no ship-by date | Local operating policy. No statutory dispatch deadline is inferred. |
| LOCAL-IMPORT | Historical shipped units lack reconciled delivery evidence | Local reconciliation requirement. Opening balances are not proof of delivery. |

Return review dates are supplied by the operator. They are follow-up dates, not a statutory returns deadline. Repair, replacement and refund-requested are recorded decisions. They do not execute a remedy or establish that a consumer has accepted it. Finance and customer communication remain separate.

Every mutation records the actor label and action. Labels are not authenticated identities. Use one trusted operator and a private database. Do not expose database-owner access to a browser or to untrusted users. Database owners can bypass triggers and RLS.

Review personal data against its lawful purpose and retention obligations: [NZ Privacy Commissioner, principle 9](https://www.privacy.org.nz/privacy-principles/9/). The base does not delete or anonymise records automatically. Arrange a reviewed retention process for the database, exports and backups. Expired retention dates are not automatic destruction authority. Protect access to all rendered documents.
