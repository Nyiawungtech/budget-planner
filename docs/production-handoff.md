# Accounts and cloud storage

BudgetFlow uses Supabase Auth in the existing Duewell project (`motuhpcynixmorwolnlv`). Settle Up and BudgetFlow share email/password identities. Their financial records and browser session storage keys are separate. Resetting a password changes the credential used by both apps.

## Implemented

- Email/password registration, login, dedicated email confirmation screen and resend, password recovery and reset.
- Logout in Profile, with pending writes flushed before the session is revoked using local scope.
- Owner-only cloud plans in `public.budgetflow_workspaces`, guarded by row-level security and a verified, active Auth session.
- All financial records in one versioned snapshot per user. Existing domain calculations remain the single source of balances.
- Serialized, idempotent saves with revision checks, visible save state, retry, and explicit conflict resolution.
- Idle clients reload newer data on focus and every 30 seconds while visible. Edits already in progress are never silently replaced.
- Sample exploration is separate from the authenticated plan.
- Existing personal browser plans can be explicitly imported from Profile. They are never uploaded automatically.
- Signed-in financial snapshots are held in memory, not persisted in localStorage or service-worker caches. An offline page reload needs a connection to open the cloud plan.

## Deployment configuration

`src/lib/backend-config.json` contains only the public project URL and publishable browser key. Database policies protect access. Never add a service-role/secret key, personal access token, or real user financial records.

Optional build overrides:

```sh
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

For each hosting origin, allow these exact Supabase Auth redirect URLs:

- `https://tend-monthly-budget-kb.dsnj1.chatgpt.site/auth/callback`
- `https://tend-monthly-budget-kb.dsnj1.chatgpt.site/reset-password`

Keep Settle Up's Site URL and redirects. Both existing templates use Supabase’s ConfirmationURL. They retain Settle Up branding because the project shares identities; future app-specific email branding needs a coordinated template change. Check custom SMTP and delivery limits before inviting external testers. PKCE links must be completed in the browser that requested them.

The database migration in `supabase/migrations` was applied to the connected project. Its CLI-generated file is aligned with the recorded remote migration version. The shared project also contains Settle Up migrations; do not reset the project or apply this migration twice. Coordinate future migrations through the shared project’s migration history.

## Remaining release work

- A user-performed signup, confirmation, recovery and login/logout smoke test on the production origin.
- Account deletion designed for the shared identity (deleting an Auth identity would affect Settle Up).
- Physical-device accessibility, install, keyboard and offline checks; Capacitor app packaging, signing and store distribution.
- Cross-month receipt accounting review before expanding the existing budget model.
