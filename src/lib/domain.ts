export type MonthKey = string;
export type Theme = "light" | "dark" | "system";
export type Cadence =
  "once" | "weekly" | "biweekly" | "semimonthly" | "monthly";
export type IncomeSource = { id: string; name: string; kind: string };
export type Paycheck = {
  id: string;
  sourceId: string;
  date: string;
  expected: number;
  received: number | null;
  receivedOn: string | null;
  note: string;
};
export type Category = {
  id: string;
  name: string;
  budget: number;
  color: string;
  icon: string;
};
export type Expense = {
  id: string;
  categoryId: string;
  amount: number;
  date: string;
  note: string;
};
export type Month = {
  key: MonthKey;
  closed: boolean;
  paychecks: Paycheck[];
  categories: Category[];
  expenses: Expense[];
};
export type Goal = {
  id: string;
  name: string;
  target: number;
  dueDate: string;
  icon: string;
  color: string;
};
export type Contribution = {
  id: string;
  goalId: string;
  amount: number;
  date: string;
};
export type State = {
  version: 1;
  mode: "demo" | "personal";
  selectedMonth: MonthKey;
  profile: {
    name: string;
    theme: Theme;
    openingSavings: number;
    timezone: string;
  };
  sources: IncomeSource[];
  months: Record<MonthKey, Month>;
  goals: Goal[];
  contributions: Contribution[];
};
export const colors = ["green", "blue", "purple", "orange", "pink", "teal"];
export const uid = () => crypto.randomUUID();
export function toCents(value: string): number {
  const s = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(s))
    throw new Error("Enter a valid amount with up to two decimal places.");
  const [whole, fraction = ""] = s.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_00)
    throw new Error("Enter an amount below $100,000,000.");
  return cents;
}
export const dollars = (n: number) => (n / 100).toFixed(2);
export const money = (n: number, decimals = false) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals || n % 100 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n / 100);
export function today(
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export const referenceDay = (s: State) =>
  s.mode === "demo" ? "2026-12-12" : today(s.profile.timezone);
export const monthLabel = (key: string, short = false) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString("en-US", {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
export const dateLabel = (date: string, year = false) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" as const } : {}),
    timeZone: "UTC",
  });
export function shiftMonth(key: string, step: number) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + step, 1)).toISOString().slice(0, 7);
}
export const monthEnd = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
export function addDays(date: string, count: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
export function scheduleDates(
  first: string,
  cadence: Cadence,
  count: number,
  key: string,
): string[] {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(first) ||
    first.slice(0, 7) !== key ||
    first > monthEnd(key)
  )
    throw new Error("Choose a valid first payday in this month.");
  if (!Number.isInteger(count) || count < 1 || count > 31)
    throw new Error("Choose between 1 and 31 paychecks.");
  const dates: string[] = [];
  const startDay = Number(first.slice(-2));
  for (let i = 0; i < (cadence === "once" ? 1 : count); i++) {
    let d = first;
    if (cadence === "weekly") d = addDays(first, i * 7);
    if (cadence === "biweekly") d = addDays(first, i * 14);
    if (cadence === "monthly")
      d = `${shiftMonth(key, i)}-${String(Math.min(startDay, Number(monthEnd(shiftMonth(key, i)).slice(-2)))).padStart(2, "0")}`;
    if (cadence === "semimonthly") {
      if (startDay > 15)
        throw new Error(
          "For twice monthly, start on a day from the 1st through the 15th. The second payday is 15 days later.",
        );
      const m = shiftMonth(key, Math.floor(i / 2));
      d = `${m}-${String(Math.min(startDay + (i % 2) * 15, Number(monthEnd(m).slice(-2)))).padStart(2, "0")}`;
    }
    if (d.slice(0, 7) === key && !dates.includes(d)) dates.push(d);
  }
  return dates;
}
export function categorySpent(m: Month, id: string) {
  return m.expenses
    .filter((e) => e.categoryId === id)
    .reduce((n, e) => n + e.amount, 0);
}
export function totals(m: Month) {
  const expected = m.paychecks.reduce((n, p) => n + p.expected, 0);
  const received = m.paychecks.reduce((n, p) => n + (p.received ?? 0), 0);
  const forecastIncome = m.paychecks.reduce(
    (n, p) => n + (p.received ?? p.expected),
    0,
  );
  const budget = m.categories.reduce((n, c) => n + c.budget, 0);
  const spent = m.expenses.reduce((n, e) => n + e.amount, 0);
  const committed = m.categories.reduce(
    (n, c) => n + Math.max(c.budget, categorySpent(m, c.id)),
    0,
  );
  const overspent = committed - budget;
  const reserved = committed - spent;
  const plannedSavings = forecastIncome - committed;
  const fundedSavings = m.closed
    ? received - spent
    : Math.max(0, received - committed) + Math.min(0, received - spent);
  return {
    expected,
    received,
    forecastIncome,
    budget,
    spent,
    committed,
    overspent,
    reserved,
    plannedSavings,
    savings: m.closed ? received - spent : plannedSavings,
    fundedSavings,
    cashRemaining: received - spent,
    stillToFund: Math.max(0, committed - Math.max(received, spent)),
    pending: m.paychecks.filter((p) => p.received === null).length,
    receivedCount: m.paychecks.filter((p) => p.received !== null).length,
    pendingIncome: m.paychecks
      .filter((p) => p.received === null)
      .reduce((n, p) => n + p.expected, 0),
  };
}
export const goalSaved = (s: State, id: string) =>
  s.contributions
    .filter((c) => c.goalId === id)
    .reduce((n, c) => n + c.amount, 0);
export function savingsPool(s: State) {
  const capacity =
    s.profile.openingSavings +
    Object.values(s.months).reduce((n, m) => n + totals(m).fundedSavings, 0);
  const assigned = s.contributions.reduce((n, c) => n + c.amount, 0);
  return { capacity, assigned, available: capacity - assigned };
}
export function monthlyPace(goal: Goal, saved: number, day: string): number {
  const [y, m] = day.slice(0, 7).split("-").map(Number);
  const [gy, gm] = goal.dueDate.slice(0, 7).split("-").map(Number);
  const count = Math.max(1, (gy - y) * 12 + gm - m + 1);
  return Math.ceil(Math.max(0, goal.target - saved) / count);
}
export const blankMonth = (key: string): Month => ({
  key,
  closed: false,
  paychecks: [],
  categories: [],
  expenses: [],
});
export function copyBudgets(from: Month, key: string): Month {
  return {
    ...blankMonth(key),
    categories: from.categories.map((c) => ({ ...c, id: uid() })),
  };
}
export function blankState(
  name: string,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): State {
  const key = today(timezone).slice(0, 7);
  return {
    version: 1,
    mode: "personal",
    selectedMonth: key,
    profile: { name, theme: "light", openingSavings: 0, timezone },
    sources: [],
    months: { [key]: blankMonth(key) },
    goals: [],
    contributions: [],
  };
}
