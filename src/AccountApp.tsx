import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { LockKeyhole } from "lucide-react";
import WorkspaceApp from "./App";
import { AuthPage } from "./AuthPage";
import { Brand } from "./ui";
import { supabase } from "./lib/client";
import { AccountContext, type Account } from "./lib/account-context";
import { authRoutes, currentRoute, navigate } from "./lib/navigation";
import { loadWorkspace, readWorkspace, saveWorkspace } from "./lib/cloud";
import { SaveQueue, type SaveStatus } from "./lib/save-queue";
import { legacyPlan } from "./lib/snapshot";
import { demoState } from "./lib/demo";
import type { State } from "./lib/domain";

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  )
    return error.message;
  return "Could not connect. Please try again.";
}
export default function AccountApp() {
  const [route, setRoute] = useState(currentRoute);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [record, setRecord] = useState<{ owner: string; state: State } | null>(
    null,
  );
  const [demo, setDemo] = useState<State | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasLegacy, setHasLegacy] = useState(() => !!legacyPlan());
  const queue = useRef<SaveQueue | null>(null);
  const recordRef = useRef(record);
  const ownerRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    const updateRoute = () => setRoute(currentRoute());
    for (const event of ["popstate", "hashchange", "budgetflow:navigation"])
      window.addEventListener(event, updateRoute);
    return () => {
      for (const event of ["popstate", "hashchange", "budgetflow:navigation"])
        window.removeEventListener(event, updateRoute);
    };
  }, []);
  useEffect(() => {
    let live = true;
    // This callback stays synchronous: Auth calls awaited inside it can deadlock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!live) return;
      if (ownerRef.current !== (next?.user.id || null)) {
        queue.current?.stop();
        queue.current = null;
        recordRef.current = null;
        setRecord(null);
        setDemo(null);
        ownerRef.current = next?.user.id || null;
      }
      setSession(next);
      setAuthReady(true);
      if (event === "PASSWORD_RECOVERY") navigate("reset-password");
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!live) return;
        if (error) setAuthError(errorMessage(error));
        ownerRef.current = data.session?.user.id || null;
        setSession(data.session);
        setAuthReady(true);
      })
      .catch((e) => {
        if (live) {
          setAuthError(errorMessage(e));
          setAuthReady(true);
        }
      });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  const userId = session?.user.id;
  const confirmed = session?.user.email_confirmed_at;
  useEffect(() => {
    if (!session || !confirmed) return;
    let live = true;
    const owner = session.user.id;
    setLoadError("");
    setRecord(null);
    recordRef.current = null;
    void loadWorkspace(session.user)
      .then((loaded) => {
        if (!live || ownerRef.current !== owner) return;
        const next = { owner, state: loaded.snapshot };
        const q = new SaveQueue(
          loaded.revision,
          (request) => saveWorkspace(owner, request),
          (value) => {
            if (!live) return;
            setStatus(value);
            setError(
              value === "conflict"
                ? "Another device saved a newer plan. Export your current edits before reloading the saved plan."
                : value === "error"
                  ? "Your latest changes are still on this screen. Check your connection and retry before leaving."
                  : "",
            );
          },
        );
        queue.current = q;
        recordRef.current = next;
        setRecord(next);
        setStatus("saved");
        setError("");
      })
      .catch((e) => {
        if (live) setLoadError(errorMessage(e));
      });
    return () => {
      live = false;
      clearTimeout(saveTimer.current);
      queue.current?.stop();
      queue.current = null;
    };
    // Token refresh must not reload or replace edits in progress.
  }, [userId, confirmed, loadAttempt]);
  useEffect(() => {
    if (
      authReady &&
      session &&
      record?.owner === session.user.id &&
      ["login", "signup", "verify-email", "auth-callback"].includes(route)
    )
      navigate("overview");
  }, [authReady, session, record, route]);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (queue.current?.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const refresh = async () => {
      if (
        document.visibilityState !== "visible" ||
        !ownerRef.current ||
        !queue.current ||
        queue.current.dirty
      )
        return;
      const owner = ownerRef.current;
      const q = queue.current;
      try {
        const saved = await readWorkspace(owner);
        if (
          !saved ||
          ownerRef.current !== owner ||
          queue.current !== q ||
          q.dirty ||
          saved.revision <= q.revision
        )
          return;
        q.revision = saved.revision;
        const next = { owner, state: saved.snapshot };
        recordRef.current = next;
        setRecord(next);
      } catch {
        /* The next edit/save or load surfaces network errors. */
      }
    };
    const retryOnline = () => {
      void queue.current?.flush().catch(() => {});
      void refresh();
    };
    const timer = setInterval(() => void refresh(), 30000);
    window.addEventListener("beforeunload", protect);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", retryOnline);
    return () => {
      clearInterval(timer);
      window.removeEventListener("beforeunload", protect);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", retryOnline);
    };
  }, []);
  const update = useCallback(
    (action: SetStateAction<State>) => {
      if (busy) return;
      if (demo) {
        setDemo((old) =>
          typeof action === "function" ? action(old!) : action,
        );
        return;
      }
      const old = recordRef.current;
      const q = queue.current;
      if (!old || !q || old.owner !== ownerRef.current) return;
      const state = typeof action === "function" ? action(old.state) : action;
      if (state.mode !== "personal") return;
      const next = { owner: old.owner, state };
      recordRef.current = next;
      setRecord(next);
      q.enqueue(state);
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void q.flush().catch(() => {});
      }, 400);
    },
    [busy, demo],
  );
  async function flush() {
    clearTimeout(saveTimer.current);
    if (queue.current) await queue.current.flush();
  }
  const account: Account = {
    email: session?.user.email || null,
    status,
    error,
    busy,
    hasLegacy,
    logout: async () => {
      setBusy(true);
      setError("");
      try {
        await flush();
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
        queue.current?.stop();
        queue.current = null;
        recordRef.current = null;
        setRecord(null);
        setDemo(null);
        setSession(null);
        ownerRef.current = null;
        setAuthError("");
        navigate("login");
      } catch (e) {
        setError("Logout did not finish: " + errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    showDemo: async () => {
      setBusy(true);
      try {
        await flush();
        setDemo(demoState());
        navigate("overview");
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    returnToPlan: () => {
      setDemo(null);
      navigate(session ? "overview" : "login");
    },
    retry: () => {
      void flush().catch(() => {});
    },
    reload: () => {
      if (
        window.confirm(
          "Reload the saved plan? Changes that have not synced will be discarded. Export your plan from Profile first to keep them.",
        )
      )
        setLoadAttempt((n) => n + 1);
    },
    importLegacy: async () => {
      const legacy = legacyPlan();
      if (
        !legacy ||
        !window.confirm(
          "Replace this account’s current plan with the previous plan saved in this browser? You can export your current plan first.",
        )
      )
        return;
      setBusy(true);
      try {
        await flush();
        const q = queue.current;
        const old = recordRef.current;
        if (!q || !old || old.owner !== ownerRef.current) return;
        q.enqueue(legacy);
        const next = { owner: old.owner, state: legacy };
        recordRef.current = next;
        setRecord(next);
        await q.flush();
        localStorage.removeItem("budgetflow.workspace.v1");
        localStorage.removeItem("tend.budget.v1");
        setHasLegacy(false);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
  };
  const explore = () => {
    setDemo(demoState());
    navigate("overview");
  };
  if (!authReady) return <AccountLoading title="Opening your workspace…" />;
  if (
    authRoutes.has(route) &&
    route !== "auth-callback" &&
    !(session && route === "verify-email")
  )
    return (
      <AuthPage
        key={route}
        route={route}
        session={session}
        initialError={authError}
        onDemo={explore}
      />
    );
  if (demo)
    return (
      <AccountContext.Provider value={account}>
        <WorkspaceApp key="demo" s={demo} setS={update} />
      </AccountContext.Provider>
    );
  if (!session || !confirmed)
    return (
      <AuthPage
        route={route === "auth-callback" ? "auth-callback" : "login"}
        session={null}
        initialError={authError}
        onDemo={explore}
      />
    );
  if (loadError)
    return (
      <AccountLoading
        title="We couldn’t open your plan."
        error={loadError}
        action={
          <>
            <button
              className="primary"
              onClick={() => setLoadAttempt((n) => n + 1)}
            >
              Try again
            </button>
            <button
              className="text-button"
              onClick={() => void account.logout()}
            >
              Log out
            </button>
          </>
        }
      />
    );
  if (!record || record.owner !== session.user.id)
    return <AccountLoading title="Opening your private plan…" />;
  return (
    <AccountContext.Provider value={account}>
      <WorkspaceApp key={record.owner} s={record.state} setS={update} />
      {busy && (
        <div className="account-busy" role="status">
          Saving your plan…
        </div>
      )}
    </AccountContext.Provider>
  );
}
function AccountLoading({
  title,
  error,
  action,
}: {
  title: string;
  error?: string;
  action?: ReactNode;
}) {
  return (
    <main className="account-loading">
      <Brand />
      <div className="auth-card">
        <LockKeyhole size={28} />
        <h1>{title}</h1>
        {error && <p role="alert">{error}</p>}
        {action}
      </div>
    </main>
  );
}
