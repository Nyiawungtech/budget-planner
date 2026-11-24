import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  ReceiptText,
  Sprout,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  Pencil,
  MoreHorizontal,
  CircleCheck,
  CircleAlert,
  Download,
  Trash2,
  Leaf,
  ArrowDownToLine,
  Moon,
  Sun,
  Search,
  X,
  CheckCheck,
  LockKeyhole,
  Clock3,
  RotateCcw,
  FolderOpen,
  Smartphone,
  Camera,
} from "lucide-react";
import { AvatarFace, Brand, CategoryIcon, Empty, Progress } from "./ui";
import {
  blankMonth,
  categorySpent,
  dateLabel,
  goalSaved,
  money,
  monthLabel,
  monthlyPace,
  referenceDay,
  savingsPool,
  shiftMonth,
  totals,
  type State,
  type Month,
  type Paycheck,
  type Category,
} from "./lib/domain";
import { useAccount } from "./lib/account-context";
import { Dialogs, type DialogState } from "./dialogs";
import { currentRoute, navigate, type Route } from "./lib/navigation";
import { usePwa } from "./lib/pwa";

const navigation = [
  ["overview", "Overview", LayoutDashboard],
  ["budget", "My budget", Wallet],
  ["income", "Income", CalendarDays],
  ["expenses", "Expenses", ReceiptText],
  ["savings", "Savings", Sprout],
] as const;
type Workspace = {
  s: State;
  m: Month;
  route: Route;
  day: string;
  hidden: boolean;
  cash: (n: number) => string;
  go: (route: Route) => void;
  edit: (change: (draft: State) => void, message?: string) => void;
  replace: (next: State, message: string) => void;
  open: (dialog: DialogState) => void;
  notify: (message: string) => void;
  installApp: () => Promise<void>;
  installed: boolean;
};
const Context = createContext<Workspace>(null!);
export const useWorkspace = () => useContext(Context);

