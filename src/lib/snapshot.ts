import type { State } from "./domain";
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown) => typeof v === "string" && v.length <= 2000;
const id = (v: unknown) => text(v) && !!v;
const amount = (v: unknown) =>
  typeof v === "number" &&
  Number.isSafeInteger(v) &&
  v >= 0 &&
  v <= 10_000_000_000;
const date = (v: unknown) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v));
const month = (v: unknown) =>
  typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const list = (
  v: unknown,
  check: (v: ObjectValue) => boolean,
): v is ObjectValue[] =>
  Array.isArray(v) &&
  v.length <= 10000 &&
  v.every((x) => object(x) && check(x)) &&
  new Set(v.map((x) => x.id)).size === v.length;

/** Validate remote and legacy snapshots before financial calculations use them. */
export function isState(v: unknown): v is State {
  if (
    !object(v) ||
    v.version !== 1 ||
    !["demo", "personal"].includes(v.mode as string) ||
    !month(v.selectedMonth) ||
    !object(v.profile) ||
    !object(v.months)
  )
    return false;
  const p = v.profile;
  if (
    !id(p.name) ||
    !["light", "dark", "system"].includes(p.theme as string) ||
    !amount(p.openingSavings) ||
    !id(p.timezone)
  )
    return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: p.timezone as string });
  } catch {
    return false;
  }
  if (
    !list(v.sources, (x) => id(x.id) && id(x.name) && text(x.kind)) ||
    !list(
      v.goals,
      (x) =>
        id(x.id) &&
        id(x.name) &&
        amount(x.target) &&
        date(x.dueDate) &&
        id(x.icon) &&
        id(x.color),
    ) ||
    !list(
      v.contributions,
      (x) => id(x.id) && id(x.goalId) && amount(x.amount) && date(x.date),
    )
  )
    return false;
  const sources = new Set(v.sources.map((x) => x.id));
  const goals = new Set(v.goals.map((x) => x.id));
  if (v.contributions.some((x) => !goals.has(x.goalId))) return false;
  const entries = Object.entries(v.months);
  if (
    !entries.length ||
    entries.length > 1200 ||
    !v.months[v.selectedMonth as string]
  )
    return false;
  for (const [key, m] of entries) {
    if (
      !month(key) ||
      !object(m) ||
      m.key !== key ||
      typeof m.closed !== "boolean"
    )
      return false;
    if (
      !list(
        m.categories,
        (x) =>
          id(x.id) &&
          id(x.name) &&
          amount(x.budget) &&
          id(x.icon) &&
          id(x.color),
      )
    )
      return false;
    if (
      !list(
        m.paychecks,
        (x) =>
          id(x.id) &&
          sources.has(x.sourceId) &&
          date(x.date) &&
          amount(x.expected) &&
          (x.received === null || amount(x.received)) &&
          (x.receivedOn === null || date(x.receivedOn)) &&
          (x.received === null) === (x.receivedOn === null) &&
          text(x.note),
      )
    )
      return false;
    const categories = new Set(m.categories.map((x) => x.id));
    if (
      !list(
        m.expenses,
        (x) =>
          id(x.id) &&
          categories.has(x.categoryId) &&
          amount(x.amount) &&
          date(x.date) &&
          text(x.note),
      )
    )
      return false;
  }
  return JSON.stringify(v).length < 1_900_000;
}
export function legacyPlan(): State | null {
  try {
    const raw =
      localStorage.getItem("budgetflow.workspace.v1") ||
      localStorage.getItem("tend.budget.v1");
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isState(value) && value.mode === "personal" ? value : null;
  } catch {
    return null;
  }
}
