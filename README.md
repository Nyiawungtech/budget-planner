# BudgetFlow — Budget Planner

BudgetFlow is the monthly budget, income, expense, and savings app for Inv 2027. It uses the Ionic React + TypeScript foundation of Settle Up, with a fresh #4ADD82 green palette, responsive cards, mobile navigation, and light/dark themes.

Source repository: https://github.com/Nyiawungtech/budget-planner

## Working features

- Email/password accounts, dedicated email verification, login, password recovery, and logout.
- Profile photos with upload/removal, profile editing, starting savings, and time-zone settings.
- Independent monthly plans, with optional budget-category templates.
- Multiple income sources, scheduled payments, and received-income checkoffs with actual amounts.
- Category budgets, expense entry/editing, progress indicators, and signed negative balances.
- Automatic derived savings forecasts that update after every income, budget, or expense change.
- Savings goals, target dates, monthly pace, contributions, and allocation history.
- Monthly closeout/reopening without duplicating savings.
- Private cloud storage, revision-checked saves, sync status, cross-device refresh, private JSON export, themes, and hidden amounts.
- Clean routes: `/`, `/budget`, `/income`, `/expenses`, `/savings`, and `/profile`. Old hash links are migrated automatically.
- PWA manifest, 192/512 px icons, a maskable icon, Apple touch icon, app-install controls, an app-update flow, and an offline shell after a successful online load.

There are no budget reminders, push notifications, or email/SMS alert services. Savings allocations do not transfer money between financial accounts.

## Run and validate

Use Node 22 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
```

The build includes TypeScript checking. `dist/` contains the deployable app, clean-route entry pages, platform rewrite files, the manifest, and the versioned service worker. `npm run check` runs the type check separately.

Tests cover the original $10,000 income / $7,000 budget example, the $1,500 Greece change, overspending, receipt corrections, confirmed savings, goals, monthly independence, dates, clean routes, and the offline cache boundary around authentication.

## Install as a PWA

A custom domain is optional. Serve `dist/` from an HTTPS hosting address. BudgetFlow includes the manifest and icons browsers use for installation. Browser and platform support determines the available installation UI.

- iPhone/iPad: open in Safari, choose Share, then Add to Home Screen.
- Android/desktop: use the browser's Install app control or installation menu.
- BudgetFlow also provides an Install BudgetFlow control in the sidebar and Profile.

The service worker caches the app shell and build assets after an online load. It does not intercept authentication URLs, APIs, non-GET requests, or external requests, and it preserves online access-denial responses. A host's sign-in page is never cached as the app shell. A private preview still requires its hosting account's sign-in for online access.

Reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

## Accounts and private data

BudgetFlow uses the existing Supabase project and the same email/password accounts as Settle Up. Budget records are stored separately in an owner-protected table. Only the public project URL and publishable browser key are included in source. No privileged key belongs in this repository.

Sample data is separate from your signed-in plan. Signed-in financial records are held in memory and synced to your account; they are not cached in the browser after logout. A previous personal browser plan can be imported explicitly from Profile. The sample month uses December 12, 2026; personal plans use their actual date and time zone.

Authentication routes are `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, and `/auth/callback`. The hosting origin's exact email confirmation and reset URLs must be added to Supabase Auth's redirect allowlist. See the handoff for configuration and remaining production smoke tests.

See [accounting rules](docs/accounting.md) and the [production handoff](docs/production-handoff.md).
