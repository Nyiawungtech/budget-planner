import { createClient } from "@supabase/supabase-js";
import config from "./backend-config.json";

// Public browser configuration. Row-level security protects every saved plan.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || config.url,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || config.publishableKey,
  {
    auth: {
      storageKey: "budgetflow.auth.v1",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  },
);
export const authRedirect = (path: string) =>
  new URL(path, window.location.origin).href;
