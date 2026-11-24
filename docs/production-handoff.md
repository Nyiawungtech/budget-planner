# Production handoff

The app repository is https://github.com/Nyiawungtech/budget-planner. The existing Settle Up repository is Nyiawungtech/debt-remindeer-app; reference it for established UI conventions, without writing this new product into it.

## Agreed scope

Ionic React + TypeScript for the shared app, Vite for the web build, Supabase Auth and PostgreSQL for accounts and durable data, and Capacitor for later iOS/Android packaging. Use the same Supabase account/organization the user already has. Inspect the existing Supabase project and tables before selecting a separate project or isolated app tables. Do not overwrite Settle Up records, signup redirects, auth configuration, or migrations.

No reminder system, push notifications, email/SMS budget alerts, or reminder workers. Authentication-related email verification and password recovery belong to account setup; they are not budget reminders.

## Data foundation

| Record              | Purpose / integrity requirement                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Profiles            | Auth owner, display name, currency, time zone, theme, and explicitly dated opening savings.                                   |
| Income sources      | Multiple sources owned by one user; retain history when archiving a source.                                                   |
| Monthly plans       | Unique owner + calendar month, open/closed state, revision.                                                                   |
| Planned paychecks   | Source, planned date/amount, recurring rule reference, optional note.                                                         |
| Income receipts     | Actual date/amount linked to a planned paycheck; support unplanned income. Recognize actual cash in its actual receipt month. |
| Budget categories   | Month, name, amount, icon/color, owner, revision.                                                                             |
| Spending records    | Amount, category, effective date/month, note, revision. Enforce matching owner and month.                                     |
| Goals               | Target amount and date, owner, archived/completed state.                                                                      |
| Savings allocations | Goal and amount, effective date, reference to savings funding, reversal/correction history.                                   |

Balances are derived from source records. Do not store separate mutable copies of dashboard totals, budget totals, and savings totals. Use database transactions for receipt changes, category reassignment, month closeout, and savings allocations. Use unique operation IDs for retry safety and revision checks for concurrent edits. Keep all child records under the authenticated owner, including records reached through joins.

## Account and sync work

Implement verified-email signup with a dedicated verification screen, sign-in, recovery, logout, profile changes, and export/deletion. Use owner-only database policies and test two-account isolation for every record type. Choose the protected-session approach already used in Settle Up after inspecting its current implementation. Never put privileged database keys in client code.

Replace the prototype’s browser-only state with an authenticated repository layer. Keep the domain calculations and tests; recompute views from authoritative records. Migrate date handling for late/early payroll into expected-versus-received month reporting. Add a visible save/sync state and a defined offline/concurrency policy before claiming reliable cross-device use.

## Release checks

1. The $10,000 income / $7,000 budget / $3,000 savings example becomes $1,500 savings after adding a $1,500 Greece allocation, on every screen and another signed-in device.
2. Actual expenses over a category’s budget show a signed negative balance and reduce forecast savings by the excess.
3. Scheduled income never appears as received money or achieved savings progress until a receipt is recorded.
4. Receipt edits, retries, undo, close/reopen, goal transfers, and corrections never duplicate money.
5. A received paycheck crossing a month boundary affects its actual receipt month without duplicating the forecast.
6. Each month keeps independent budgets and spending; templates copy amounts only.
7. Every account can access only its own profiles and financial records, including child records and exports.
8. Validate the main flows on physical mobile devices, including keyboard, date inputs, accessibility, dark mode, reduced motion, and native safe areas.
9. Add Capacitor app identifiers, native projects, session storage adapters, signing, and store metadata using BudgetFlow and the budget-planner repository after production account flows are ready.