export default function App({
  s,
  setS,
}: {
  s: State;
  setS: Dispatch<SetStateAction<State>>;
}) {
  const account = useAccount();
  const pwa = usePwa();
  const [route, setRoute] = useState<Route>(currentRoute);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toast, setToast] = useState("");
  const [hidden, setHidden] = useState(false);
  const close = useCallback(() => setDialog(null), []);
  useEffect(() => {
    const listener = () => {
      setRoute(currentRoute());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", listener);
    window.addEventListener("hashchange", listener);
    window.addEventListener("budgetflow:navigation", listener);
    return () => {
      window.removeEventListener("popstate", listener);
      window.removeEventListener("hashchange", listener);
      window.removeEventListener("budgetflow:navigation", listener);
    };
  }, []);
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        s.profile.theme === "system"
          ? query.matches
            ? "dark"
            : "light"
          : s.profile.theme;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [s.profile.theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function go(next: Route) {
    if (route === next) window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(next);
  }
  async function installApp() {
    try {
      const result = await pwa.install();
      if (result === "manual") setDialog({ type: "install" });
      else if (result === "accepted")
        setToast("BudgetFlow is ready to open from your home screen.");
    } catch {
      setDialog({ type: "install" });
    }
  }
  function edit(change: (draft: State) => void, message?: string) {
    setS((old) => {
      const next = structuredClone(old);
      change(next);
      return next;
    });
    if (message) setToast(message);
  }
  function replace(next: State, message: string) {
    setS(next);
    setToast(message);
    go("overview");
  }
  const m = s.months[s.selectedMonth] || blankMonth(s.selectedMonth);
  const day = referenceDay(s);
  const ui: Workspace = {
    s,
    m,
    route,
    day,
    hidden,
    cash: (n) => (hidden ? "••••" : money(n)),
    go,
    edit,
    replace,
    open: setDialog,
    notify: setToast,
    installApp,
    installed: pwa.installed,
  };
  const current = navigation.find((n) => n[0] === route)?.[1] || "Your profile";
  function chooseMonth(key: string) {
    if (s.months[key])
      edit((d) => {
        d.selectedMonth = key;
      });
    else setDialog({ type: "month", month: key });
  }
  return (
    <Context.Provider value={ui}>
      <div className={`workspace workspace-${s.mode}`}>
        <a
          className="skip-link"
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("main-content")?.focus();
          }}
        >
          Skip to content
        </a>
        {s.mode === "demo" && (
          <div className="preview-banner">
            <span>
              <span className="preview-pill">EXAMPLE PLAN</span>
              <span className="banner-detail">
                Sample data · Example date: Dec 12, 2026
              </span>
            </span>
            <button
              onClick={() =>
                account.email ? account.returnToPlan() : go("signup")
              }
            >
              {account.email ? "Back to my plan" : "Start my plan"}
            </button>
          </div>
        )}
        <aside className="sidebar">
          <button
            className="brand-button"
            onClick={() => go("overview")}
            aria-label="BudgetFlow home"
          >
            <Brand />
          </button>
          <span className="workspace-label">A LITTLE MORE INTENTION</span>
          <nav aria-label="Main navigation">
            {navigation.map(([path, label, Icon]) => (
              <button
                key={path}
                className={route === path ? "active" : ""}
                aria-current={route === path ? "page" : undefined}
                onClick={() => go(path)}
              >
                <Icon size={20} strokeWidth={1.8} />
                {label}
                {route === path && <span className="nav-marker" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-grow">
            <div className="plant-drawing" aria-hidden="true">
              <Sprout size={52} strokeWidth={1.2} />
            </div>
            <h3>
              Small plans.
              <br />
              Bigger possibilities.
            </h3>
            <p>Make a little room for the life you want.</p>
            <span className="tiny-line" />
            {!pwa.installed && (
              <button
                className="sidebar-install"
                onClick={() => void installApp()}
              >
                <Smartphone size={17} /> Install BudgetFlow
              </button>
            )}
          </div>
          <button
            className={`profile-button ${route === "profile" ? "selected" : ""}`}
            onClick={() => go("profile")}
          >
            <span className="avatar">
              <AvatarFace name={s.profile.name} photo={s.profile.avatar} />
            </span>
            <span className="profile-copy">
              <b>{s.profile.name}</b>
              <small>
                {s.mode === "demo" ? "Example workspace" : "Personal workspace"}
              </small>
            </span>
            <MoreHorizontal size={19} />
          </button>
        </aside>
        <header className="topbar">
          <button
            className="mobile-brand brand-button"
            onClick={() => go("overview")}
            aria-label="BudgetFlow home"
          >
            <Brand />
          </button>
          <div className="breadcrumb">
            Your workspace<span>/</span>
            <b>{current}</b>
          </div>
          <div className="top-actions">
            <span className="top-date">{dateLabel(day, true)}</span>
            <button
              className="icon-button"
              title={hidden ? "Show amounts" : "Hide amounts"}
              aria-label={hidden ? "Show amounts" : "Hide amounts"}
              onClick={() => setHidden(!hidden)}
            >
              {hidden ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button
              className="icon-button"
              title="Change theme"
              aria-label="Change color theme"
              onClick={() =>
                edit((d) => {
                  d.profile.theme =
                    document.documentElement.dataset.theme === "dark"
                      ? "light"
                      : "dark";
                })
              }
            >
              <Sun size={20} className="theme-sun" />
              <Moon size={20} className="theme-moon" />
            </button>
            <button
              className="avatar small-avatar"
              aria-label="Your profile"
              onClick={() => go("profile")}
            >
              <AvatarFace name={s.profile.name} photo={s.profile.avatar} />
            </button>
          </div>
        </header>
        <main id="main-content" className="main" tabIndex={-1}>
          <div className="page-tools">
            <div className="month-switcher">
              <button
                aria-label="Previous month"
                className="icon-button"
                onClick={() => chooseMonth(shiftMonth(m.key, -1))}
              >
                <ChevronLeft size={18} />
              </button>
              <label className="month-input-label">
                <CalendarDays size={17} />
                <span className="month-full">{monthLabel(m.key)}</span>
                <span className="month-short">{monthLabel(m.key, true)}</span>
                <input
                  type="month"
                  value={m.key}
                  onChange={(e) => {
                    if (e.target.value) chooseMonth(e.target.value);
                  }}
                  aria-label="Planning month"
                />
              </label>
              <button
                aria-label="Next month"
                className="icon-button"
                onClick={() => chooseMonth(shiftMonth(m.key, 1))}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="text-button new-month"
              onClick={() =>
                setDialog({ type: "month", month: shiftMonth(m.key, 1) })
              }
            >
              <Plus size={16} /> New month
            </button>
          </div>
          {pwa.updateReady && (
            <div className="notice">
              <Smartphone size={18} />
              <p>A new version of BudgetFlow is ready.</p>
              <button className="text-button" onClick={pwa.update}>
                Update app
              </button>
            </div>
          )}
          {account.error && (
            <div className="notice danger" role="alert">
              <CircleAlert size={19} />
              <p>{account.error}</p>
              <button
                className="text-button"
                onClick={
                  account.status === "conflict" ? account.reload : account.retry
                }
              >
                {account.status === "conflict"
                  ? "Reload saved plan"
                  : "Retry save"}
              </button>
            </div>
          )}
          {m.closed && route !== "profile" && (
            <div className="notice">
              <LockKeyhole size={18} />
              <p>
                <b>This month is closed.</b> Its savings use received income and
                recorded spending.
              </p>
              <button
                className="text-button"
                onClick={() => setDialog({ type: "reopen" })}
              >
                Reopen month
              </button>
            </div>
          )}
          <div key={route} className="page-enter">
            {route === "overview" ? (
              <Overview />
            ) : route === "budget" ? (
              <Budget />
            ) : route === "income" ? (
              <Income />
            ) : route === "expenses" ? (
              <Expenses />
            ) : route === "savings" ? (
              <Savings />
            ) : (
              <Profile />
            )}
          </div>
          <footer className="page-footer">
            <Leaf size={14} />
            <span>A little planning. More room to live.</span>
            <button onClick={() => setDialog({ type: "about" })}>
              About BudgetFlow
            </button>
          </footer>
        </main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map(([path, label, Icon]) => (
            <button
              key={path}
              className={route === path ? "active" : ""}
              aria-current={route === path ? "page" : undefined}
              onClick={() => go(path)}
            >
              <Icon size={21} strokeWidth={route === path ? 2.2 : 1.7} />
              <span>
                {path === "budget"
                  ? "Budget"
                  : path === "income"
                    ? "Income"
                    : path === "savings"
                      ? "Goals"
                      : label}
              </span>
            </button>
          ))}
        </nav>
        {dialog && (
          <Dialogs
            key={`${dialog.type}-${"id" in dialog ? dialog.id || "" : ""}`}
            dialog={dialog}
            onClose={close}
          />
        )}
        {toast && (
          <div className="toast" role="status">
            <CircleCheck size={20} />
            <span>{toast}</span>
            <button aria-label="Dismiss message" onClick={() => setToast("")}>
              <X size={17} />
            </button>
          </div>
        )}
      </div>
    </Context.Provider>
  );
}

function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{children}</p>
      </div>
      {action && <div className="heading-actions">{action}</div>}
    </div>
  );
}
function AddExpenseButton({ small = false }: { small?: boolean }) {
  const { m, open } = useWorkspace();
  return (
    <button
      className={`primary ${small ? "small" : ""}`}
      disabled={m.closed}
      onClick={() => open({ type: "expense" })}
    >
      <Plus size={18} /> Add expense
    </button>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <div className="row between">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function SectionHeading({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}

function Overview() {
  const { s, m, cash, go, open } = useWorkspace();
  const t = totals(m);
  const monthName = monthLabel(m.key).split(" ")[0];
  const savingsPercent =
    t.forecastIncome > 0
      ? Math.max(0, Math.round((t.savings / t.forecastIncome) * 100))
      : 0;
  return (
    <>
      <PageHeading
        eyebrow="YOUR MONEY, WITH A LITTLE MORE CLARITY"
        title={`Make room for what matters, ${s.profile.name.split(" ")[0]}.`}
        action={<AddExpenseButton />}
      >
        Your {monthName} plan, all in one place.
      </PageHeading>
      <div className="overview-hero-grid">
        <section className={`savings-hero ${t.savings < 0 ? "overdrawn" : ""}`}>
          <div className="hero-content">
            <span className="hero-eyebrow">
              <span className="leaf-tag">
                <Sprout size={15} />
              </span>
              {m.closed ? "FINAL MONTHLY SAVINGS" : "YOUR SAVINGS PLAN"}
            </span>
            <div className="hero-amount" data-testid="hero-savings">
              {cash(t.savings)}
            </div>
            <p>
              {t.savings < 0
                ? "Your plan needs a little breathing room."
                : m.closed
                  ? "The money left after this month’s expenses."
                  : "A little space for your future self."}
            </p>
          </div>
          <div
            className="hero-orbit"
            aria-label={`${savingsPercent}% of forecast income planned for savings`}
          >
            <div className="orbit-ring">
              <svg viewBox="0 0 140 140" aria-hidden="true">
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="var(--hero-track)"
                  strokeWidth="7"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(100, savingsPercent) * 3.77} 377`}
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div>
                <strong>{savingsPercent}%</strong>
                <span>
                  for future
                  <br />
                  you
                </span>
              </div>
            </div>
            <span className="orbit-dot dot-one" />
            <span className="orbit-dot dot-two" />
          </div>
          <div className="hero-summary">
            <div className="hero-divider" />
            <div className="hero-bottom">
              <div>
                <span>{m.closed ? "Income received" : "Income forecast"}</span>
                <b>{cash(m.closed ? t.received : t.forecastIncome)}</b>
              </div>
              <span className="hero-math">−</span>
              <div>
                <span>{m.closed ? "Actually spent" : "For expenses"}</span>
                <b>{cash(m.closed ? t.spent : t.committed)}</b>
              </div>
            </div>
          </div>
        </section>
        <section className="cash-card">
          <div className="row between">
            <span className="eyebrow">RECEIVED MONEY</span>
            <span className="cash-icon">
              <Wallet size={20} />
            </span>
          </div>
          <h2 className={t.cashRemaining < 0 ? "negative" : ""}>
            {cash(t.cashRemaining)}
          </h2>
          <p>left after recorded expenses</p>
          <div className="cash-breakdown">
            <span>
              Received <b>{cash(t.received)}</b>
            </span>
            <span>
              Spent <b>−{cash(t.spent)}</b>
            </span>
          </div>
          <div className="soft-note">
            <span className="small-dot" />
            <span>
              {t.stillToFund > 0
                ? `${cash(t.stillToFund)} of your plan still needs funding`
                : "Your current budget is fully funded"}
            </span>
          </div>
        </section>
      </div>
      <div className="stats-grid">
        <Stat
          label="Monthly income"
          value={cash(t.forecastIncome)}
          detail={`${m.paychecks.length} paychecks · ${new Set(m.paychecks.map((p) => p.sourceId)).size} income sources`}
          icon={<CircleDollarIcon />}
        />
        <Stat
          label="Budget allocated"
          value={cash(t.budget)}
          detail={`${m.categories.length} categories with a purpose`}
          icon={<Wallet size={19} />}
        />
        <Stat
          label="Expenses so far"
          value={cash(t.spent)}
          detail={
            <>
              {t.budget > 0 ? Math.round((t.spent / t.budget) * 100) : 0}% of
              your monthly budget
            </>
          }
          icon={<ReceiptText size={19} />}
        />
      </div>
      {t.savings < 0 && (
        <div className="notice danger">
          <CircleAlert size={20} />
          <p>
            <b>{cash(t.savings)} monthly balance.</b> Reduce a budget or update
            your income to rebalance your plan.
          </p>
          <button className="text-button" onClick={() => go("budget")}>
            Review budget
          </button>
        </div>
      )}
      {s.mode === "demo" &&
        !m.closed &&
        m.key === "2026-12" &&
        !m.categories.some((c) => c.name === "Vacation to Greece") && (
          <div className="try-card">
            <div className="try-icon">
              <PlaneIcon />
            </div>
            <div className="grow">
              <b>What if Greece made it into the plan?</b>
              <p>
                Add a $1,500 vacation budget. Watch savings and every total
                update.
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => open({ type: "category", preset: "greece" })}
            >
              <Plus size={16} /> Try your example
            </button>
          </div>
        )}
      <div className="content-grid">
        <section className="panel">
          <SectionHeading
            title="A plan for every little thing"
            action={
              <button className="text-button" onClick={() => go("budget")}>
                View budget
              </button>
            }
          >
            Keep your spending in a comfortable place.
          </SectionHeading>
          {m.categories.length ? (
            <div className="budget-rows">
              {m.categories.slice(0, 4).map((c) => (
                <BudgetRow key={c.id} category={c} />
              ))}
            </div>
          ) : (
            <Empty title="Your month starts here">
              Give your first expense a budget.
              <button
                className="primary"
                onClick={() => open({ type: "category" })}
              >
                <Plus size={16} /> Add a budget
              </button>
            </Empty>
          )}
        </section>
        <section className="panel">
          <SectionHeading
            title="Your income"
            action={
              <button className="text-button" onClick={() => go("income")}>
                View all
              </button>
            }
          >
            {t.receivedCount} of {m.paychecks.length} paychecks received.
          </SectionHeading>
          <Progress
            value={
              m.paychecks.length
                ? (t.receivedCount / m.paychecks.length) * 100
                : 0
            }
            label="Income received"
          />
          <div className="paycheck-mini-list">
            {m.paychecks
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((p) => (
                <PaycheckRow paycheck={p} compact key={p.id} />
              ))}
            {!m.paychecks.length && (
              <Empty title="A payday to look forward to">
                Add your income and scheduled paydays.
              </Empty>
            )}
          </div>
        </section>
      </div>
      <section className="goals-section">
        <SectionHeading
          title="Good things take a little planning"
          action={
            <button className="text-button" onClick={() => go("savings")}>
              All savings goals
            </button>
          }
        >
          Make progress toward something that matters.
        </SectionHeading>
        <div className="goal-grid">
          {s.goals.slice(0, 2).map((g) => (
            <GoalCard key={g.id} goalId={g.id} compact />
          ))}
          {!s.goals.length && (
            <button
              className="add-goal-card"
              onClick={() => open({ type: "goal" })}
            >
              <Plus size={22} />
              <b>Something worth saving for</b>
              <span>Create your first savings goal.</span>
            </button>
          )}
        </div>
      </section>
    </>
  );
}
function CircleDollarIcon() {
  return <span className="dollar-symbol">$</span>;
}
function PlaneIcon() {
  return <CategoryIcon name="plane" color="blue" small />;
}
function BudgetRow({ category: c }: { category: Category }) {
  const { m, cash, open } = useWorkspace();
  const spent = categorySpent(m, c.id);
  const left = c.budget - spent;
  return (
    <button
      className="budget-row"
      onClick={() => open({ type: "category-detail", id: c.id })}
    >
      <CategoryIcon name={c.icon} color={c.color} small />
      <span className="grow">
        <span className="row between budget-row-heading">
          <b>{c.name}</b>
          <span>
            {cash(spent)} <small>/ {cash(c.budget)}</small>
          </span>
        </span>
        <Progress
          value={c.budget > 0 ? (spent / c.budget) * 100 : spent ? 100 : 0}
          danger={left < 0}
          color={c.color}
          label={`${c.name} spending`}
        />
      </span>
      <span className={`row-balance ${left < 0 ? "negative" : ""}`}>
        {cash(left)}
        <small>{left < 0 ? "over budget" : "left"}</small>
      </span>
    </button>
  );
}

function Budget() {
  const { m, cash, open } = useWorkspace();
  const t = totals(m);
  const [query, setQuery] = useState("");
  const categories = m.categories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="GIVE EVERY DOLLAR A PURPOSE"
        title="A month that works for you."
        action={
          <button
            className="primary"
            disabled={m.closed}
            onClick={() => open({ type: "category" })}
          >
            <Plus size={18} /> Add a budget
          </button>
        }
      >
        Plan the essentials. Leave room for the good stuff.
      </PageHeading>
      <div className="budget-summary">
        <div>
          <span>Budget allocated</span>
          <b>{cash(t.budget)}</b>
        </div>
        <div>
          <span>Spent so far</span>
          <b>{cash(t.spent)}</b>
        </div>
        <div>
          <span>Category balances</span>
          <b className={t.budget - t.spent < 0 ? "negative" : ""}>
            {cash(t.budget - t.spent)}
          </b>
        </div>
        <div className="summary-savings">
          <span>{m.closed ? "Final savings" : "Savings plan"}</span>
          <b
            className={t.savings < 0 ? "negative" : ""}
            data-testid="budget-savings"
          >
            {cash(t.savings)}
          </b>
        </div>
      </div>
      {t.overspent > 0 && (
        <div className="notice danger">
          <CircleAlert size={20} />
          <p>
            {cash(t.overspent)} of category overspending has reduced your
            savings forecast. Negative category balances stay visible.
          </p>
        </div>
      )}
      <div className="toolbar">
        <h2>
          Your categories{" "}
          <span className="count-badge">{m.categories.length}</span>
        </h2>
        <label className="search">
          <Search size={17} />
          <input
            placeholder="Find a category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Find a budget category"
          />
        </label>
      </div>
      <div className="budget-grid">
        {categories.map((c) => {
          const spent = categorySpent(m, c.id);
          const left = c.budget - spent;
          const percent =
            c.budget > 0 ? (spent / c.budget) * 100 : spent ? 100 : 0;
          return (
            <article
              className={`budget-card ${left < 0 ? "is-over" : ""}`}
              key={c.id}
            >
              <div className="row between">
                <div className="row">
                  <CategoryIcon name={c.icon} color={c.color} />
                  <h3>{c.name}</h3>
                </div>
                <button
                  className="icon-button"
                  disabled={m.closed}
                  aria-label={`Edit ${c.name} budget`}
                  onClick={() => open({ type: "category", id: c.id })}
                >
                  <Pencil size={17} />
                </button>
              </div>
              <div className="budget-numbers">
                <strong>{cash(spent)}</strong>
                <span>of {cash(c.budget)} spent</span>
              </div>
              <Progress
                value={percent}
                danger={left < 0}
                color={c.color}
                label={`${c.name} spending`}
              />
              <div className="row between budget-left">
                <span className={left < 0 ? "negative" : ""}>
                  {left < 0 && <CircleAlert size={14} />} <b>{cash(left)}</b>{" "}
                  {left < 0 ? "over budget" : "remaining"}
                </span>
                <span>{Math.round(percent)}%</span>
              </div>
              <button
                className="card-action"
                disabled={m.closed}
                onClick={() => open({ type: "expense", categoryId: c.id })}
              >
                <Plus size={16} /> Add expense
              </button>
            </article>
          );
        })}
        {!categories.length && (
          <Empty
            title={query ? "No matching categories" : "Make a little plan"}
          >
            {query
              ? "Try another name."
              : "Start with rent, groceries, or whatever matters this month."}
          </Empty>
        )}
        {!query && !m.closed && (
          <button
            className="add-budget-card"
            onClick={() => open({ type: "category" })}
          >
            <span>
              <Plus size={25} />
            </span>
            <b>Make room for something else</b>
            <small>Add a budget category</small>
          </button>
        )}
      </div>
      <div className="savings-explainer">
        <span className="category-icon green">
          <Sprout size={25} />
        </span>
        <div className="grow">
          <h3>Savings gets the rest. Automatically.</h3>
          <p>
            Your income forecast, less category budgets and any overspending.
            Edit a number and the whole plan updates. Closing a month releases
            unspent category money into its final savings.
          </p>
          <small>
            These are allocations in your plan. BudgetFlow does not move money
            between bank accounts.
          </small>
        </div>
        <strong className={t.savings < 0 ? "negative" : ""}>
          {cash(t.savings)}
        </strong>
      </div>
      <div className="closeout-row">
        <div>
          <h3>
            {m.closed
              ? "Want to make an adjustment?"
              : "Finished with this month?"}
          </h3>
          <p>
            {m.closed
              ? "Reopen it to edit income, budgets, and spending."
              : "Close it to calculate savings from what actually came in and went out."}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => open({ type: m.closed ? "reopen" : "close-month" })}
        >
          {m.closed ? <RotateCcw size={17} /> : <CheckCheck size={17} />}
          {m.closed ? "Reopen month" : "Close month"}
        </button>
      </div>
    </>
  );
}

export function PaycheckRow({
  paycheck: p,
  compact = false,
}: {
  paycheck: Paycheck;
  compact?: boolean;
}) {
  const { s, m, cash, open, day } = useWorkspace();
  const source = s.sources.find((x) => x.id === p.sourceId);
  const received = p.received !== null;
  const late = !received && p.date < day;
  return (
    <div
      className={`paycheck-row ${compact ? "compact-paycheck" : ""} ${received ? "is-received" : ""}`}
    >
      <button
        className={`paycheck-check ${received ? "checked" : ""}`}
        aria-label={`${received ? "View received" : "Mark received"}: ${source?.name || "Income"}, ${dateLabel(p.date)}`}
        aria-pressed={received}
        disabled={m.closed}
        onClick={() => open({ type: "receive", id: p.id })}
      >
        {received && <Check size={18} strokeWidth={2.5} />}
      </button>
      {!compact && (
        <div className="date-tile">
          <small>
            {new Date(`${p.date}T12:00:00Z`).toLocaleDateString("en-US", {
              month: "short",
              timeZone: "UTC",
            })}
          </small>
          <b>{Number(p.date.slice(-2))}</b>
        </div>
      )}
      <div className="grow paycheck-copy">
        <b>{source?.name || "Income"}</b>
        <span>
          {compact
            ? dateLabel(p.date)
            : p.note || "Make a plan for this payday"}
        </span>
        {!compact && (
          <span
            className={`status ${received ? "received" : late ? "awaiting" : ""}`}
          >
            {received ? <CircleCheck size={13} /> : <Clock3 size={13} />}
            {received
              ? `Received ${dateLabel(p.receivedOn || p.date)}`
              : late
                ? "Awaiting receipt"
                : `Scheduled for ${dateLabel(p.date)}`}
          </span>
        )}
      </div>
      <div className="paycheck-money">
        <b>{cash(received ? p.received! : p.expected)}</b>
        {received && p.received !== p.expected ? (
          <small>expected {cash(p.expected)}</small>
        ) : (
          <small>{received ? "received" : "expected"}</small>
        )}
      </div>
      {!compact && (
        <button
          className="icon-button"
          disabled={m.closed}
          aria-label={`Edit ${source?.name || "income"} paycheck ${dateLabel(p.date)}`}
          onClick={() => open({ type: "paycheck", id: p.id })}
        >
          <Pencil size={17} />
        </button>
      )}
    </div>
  );
}
function Income() {
  const { s, m, open, cash } = useWorkspace();
  const t = totals(m);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const list = m.paychecks
    .filter(
      (p) =>
        (sourceFilter === "all" || p.sourceId === sourceFilter) &&
        (statusFilter === "all" ||
          (statusFilter === "received"
            ? p.received !== null
            : p.received === null)),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <PageHeading
        eyebrow="EVERY SOURCE. EVERY PAYDAY."
        title="Good things coming in."
        action={
          <button
            className="primary"
            disabled={m.closed}
            onClick={() => open({ type: "income" })}
          >
            <Plus size={18} /> Add income
          </button>
        }
      >
        Plan each paycheck. Check it off when the money arrives.
      </PageHeading>
      <div className="stats-grid">
        <Stat
          label="Expected income"
          value={cash(t.expected)}
          detail={`${m.paychecks.length} scheduled paychecks`}
          icon={<CalendarDays size={19} />}
        />
        <Stat
          label="Actually received"
          value={cash(t.received)}
          detail={`${t.receivedCount} of ${m.paychecks.length} paychecks checked off`}
          icon={<CircleCheck size={19} />}
          tone="mint-stat"
        />
        <Stat
          label="Still expected"
          value={cash(t.pendingIncome)}
          detail={`${t.pending} ${t.pending === 1 ? "paycheck" : "paychecks"} left to receive`}
          icon={<Clock3 size={19} />}
        />
      </div>
      <div className="panel income-panel">
        <SectionHeading title="Your income sources">
          A full picture, even when you have more than one job.
        </SectionHeading>
        <div className="income-source-controls">
          <button
            className={`source-chip ${sourceFilter === "all" ? "selected" : ""}`}
            aria-pressed={sourceFilter === "all"}
            onClick={() => setSourceFilter("all")}
          >
            <FolderOpen size={18} /> All sources
          </button>
          <button
            className="source-chip add-source"
            disabled={m.closed}
            onClick={() => open({ type: "source" })}
          >
            <Plus size={18} /> Add source
          </button>
        </div>
        <div className="income-source-grid">
          {s.sources.map((source) => (
            <button
              key={source.id}
              className={`source-chip source-card ${sourceFilter === source.id ? "selected" : ""}`}
              aria-pressed={sourceFilter === source.id}
              onClick={() => setSourceFilter(source.id)}
            >
              <span className="source-monogram">{source.name[0]}</span>
              <span className="source-copy">
                <b>{source.name}</b>
                <small>{source.kind}</small>
              </span>
              <span className="source-total">
                {cash(
                  m.paychecks
                    .filter((p) => p.sourceId === source.id)
                    .reduce((n, p) => n + (p.received ?? p.expected), 0),
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      <section className="panel">
        <SectionHeading
          title="Income checklist"
          action={
            <select
              aria-label="Filter income status"
              className="select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All income</option>
              <option value="scheduled">Scheduled</option>
              <option value="received">Received</option>
            </select>
          }
        >
          Keep notes on what each payday is for.
        </SectionHeading>
        <div className="paycheck-list">
          {list.map((p) => (
            <PaycheckRow paycheck={p} key={p.id} />
          ))}
          {!list.length && (
            <Empty icon="work" title="A clean slate for payday">
              Add a paycheck from any income source, or change your filter.
            </Empty>
          )}
        </div>
      </section>
      <div className="inline-help">
        <Check size={18} />
        <p>
          Check a payday to record the actual amount received. If it differs
          from the estimate, your income forecast and savings update together.
          Checking it off records income once.
        </p>
      </div>
    </>
  );
}

function Expenses() {
  const { m, cash, open } = useWorkspace();
  const t = totals(m);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const list = m.expenses
    .filter(
      (e) =>
        (filter === "all" || e.categoryId === filter) &&
        `${e.note} ${m.categories.find((c) => c.id === e.categoryId)?.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const filteredTotal = list.reduce((n, e) => n + e.amount, 0);
  return (
    <>
      <PageHeading
        eyebrow="THE LITTLE THINGS ADD UP"
        title="Know where it’s going."
        action={<AddExpenseButton />}
      >
        A simple expense log that keeps your plan honest.
      </PageHeading>
      <div className="spending-head panel">
        <div>
          <span className="eyebrow">SPENT THIS MONTH</span>
          <strong>{cash(t.spent)}</strong>
          <p>{m.expenses.length} recorded expenses</p>
        </div>
        <div className="spending-progress">
          <div className="row between">
            <b>Monthly budget</b>
            <span>{cash(t.budget)}</span>
          </div>
          <Progress
            value={t.budget ? (t.spent / t.budget) * 100 : t.spent ? 100 : 0}
            danger={t.spent > t.budget}
            label="Overall spending"
          />
          <p className={t.budget - t.spent < 0 ? "negative" : ""}>
            {cash(t.budget - t.spent)}{" "}
            {t.budget - t.spent < 0
              ? "over the total budget"
              : "left across your budgets"}
          </p>
        </div>
      </div>
      <section className="panel transaction-panel">
        <div className="toolbar">
          <h2>Expense history</h2>
          <div className="row wrap">
            <label className="search">
              <Search size={17} />
              <input
                placeholder="Find an expense"
                aria-label="Find an expense"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              className="select-filter"
              aria-label="Filter expenses by category"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {m.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="transaction-table-heading">
          <span>Expense</span>
          <span>Category</span>
          <span>Date</span>
          <span>Amount</span>
          <span />
        </div>
        {list.map((e) => {
          const c = m.categories.find((c) => c.id === e.categoryId);
          return (
            <div className="transaction-row" key={e.id}>
              <div className="row">
                <CategoryIcon
                  name={c?.icon || "other"}
                  color={c?.color}
                  small
                />
                <span className="grow">
                  <b>{e.note || c?.name || "Expense"}</b>
                  <small className="mobile-only">
                    {c?.name} · {dateLabel(e.date)}
                  </small>
                </span>
              </div>
              <span className="category-tag">{c?.name}</span>
              <span className="transaction-date">{dateLabel(e.date)}</span>
              <b className="expense-amount">−{cash(e.amount)}</b>
              <button
                className="icon-button"
                disabled={m.closed}
                aria-label={`Edit expense: ${e.note || c?.name}`}
                onClick={() => open({ type: "expense", id: e.id })}
              >
                <Pencil size={16} />
              </button>
            </div>
          );
        })}
        {!list.length && (
          <Empty icon="shopping" title="Nothing recorded here yet">
            Your next expense will appear here. Logging spending updates its
            category and your savings forecast.
          </Empty>
        )}
        <div className="transaction-total">
          <span>
            {list.length} {list.length === 1 ? "expense" : "expenses"} shown
          </span>
          <b>Total: {cash(filteredTotal)}</b>
        </div>
      </section>
    </>
  );
}

export function GoalCard({
  goalId,
  compact = false,
}: {
  goalId: string;
  compact?: boolean;
}) {
  const { s, cash, open, day } = useWorkspace();
  const goal = s.goals.find((g) => g.id === goalId)!;
  const saved = goalSaved(s, goalId);
  const percent = goal.target ? (saved / goal.target) * 100 : 0;
  const complete = saved >= goal.target;
  const overdue = goal.dueDate < day && !complete;
  return (
    <article className={`goal-card ${goal.color}`}>
      <div className="row between">
        <CategoryIcon name={goal.icon} color={goal.color} />
        <span className="goal-date">
          {complete ? (
            <>
              <CircleCheck size={14} /> Goal reached
            </>
          ) : (
            <>
              <CalendarDays size={14} /> By {dateLabel(goal.dueDate, true)}
            </>
          )}
        </span>
        {!compact && (
          <button
            className="icon-button"
            aria-label={`Edit goal ${goal.name}`}
            onClick={() => open({ type: "goal", id: goal.id })}
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      <h3>{goal.name}</h3>
      <div className="goal-money">
        <b>{cash(saved)}</b>
        <span>of {cash(goal.target)}</span>
      </div>
      <Progress
        value={percent}
        color={goal.color}
        label={`${goal.name} progress`}
      />
      <div className="row between goal-foot">
        <span>{Math.floor(percent)}% set aside</span>
        <span className={overdue ? "negative" : ""}>
          {complete
            ? "You did it."
            : overdue
              ? "Target date passed"
              : `${cash(monthlyPace(goal, saved, day))}/month to stay on track`}
        </span>
      </div>
      {!compact && (
        <div className="goal-actions">
          <button
            className="secondary"
            onClick={() => open({ type: "contribution", id: goal.id })}
          >
            <Plus size={16} /> Set money aside
          </button>
          <button
            className="text-button"
            onClick={() => open({ type: "goal-history", id: goal.id })}
          >
            History
          </button>
        </div>
      )}
    </article>
  );
}
function Savings() {
  const { s, m, cash, open } = useWorkspace();
  const pool = savingsPool(s);
  const t = totals(m);
  return (
    <>
      <PageHeading
        eyebrow="FOR THE LIFE YOU’RE PLANNING"
        title="Let the good things grow."
        action={
          <button className="primary" onClick={() => open({ type: "goal" })}>
            <Plus size={18} /> New savings goal
          </button>
        }
      >
        A trip. A cushion. A new beginning. Give it a goal.
      </PageHeading>
      <div className="savings-pool">
        <div className="pool-main">
          <span className="hero-eyebrow">
            <Sprout size={18} /> CONFIRMED SAVINGS
          </span>
          <strong>{cash(pool.capacity)}</strong>
          <p>Starting savings + funded monthly savings</p>
          <small>
            Open months keep the unspent portions of budgets reserved.
          </small>
        </div>
        <div className="pool-side">
          <div>
            <span>Set aside for goals</span>
            <b>{cash(pool.assigned)}</b>
          </div>
          <div>
            <span>
              {pool.available < 0
                ? "Overassigned balance"
                : "Available to assign"}
            </span>
            <b className={pool.available < 0 ? "negative" : ""}>
              {cash(pool.available)}
            </b>
          </div>
        </div>
      </div>
      {pool.available < 0 && (
        <div className="notice danger">
          <CircleAlert size={20} />
          <p>
            Recent edits reduced your available savings. Release{" "}
            {cash(-pool.available)} from goal contributions to rebalance.
          </p>
        </div>
      )}
      <div className="savings-month-note">
        <span className="category-icon green">
          <Leaf size={23} />
        </span>
        <div>
          <h3>
            {monthLabel(m.key)}{" "}
            {m.closed ? "final savings" : "savings forecast"}:{" "}
            <span className={t.savings < 0 ? "negative" : ""}>
              {cash(t.savings)}
            </span>
          </h3>
          <p>
            {m.closed
              ? "Based on received income minus actual spending."
              : `${cash(t.fundedSavings)} is currently funded. Future paychecks contribute only after you mark them received and cover the budget.`}
          </p>
        </div>
      </div>
      <div className="goal-grid">
        {s.goals.map((goal) => (
          <GoalCard key={goal.id} goalId={goal.id} />
        ))}
        <button
          className="add-goal-card"
          onClick={() => open({ type: "goal" })}
        >
          <span className="category-icon green">
            <Plus size={27} />
          </span>
          <b>What’s your next good thing?</b>
          <span>Create a savings goal and choose a target date.</span>
        </button>
      </div>
      <div className="inline-help">
        <LockKeyhole size={18} />
        <p>
          Unallocated income flows into your general savings plan automatically.
          Goal contributions allocate confirmed savings; they don’t count as
          expenses or transfer money between bank accounts.
        </p>
      </div>
    </>
  );
}

function Profile() {
  const { s, cash, edit, open, notify, installApp, installed, go } =
    useWorkspace();
  const account = useAccount();
  function exportData() {
    const blob = new Blob([JSON.stringify(s, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BudgetFlow_Budget_${s.selectedMonth}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Your budget export is ready. Keep it somewhere private.");
  }
  return (
    <>
      <PageHeading eyebrow="YOUR LITTLE CORNER" title="Make yourself at home.">
        A few details to make your plan feel like yours.
      </PageHeading>
      <div className="profile-grid">
        <section className="panel">
          <div className="profile-intro">
            <button
              className="avatar-picker"
              aria-label={
                s.profile.avatar ? "Change profile photo" : "Add profile photo"
              }
              onClick={() => open({ type: "profile" })}
            >
              <span className="avatar big-avatar">
                <AvatarFace name={s.profile.name} photo={s.profile.avatar} />
              </span>
              <span className="avatar-picker-badge">
                <Camera size={14} />
              </span>
            </button>
            <div>
              <h2>{s.profile.name}</h2>
              <p>
                {s.mode === "demo" ? "Example profile" : "Personal profile"} ·
                USD
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => open({ type: "profile" })}
            >
              <Pencil size={16} /> Edit profile
            </button>
          </div>
          <div className="settings-row">
            <div>
              <b>Time zone</b>
              <p>Used for today’s date and goal planning.</p>
            </div>
            <span>{s.profile.timezone.replaceAll("_", " ")}</span>
          </div>
          <div className="settings-row">
            <div>
              <b>Starting savings</b>
              <p>Money already saved before you started these plans.</p>
            </div>
            <b>{cash(s.profile.openingSavings)}</b>
          </div>
          <div className="settings-row theme-row">
            <div>
              <b>A look that feels right</b>
              <p>Choose your color theme.</p>
            </div>
            <div className="theme-options">
              {(["light", "dark", "system"] as const).map((theme) => (
                <button
                  className={s.profile.theme === theme ? "selected" : ""}
                  key={theme}
                  onClick={() =>
                    edit((d) => {
                      d.profile.theme = theme;
                    })
                  }
                >
                  {theme === "light" ? (
                    <Sun size={15} />
                  ) : theme === "dark" ? (
                    <Moon size={15} />
                  ) : (
                    <span className="system-icon" />
                  )}
                  {theme[0].toUpperCase() + theme.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="panel preview-details">
          <CategoryIcon name="shield" />
          <h2>
            {s.mode === "demo"
              ? "A little look at BudgetFlow"
              : "Your private account"}
          </h2>
          <p>
            {s.mode === "demo"
              ? "You’re exploring sample data. Create an account for your own plan."
              : "Your budgets, income, expenses, and savings are saved to your account and available when you log in on another device."}
          </p>
          <button className="secondary" onClick={exportData}>
            <Download size={17} /> Export my plan
          </button>
          {account.email && (
            <>
              <p className="account-email">{account.email}</p>
              <small role="status">
                {account.status === "saved"
                  ? "All changes saved"
                  : account.status === "saving"
                    ? "Saving changes…"
                    : "Some changes have not synced"}
              </small>
              <button
                className="secondary logout-button"
                disabled={account.busy}
                onClick={() => void account.logout()}
              >
                <LockKeyhole size={17} />
                {account.busy ? "One moment…" : "Log out"}
              </button>
            </>
          )}
          {!account.email && (
            <button className="primary" onClick={() => go("login")}>
              Log in
            </button>
          )}
        </section>
      </div>
      <section className="panel workspace-actions">
        <div>
          <h3>
            {s.mode === "demo"
              ? "Ready for your own plan?"
              : "Try the example again"}
          </h3>
          <p>
            {s.mode === "demo"
              ? account.email
                ? "Your personal plan is waiting whenever you’re ready."
                : "Create an account and start with a clean month."
              : "Explore sample data, then return to your saved plan."}
          </p>
        </div>
        <button
          className="primary"
          disabled={account.busy}
          onClick={() =>
            s.mode === "demo"
              ? account.email
                ? account.returnToPlan()
                : go("signup")
              : void account.showDemo()
          }
        >
          {s.mode === "demo" ? <Plus size={17} /> : <RotateCcw size={17} />}
          {s.mode === "demo"
            ? account.email
              ? "Back to my plan"
              : "Start my plan"
            : "Explore example"}
        </button>
        {s.mode === "demo" && (
          <button
            className="secondary"
            onClick={() => open({ type: "reset-demo" })}
          >
            <RotateCcw size={17} /> Reset example
          </button>
        )}
      </section>
      {s.mode === "personal" && account.hasLegacy && (
        <section className="panel workspace-actions">
          <div>
            <h3>Your previous browser plan</h3>
            <p>
              You have a plan from an earlier version on this browser. Import it
              into this account when you’re ready.
            </p>
          </div>
          <button
            className="secondary"
            disabled={account.busy}
            onClick={account.importLegacy}
          >
            Import previous plan
          </button>
        </section>
      )}
      <section className="panel install-panel">
        <CategoryIcon name="wallet" />
        <div className="grow">
          <h3>Keep BudgetFlow on your home screen.</h3>
          <p>Open your budget like an app on your phone or computer.</p>
        </div>
        <button
          className="secondary"
          disabled={installed}
          onClick={() => void installApp()}
        >
          <Smartphone size={17} />
          {installed ? "App installed" : "Install BudgetFlow"}
        </button>
      </section>
      <div className="inline-help">
        <Sprout size={18} />
        <p>
          Your monthly plan focuses on income, budgets, expenses, and savings.
        </p>
      </div>
    </>
  );
}
