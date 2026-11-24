# Accounting and interaction rules

Amounts are integer USD cents. Dates are local calendar dates stored as YYYY-MM-DD, rather than instants shifted by browser time zone. Months use YYYY-MM. Values shown below are application planning/tracking calculations, not bank balances.

## Monthly plan

| Value                       | Rule                                                                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expected income             | Sum of scheduled paycheck estimates.                                                                                                                                 |
| Income forecast             | Actual receipt amount for checked paychecks; estimate for unchecked paychecks.                                                                                       |
| Received income             | Only checked paychecks’ actual amounts.                                                                                                                              |
| Budget allocated            | Sum of category budget allocations.                                                                                                                                  |
| Spent                       | Sum of recorded expenses, once each.                                                                                                                                 |
| Category balance            | Category budget minus category spending. Preserve negatives.                                                                                                         |
| Spending commitment         | For each category, the greater of its budget and actual spending. Sum across categories.                                                                             |
| Savings forecast            | Income forecast minus spending commitments. Preserve negatives.                                                                                                      |
| Money left from receipts    | Received income minus recorded spending. Preserve negatives; this is not an imported bank balance.                                                                   |
| Unspent reserve             | Commitments minus recorded spending. It remains reserved while the month is open.                                                                                    |
| Funded savings, open month  | Positive surplus after received income covers commitments, less any actual cash shortfall where spending exceeds receipts. Future paychecks alone cannot fund goals. |
| Final savings, closed month | Received income minus actual spending. Unspent category reserves are released. Pending income is excluded.                                                           |

Example: forecast $10,000; category budgets $7,000; no overspending. Savings forecast is $3,000. Add a $1,500 Greece category: budgets become $8,500 and savings become $1,500. If Food & Coffee has a $300 budget and spending becomes $325, its balance is −$25; commitment grows by $25 and savings becomes $1,475.

With only $5,000 received and $3,665 spent, received money left is $1,335. It is still needed for unspent category reserves; it is not automatically available to allocate to goals. With all $10,000 received, the $1,500 surplus in the Greece example becomes funded savings. Closing the month releases the unused portion of all category budgets, making final savings $6,335 if spending remains $3,665.

Reducing a category budget below spending does not erase an expense. Its commitment stays at least as high as its actual spending. A category with expenses can be removed only after those expenses are reassigned or removed.

## Paychecks

Checking a payday opens actual amount and receipt date. Receipt fields replace one paycheck’s receipt; they do not append a second copy. Undoing returns it to estimated income. A lower actual receipt reduces the forecast immediately, even if the original scheduled estimate is retained for comparison.

The concept groups paychecks by their selected planning month. Receipt dates must be in that month and not in the future according to the workspace date. A paycheck paid in another month should be rescheduled into the correct plan before recording it. Production must preserve the relationship between the originally expected payday and the actual receipt month; this is an explicit backend acceptance requirement.

Payday generation adds only dates in the selected month and shows the exact count and total before saving. Twice-monthly generation uses a first day from 1–15 and a second day 15 days later. Future months are created and planned independently. Monthly category templates do not copy receipts, spending, or paychecks.

## Savings and goals

Confirmed savings capacity = starting savings + funded/final savings across monthly plans. Contributions assign capacity to goals; they neither increase capacity nor create an expense. Available general savings = capacity − all goal contributions.

New contributions must be positive, within available capacity, and within the goal’s remaining target. An edit to a budget, paycheck, month status, or starting savings can reduce capacity after earlier contributions. Keep those contributions visible and show a negative available balance with a request to release allocations. Never silently delete contributions or manufacture income to hide the mismatch.

Progress is assigned amount / target amount. Monthly pace is the remaining target divided by calendar months from the current month through the target month, inclusive, rounded upward to the cent. A past-due target is labeled overdue and its remaining amount is shown as the current month’s pace. Forecast savings is never displayed as achieved goal progress.

Closing is a derived state change, not an additional savings transaction. Reopening restores reserves and recalculates capacity. That prevents repeated close/reopen actions from duplicating savings.
