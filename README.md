# BudgetFlow — Budget Planner

BudgetFlow is the monthly budget, income, expense, and savings app for Inv 2027. It uses the Ionic React + TypeScript foundation of Settle Up, with a light sage-green palette, responsive cards, mobile navigation, and light/dark themes.

Source repository: https://github.com/Nyiawungtech/budget-planner

## Working features

- Local profile creation, starting savings, and time-zone settings.
- Independent monthly plans, with optional budget-category templates.
- Multiple income sources, scheduled payments, and received-income checkoffs with actual amounts.
- Category budgets, expense entry/editing, progress indicators, and signed negative balances.
- Automatic derived savings forecasts that update after every income, budget, or expense change.
- Savings goals, target dates, monthly pace, contributions, and allocation history.
- Monthly closeout/reopening without duplicating savings.
- Browser persistence, updates across tabs, private JSON export, themes, and hidden amounts.
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

## Current account and data boundary

This is a functional local-data preview. Creating an app profile does not create a cloud account. Profiles and budgets are saved in the current browser and origin, not synced between devices. Existing data under the original preview's storage key is retained through a one-time read migration. The sample month uses the labeled example date December 12, 2026; personal profiles use their actual date and time zone.

Supabase authentication and persistence, email verification, recovery, account deletion, conflict handling, and Capacitor native projects are the next production work. The app is prepared for the budget-planner repository; no Supabase credentials or user financial records belong in it.

See [accounting rules](docs/accounting.md) and the [production handoff](docs/production-handoff.md).
