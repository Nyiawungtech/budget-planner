import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  CircleAlert,
  Sprout,
  RotateCcw,
  CalendarDays,
  CheckCheck,
  Camera,
} from "lucide-react";
import { useWorkspace } from "./App";
import {
  AvatarFace,
  CategoryIcon,
  Empty,
  Field,
  Modal,
  Progress,
  icons,
} from "./ui";
import { PHOTO_TYPES, prepareProfilePhoto } from "./lib/profile-photo";
import { isState } from "./lib/snapshot";
import {
  blankMonth,
  categorySpent,
  colors,
  copyBudgets,
  dateLabel,
  dollars,
  goalSaved,
  isCalendarDate,
  money,
  monthEnd,
  monthLabel,
  savingsPool,
  scheduleDates,
  shiftMonth,
  toCents,
  totals,
  uid,
  validateReceiptDate,
  type Cadence,
} from "./lib/domain";
import { demoState } from "./lib/demo";

export type DialogState = {
  type:
    | "category"
    | "category-detail"
    | "delete-category"
    | "expense"
    | "delete-expense"
    | "income"
    | "source"
    | "paycheck"
    | "delete-paycheck"
    | "receive"
    | "undo-receipt"
    | "month"
    | "close-month"
    | "reopen"
    | "goal"
    | "delete-goal"
    | "contribution"
    | "goal-history"
    | "release-contribution"
    | "profile"
    | "reset-demo"
    | "about"
    | "install";
  id?: string;
  categoryId?: string;
  preset?: string;
  month?: string;
};
type DialogProps = { dialog: DialogState; onClose: () => void };
const str = (data: FormData, key: string) => String(data.get(key) || "").trim();
function positive(data: FormData, key = "amount") {
  const amount = toCents(str(data, key));
  if (amount <= 0) throw new Error("Enter an amount greater than zero.");
  return amount;
}
function inMonth(date: string, month: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    date.slice(0, 7) !== month ||
    date > monthEnd(month) ||
    date < `${month}-01`
  )
    throw new Error("Choose a valid date in this planning month.");
}
function Amount({
  name = "amount",
  cents,
  placeholder = "0.00",
  required = true,
}: {
  name?: string;
  cents?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <span className="amount-input">
      <span>$</span>
      <input
        name={name}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        defaultValue={cents === undefined ? "" : dollars(cents)}
        required={required}
        maxLength={13}
        onFocus={(e) => e.target.select()}
      />
    </span>
  );
}
function Form({
  children,
  onSave,
  onClose,
  label = "Save changes",
  disabled = false,
  extra,
}: {
  children: ReactNode;
  onSave: (data: FormData) => void;
  onClose: () => void;
  label?: string;
  disabled?: boolean;
  extra?: ReactNode;
}) {
  const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      onSave(new FormData(e.currentTarget));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please check your details.");
    }
  }
  return (
    <form onSubmit={submit} className="dialog-form">
      {children}
      {error && (
        <div className="form-error" role="alert">
          <CircleAlert size={18} />
          {error}
        </div>
      )}
      <div className="form-actions">
        {extra && <span className="form-extra">{extra}</span>}
        <button type="button" className="ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="primary" type="submit" disabled={disabled}>
          {label}
        </button>
      </div>
    </form>
  );
}
function AppearanceFields({
  icon = "other",
  color = "green",
}: {
  icon?: string;
  color?: string;
}) {
  return (
    <>
      <Field label="Icon">
        <select name="icon" defaultValue={icon}>
          {Object.keys(icons).map((name) => (
            <option key={name} value={name}>
              {
                (
                  {
                    home: "Home",
                    groceries: "Groceries",
                    car: "Transport",
                    coffee: "Food & coffee",
                    heart: "Family & giving",
                    shopping: "Shopping",
                    utilities: "Utilities",
                    sun: "Lifestyle",
                    plane: "Travel",
                    shield: "Emergency fund",
                    wallet: "Wallet",
                    target: "Goal",
                    gift: "Gift",
                    work: "Work",
                    other: "Other",
                  } as Record<string, string>
                )[name]
              }
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="color-field">
        <legend>Category color</legend>
        <div>
          {colors.map((c) => (
            <label className={`color-choice ${c}`} key={c}>
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={c === color}
              />
              <span aria-label={c}>
                <Check size={16} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  );
}
export function Dialogs({ dialog, onClose }: DialogProps) {
  const common = { dialog, onClose };
  switch (dialog.type) {
    case "category":
      return <CategoryForm {...common} />;
    case "category-detail":
      return <CategoryDetail {...common} />;
    case "expense":
      return <ExpenseForm {...common} />;
    case "income":
      return <IncomeForm {...common} />;
    case "source":
      return <SourceForm {...common} />;
    case "paycheck":
      return <PaycheckForm {...common} />;
    case "receive":
      return <ReceiveForm {...common} />;
    case "month":
      return <MonthForm {...common} />;
    case "goal":
      return <GoalForm {...common} />;
    case "contribution":
      return <ContributionForm {...common} />;
    case "goal-history":
      return <GoalHistory {...common} />;
    case "profile":
      return <ProfileForm {...common} />;
    case "install":
      return (
        <Modal
          title="Your budget. One tap away."
          subtitle="Install BudgetFlow"
          onClose={onClose}
        >
          <div className="about-body">
            <CategoryIcon name="wallet" />
            <p>
              Add BudgetFlow to your home screen to open it in its own app
              window.
            </p>
            <div className="soft-box">
              <b>iPhone or iPad</b>
              <p>
                Open this page in Safari, tap Share, then Add to Home Screen.
              </p>
            </div>
            <div className="soft-box">
              <b>Android or desktop</b>
              <p>
                Open your browser menu and choose Install app or Add to Home
                Screen. An install button may also appear in the address bar.
              </p>
            </div>
            <small>
              Log in to access your saved plan. Installing the app does not move
              money or connect to a bank.
            </small>
            <button className="primary" onClick={onClose}>
              Got it
            </button>
          </div>
        </Modal>
      );
    case "about":
      return (
        <Modal
          title="A little more about BudgetFlow."
          subtitle="Monthly budgeting, with room to breathe."
          onClose={onClose}
        >
          <div className="about-body">
            <div className="about-brand">
              <Sprout size={40} strokeWidth={1.3} />
            </div>
            <p>
              Create monthly plans, track multiple income sources, check off
              paychecks, record spending, and give your savings a purpose.
            </p>
            <div className="soft-box">
              <b>A private plan, wherever you log in.</b>
              <p>
                Log in to save your profile, monthly plans, and goals to your
                account. The example uses sample data and stays separate from
                your personal plan.
              </p>
            </div>
            <p>
              Savings are allocations in your plan. No money is transferred
              between bank accounts.
            </p>
            <small>
              Plan your income, track expenses, and make room for your goals.
            </small>
            <button className="primary" onClick={onClose}>
              Back to my plan
            </button>
          </div>
        </Modal>
      );
    default:
      return <ConfirmDialog {...common} />;
  }
}

function CategoryForm({ dialog, onClose }: DialogProps) {
  const { m, open, edit, cash } = useWorkspace();
  const existing = m.categories.find((c) => c.id === dialog.id);
  const greece = dialog.preset === "greece";
  const t = totals(m);
  const [amount, setAmount] = useState(
    dollars(existing?.budget ?? (greece ? 150000 : 0)),
  );
  let nextSavings = t.savings;
  try {
    const newBudget = toCents(amount);
    const spent = existing ? categorySpent(m, existing.id) : 0;
    nextSavings =
      t.plannedSavings +
      (existing ? Math.max(existing.budget, spent) : 0) -
      Math.max(newBudget, spent);
  } catch {
    /* Show current forecast until input is valid. */
  }
  return (
    <Modal
      title={
        existing ? "A little change to the plan." : "Make room for something."
      }
      subtitle={`${monthLabel(m.key)} · Budget category`}
      onClose={onClose}
    >
      <Form
        onClose={onClose}
        label={existing ? "Update budget" : "Add to my plan"}
        disabled={m.closed}
        extra={
          existing && (
            <button
              type="button"
              className="danger-link"
              onClick={() => open({ type: "delete-category", id: existing.id })}
            >
              <Trash2 size={16} /> Remove
            </button>
          )
        }
        onSave={(data) => {
          const name = str(data, "name");
          const budget = toCents(str(data, "amount"));
          if (!name) throw new Error("Give this budget a name.");
          if (
            m.categories.some(
              (c) =>
                c.id !== existing?.id &&
                c.name.toLowerCase() === name.toLowerCase(),
            )
          )
            throw new Error(
              "A budget with that name already exists this month.",
            );
          const category = {
            id: existing?.id || uid(),
            name,
            budget,
            icon: str(data, "icon"),
            color: str(data, "color"),
          };
          edit((d) => {
            if (existing)
              d.months[m.key].categories = d.months[m.key].categories.map(
                (c) => (c.id === existing.id ? category : c),
              );
            else d.months[m.key].categories.push(category);
          }, "Budget updated. Your savings and totals have been recalculated.");
        }}
      >
        <Field label="What are you planning for?">
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={
              existing?.name || (greece ? "Vacation to Greece" : "")
            }
            placeholder="e.g. Rent, groceries, vacation to Greece"
          />
        </Field>
        <Field label="Monthly budget">
          <span className="amount-input">
            <span>$</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              maxLength={13}
            />
          </span>
        </Field>
        <AppearanceFields
          icon={existing?.icon || (greece ? "plane" : "other")}
          color={existing?.color || (greece ? "blue" : "green")}
        />
        <div
          className={`form-forecast ${nextSavings < 0 ? "negative-box" : ""}`}
        >
          <Sprout size={20} />
          <div>
            <span>Your updated savings plan</span>
            <b>{cash(nextSavings)}</b>
          </div>
          <small>
            {nextSavings < 0
              ? "This plan is overallocated."
              : "Updates everywhere when you save."}
          </small>
        </div>
      </Form>
    </Modal>
  );
}
function CategoryDetail({ dialog, onClose }: DialogProps) {
  const { m, open, cash } = useWorkspace();
  const c = m.categories.find((x) => x.id === dialog.id);
  if (!c) return null;
  const spent = categorySpent(m, c.id);
  const expenses = m.expenses
    .filter((e) => e.categoryId === c.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Modal
      title={c.name}
      subtitle={`${monthLabel(m.key)} · Budget details`}
      onClose={onClose}
    >
      <div className="category-detail">
        <CategoryIcon name={c.icon} color={c.color} />
        <div className="detail-numbers">
          <span>
            Spent <b>{cash(spent)}</b>
          </span>
          <span>
            Budget <b>{cash(c.budget)}</b>
          </span>
          <span>
            Balance{" "}
            <b className={c.budget - spent < 0 ? "negative" : ""}>
              {cash(c.budget - spent)}
            </b>
          </span>
        </div>
        <Progress
          value={c.budget ? (spent / c.budget) * 100 : spent ? 100 : 0}
          danger={spent > c.budget}
          color={c.color}
          label={`${c.name} spending`}
        />
        <div className="row">
          <button
            className="primary"
            disabled={m.closed}
            onClick={() => open({ type: "expense", categoryId: c.id })}
          >
            <Plus size={16} /> Add expense
          </button>
          <button
            className="secondary"
            disabled={m.closed}
            onClick={() => open({ type: "category", id: c.id })}
          >
            <Pencil size={16} /> Edit budget
          </button>
        </div>
        <h3>Expenses in this category</h3>
        {expenses.map((e) => (
          <button
            key={e.id}
            className="history-row"
            disabled={m.closed}
            onClick={() => open({ type: "expense", id: e.id })}
          >
            <span>
              <b>{e.note || "Expense"}</b>
              <small>{dateLabel(e.date)}</small>
            </span>
            <b>−{cash(e.amount)}</b>
          </button>
        ))}
        {!expenses.length && <p className="muted">Nothing spent here yet.</p>}
      </div>
    </Modal>
  );
}

function ExpenseForm({ dialog, onClose }: DialogProps) {
  const { m, open, edit, day } = useWorkspace();
  const expense = m.expenses.find((e) => e.id === dialog.id);
  if (!m.categories.length)
    return (
      <Modal title="Start with a budget." onClose={onClose}>
        <Empty title="Give your spending a place">
          Add a category before recording your first expense.
        </Empty>
        <button
          className="primary full-width"
          onClick={() => open({ type: "category" })}
        >
          <Plus size={18} /> Add a budget
        </button>
      </Modal>
    );
  const defaultDate =
    day.slice(0, 7) === m.key
      ? day
      : day.slice(0, 7) > m.key
        ? monthEnd(m.key)
        : `${m.key}-01`;
  return (
    <Modal
      title={expense ? "Update your expense." : "The little things add up."}
      subtitle={`${monthLabel(m.key)} · ${expense ? "Edit expense" : "Log an expense"}`}
      onClose={onClose}
    >
      <Form
        onClose={onClose}
        label={expense ? "Update expense" : "Add expense"}
        disabled={m.closed}
        extra={
          expense && (
            <button
              type="button"
              className="danger-link"
              onClick={() => open({ type: "delete-expense", id: expense.id })}
            >
              <Trash2 size={16} /> Delete
            </button>
          )
        }
        onSave={(data) => {
          const amount = positive(data);
          const date = str(data, "date");
          inMonth(date, m.key);
          const categoryId = str(data, "category");
          if (!m.categories.some((c) => c.id === categoryId))
            throw new Error("Choose a budget category.");
          const entry = {
            id: expense?.id || uid(),
            amount,
            categoryId,
            date,
            note: str(data, "note"),
          };
          edit((d) => {
            const month = d.months[m.key];
            if (expense)
              month.expenses = month.expenses.map((e) =>
                e.id === expense.id ? entry : e,
              );
            else month.expenses.push(entry);
          }, "Expense saved. Your category balance and savings are up to date.");
        }}
      >
        <Field label="How much?">
          <Amount cents={expense?.amount} />
        </Field>
        <Field label="Budget category">
          <select
            name="category"
            defaultValue={
              expense?.categoryId || dialog.categoryId || m.categories[0].id
            }
          >
            {m.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input
            type="date"
            name="date"
            defaultValue={expense?.date || defaultDate}
            min={`${m.key}-01`}
            max={monthEnd(m.key)}
            required
          />
        </Field>
        <Field label="A little note (optional)">
          <input
            name="note"
            maxLength={120}
            defaultValue={expense?.note}
            placeholder="e.g. Groceries for the week"
          />
        </Field>
        <div className="soft-box small">
          Going over a category budget shows a negative balance and reduces your
          savings forecast automatically.
        </div>
      </Form>
    </Modal>
  );
}

function IncomeForm({ onClose }: DialogProps) {
  const { s, m, edit, day, cash } = useWorkspace();
  const [source, setSource] = useState(s.sources[0]?.id || "_new");
  const [cadence, setCadence] = useState<Cadence>("once");
  const [first, setFirst] = useState(
    day.slice(0, 7) === m.key ? day : `${m.key}-01`,
  );
  const [count, setCount] = useState(4);
  const [amount, setAmount] = useState("");
  let dates: string[] = [];
  let previewError = "";
  let previewTotal = 0;
  try {
    dates = scheduleDates(first, cadence, count);
    if (amount) previewTotal = toCents(amount) * dates.length;
  } catch (e) {
    previewError = (e as Error).message;
  }
  return (
    <Modal
      title="Good things coming in."
      subtitle={`Add income to ${monthLabel(m.key)}`}
      onClose={onClose}
    >
      <Form
        label="Add income to plan"
        onClose={onClose}
        disabled={m.closed}
        onSave={(data) => {
          const value = positive(data);
          const scheduled = scheduleDates(first, cadence, count);
          let sourceId = source;
          let newSource = null;
          if (source === "_new") {
            const name = str(data, "sourceName");
            if (!name) throw new Error("Name your income source.");
            const found = s.sources.find(
              (x) => x.name.toLowerCase() === name.toLowerCase(),
            );
            sourceId = found?.id || uid();
            if (!found)
              newSource = { id: sourceId, name, kind: str(data, "kind") };
          }
          const note = str(data, "note");
          edit(
            (d) => {
              if (newSource) d.sources.push(newSource);
              for (const date of scheduled)
                d.months[m.key].paychecks.push({
                  id: uid(),
                  sourceId,
                  date,
                  expected: value,
                  received: null,
                  receivedOn: null,
                  note,
                });
            },
            `${scheduled.length} ${scheduled.length === 1 ? "paycheck" : "paychecks"} added. Your income and savings plan have updated.`,
          );
        }}
      >
        <Field label="Income source">
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {s.sources.map((x) => (
              <option value={x.id} key={x.id}>
                {x.name}
              </option>
            ))}
            <option value="_new">+ Add a new source</option>
          </select>
        </Field>
        {source === "_new" && (
          <div className="form-grid">
            <Field label="Source name">
              <input
                name="sourceName"
                placeholder="e.g. Primary job"
                maxLength={80}
                required
              />
            </Field>
            <Field label="Income type">
              <select name="kind">
                <option>Paycheck</option>
                <option>Side income</option>
                <option>Business</option>
                <option>Benefits</option>
                <option>Other</option>
              </select>
            </Field>
          </div>
        )}
        <Field label="Amount per paycheck">
          <span className="amount-input">
            <span>$</span>
            <input
              name="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              maxLength={13}
              required
            />
          </span>
        </Field>
        <div className="form-grid income-schedule-fields">
          <Field
            label="First payday"
            hint="Can be in a different month from your plan."
          >
            <input
              type="date"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              required
            />
          </Field>
          <Field label="Frequency">
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as Cadence)}
            >
              <option value="once">One time</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="semimonthly">Twice monthly (+15 days)</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
        </div>
        {cadence !== "once" && (
          <Field
            label="Number of paychecks to generate"
            hint="Only dates in the first payday’s calendar month are added. The preview shows exactly what will be saved."
          >
            <input
              type="number"
              min={1}
              max={31}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              required
            />
          </Field>
        )}
        <Field label="What is this payday for? (optional)">
          <textarea
            name="note"
            rows={2}
            maxLength={160}
            placeholder="Rent, family, savings…"
          />
        </Field>
        {previewError ? (
          <p className="negative small">{previewError}</p>
        ) : (
          <div className="schedule-preview">
            <div className="row between">
              <b>
                {dates.length} {dates.length === 1 ? "payday" : "paydays"} in{" "}
                {monthLabel(first.slice(0, 7), true)}
              </b>
              <strong>{cash(previewTotal)}</strong>
            </div>
            <div>
              {dates.map((date) => (
                <span key={date}>
                  <CalendarDays size={13} />
                  {dateLabel(date, true)}
                </span>
              ))}
            </div>
            <small>
              Counts toward your {monthLabel(m.key)} plan, even if received in
              another month. Check off each payday when the money arrives.
            </small>
          </div>
        )}
      </Form>
    </Modal>
  );
}
function SourceForm({ onClose }: DialogProps) {
  const { s, edit } = useWorkspace();
  return (
    <Modal
      title="Every source counts."
      subtitle="Add an income source"
      onClose={onClose}
    >
      <Form
        label="Add source"
        onClose={onClose}
        onSave={(data) => {
          const name = str(data, "name");
          if (!name) throw new Error("Enter an income source name.");
          if (
            s.sources.some((x) => x.name.toLowerCase() === name.toLowerCase())
          )
            throw new Error("That income source already exists.");
          edit((d) => {
            d.sources.push({ id: uid(), name, kind: str(data, "kind") });
          }, "Income source added. You can now schedule its paychecks.");
        }}
      >
        <Field label="Source name">
          <input
            name="name"
            required
            maxLength={80}
            placeholder="e.g. Primary job, freelance work"
          />
        </Field>
        <Field label="Income type">
          <select name="kind">
            <option>Paycheck</option>
            <option>Side income</option>
            <option>Business</option>
            <option>Benefits</option>
            <option>Other</option>
          </select>
        </Field>
      </Form>
    </Modal>
  );
}
function PaycheckForm({ dialog, onClose }: DialogProps) {
  const { s, m, edit, open } = useWorkspace();
  const p = m.paychecks.find((x) => x.id === dialog.id);
  if (!p) return null;
  return (
    <Modal
      title="Fine-tune your payday."
      subtitle="Edit planned income"
      onClose={onClose}
    >
      <Form
        label="Update paycheck"
        onClose={onClose}
        disabled={m.closed}
        extra={
          <button
            type="button"
            className="danger-link"
            onClick={() => open({ type: "delete-paycheck", id: p.id })}
          >
            <Trash2 size={16} /> Delete
          </button>
        }
        onSave={(data) => {
          const expected = positive(data);
          const date = str(data, "date");
          if (!isCalendarDate(date))
            throw new Error("Choose a valid planned payday.");
          edit((d) => {
            const item = d.months[m.key].paychecks.find((x) => x.id === p.id)!;
            Object.assign(item, {
              expected,
              date,
              sourceId: str(data, "source"),
              note: str(data, "note"),
            });
          }, "Paycheck updated.");
        }}
      >
        <Field label="Income source">
          <select name="source" defaultValue={p.sourceId}>
            {s.sources.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expected amount">
          <Amount cents={p.expected} />
        </Field>
        <Field
          label="Planned payday"
          hint={`Stays in your ${monthLabel(m.key)} plan, even with a different payday month.`}
        >
          <input
            type="date"
            name="date"
            required
            defaultValue={p.date}
          />
        </Field>
        <Field label="Paycheck note">
          <textarea
            name="note"
            rows={2}
            maxLength={160}
            defaultValue={p.note}
          />
        </Field>
        {p.received !== null && (
          <div className="soft-box small">
            This paycheck has been received.{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => open({ type: "receive", id: p.id })}
            >
              Edit the actual receipt
            </button>
          </div>
        )}
      </Form>
    </Modal>
  );
}
function ReceiveForm({ dialog, onClose }: DialogProps) {
  const { s, m, day, edit, open, cash } = useWorkspace();
  const p = m.paychecks.find((x) => x.id === dialog.id);
  if (!p) return null;
  const received = p.received !== null;
  const receiptDate = p.receivedOn || day;
  return (
    <Modal
      title={received ? "Your payday, checked off." : "Payday has arrived."}
      subtitle={`${s.sources.find((x) => x.id === p.sourceId)?.name} · Scheduled ${dateLabel(p.date, true)}`}
      onClose={onClose}
    >
      <Form
        label={received ? "Update receipt" : "Mark as received"}
        onClose={onClose}
        disabled={m.closed}
        extra={
          received && (
            <button
              type="button"
              className="danger-link"
              onClick={() => open({ type: "undo-receipt", id: p.id })}
            >
              <RotateCcw size={16} /> Undo receipt
            </button>
          )
        }
        onSave={(data) => {
          const amount = positive(data);
          const date = str(data, "date");
          validateReceiptDate(date, day);
          edit(
            (d) => {
              const item = d.months[m.key].paychecks.find(
                (x) => x.id === p.id,
              )!;
              item.received = amount;
              item.receivedOn = date;
            },
            received
              ? "Receipt updated. Income and savings have recalculated."
              : "Paycheck received. One more little step forward.",
          );
        }}
      >
        <div className="receipt-expected">
          <span>Expected paycheck</span>
          <b>{cash(p.expected)}</b>
        </div>
        <Field label="Amount actually received">
          <Amount cents={p.received ?? p.expected} />
        </Field>
        <Field label="Received date">
          <input
            type="date"
            name="date"
            required
            defaultValue={receiptDate}
            max={day}
          />
        </Field>
        <div className="soft-box small">
          This receipt counts toward your {monthLabel(m.key)} plan, even if the
          money arrived in another month. Your forecast uses the actual amount.
          Editing a receipt replaces it, so it is never counted twice.
        </div>
      </Form>
    </Modal>
  );
}

function MonthForm({ dialog, onClose }: DialogProps) {
  const { s, m, edit } = useWorkspace();
  const [key, setKey] = useState(dialog.month || shiftMonth(m.key, 1));
  const [copy, setCopy] = useState(m.categories.length > 0);
  const exists = !!s.months[key];
  return (
    <Modal
      title="A fresh month. A fresh plan."
      subtitle="Every month gets its own income, budgets, and spending."
      onClose={onClose}
    >
      <Form
        onClose={onClose}
        label={exists ? "Open this month" : "Create monthly plan"}
        onSave={() => {
          if (!/^\d{4}-\d{2}$/.test(key) || key < "2000-01" || key > "2100-12")
            throw new Error("Choose a month between 2000 and 2100.");
          edit(
            (d) => {
              if (!d.months[key])
                d.months[key] = copy ? copyBudgets(m, key) : blankMonth(key);
              d.selectedMonth = key;
            },
            exists ? "Monthly plan opened." : "A fresh monthly plan is ready.",
          );
        }}
      >
        <Field label="Which month?">
          <input
            type="month"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            min="2000-01"
            max="2100-12"
            required
          />
        </Field>
        {exists ? (
          <div className="soft-box">
            You already have a plan for {monthLabel(key)}. Your existing
            information will be opened.
          </div>
        ) : (
          <>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={copy}
                onChange={(e) => setCopy(e.target.checked)}
              />
              <span>
                <b>Bring my category budgets along</b>
                <small>
                  Copy the {m.categories.length} budgets from{" "}
                  {monthLabel(m.key)}. Expenses and income receipts start fresh.
                </small>
              </span>
            </label>
            <div className="soft-box small">
              Income sources and savings goals stay with your profile. Schedule
              this month’s paychecks after creating the plan.
            </div>
          </>
        )}
      </Form>
    </Modal>
  );
}

function GoalForm({ dialog, onClose }: DialogProps) {
  const { s, edit, open, day } = useWorkspace();
  const goal = s.goals.find((g) => g.id === dialog.id);
  return (
    <Modal
      title={
        goal ? "Keep your good thing growing." : "Something worth saving for."
      }
      subtitle={goal ? "Edit savings goal" : "Give your next chapter a goal"}
      onClose={onClose}
    >
      <Form
        onClose={onClose}
        label={goal ? "Update goal" : "Create savings goal"}
        extra={
          goal && (
            <button
              type="button"
              className="danger-link"
              onClick={() => open({ type: "delete-goal", id: goal.id })}
            >
              <Trash2 size={16} /> Delete
            </button>
          )
        }
        onSave={(data) => {
          const target = positive(data);
          const name = str(data, "name");
          const dueDate = str(data, "date");
          if (!name) throw new Error("Give this goal a name.");
          if (!dueDate) throw new Error("Choose your target date.");
          const value = {
            id: goal?.id || uid(),
            name,
            target,
            dueDate,
            color: str(data, "color"),
            icon: str(data, "icon"),
          };
          edit(
            (d) => {
              if (goal)
                d.goals = d.goals.map((g) => (g.id === goal.id ? value : g));
              else d.goals.push(value);
            },
            goal ? "Goal updated." : "A new good thing to work toward.",
          );
        }}
      >
        <Field label="What are you saving for?">
          <input
            name="name"
            defaultValue={goal?.name}
            placeholder="e.g. Greece, emergency fund, a new car"
            maxLength={80}
            required
          />
        </Field>
        <div className="form-grid">
          <Field label="Target amount">
            <Amount cents={goal?.target} />
          </Field>
          <Field label="Target date">
            <input
              type="date"
              name="date"
              defaultValue={
                goal?.dueDate || monthEnd(shiftMonth(day.slice(0, 7), 6))
              }
              required
            />
          </Field>
        </div>
        <AppearanceFields
          icon={goal?.icon || "target"}
          color={goal?.color || "green"}
        />
        <div className="soft-box small">
          Create the goal, then set money aside from your available savings.
          Progress shows money assigned to the goal, and the monthly pace
          updates with its target date.
        </div>
      </Form>
    </Modal>
  );
}
function ContributionForm({ dialog, onClose }: DialogProps) {
  const { s, day, edit, cash } = useWorkspace();
  const goal = s.goals.find((g) => g.id === dialog.id);
  if (!goal) return null;
  const pool = savingsPool(s);
  const saved = goalSaved(s, goal.id);
  const remaining = Math.max(0, goal.target - saved);
  return (
    <Modal title="One step closer." subtitle={goal.name} onClose={onClose}>
      <Form
        label="Set money aside"
        onClose={onClose}
        disabled={pool.available <= 0 || remaining <= 0}
        onSave={(data) => {
          const amount = positive(data);
          if (amount > pool.available)
            throw new Error(
              `You have ${money(Math.max(0, pool.available))} available to assign.`,
            );
          if (amount > remaining)
            throw new Error(
              `This goal needs ${money(remaining)} more to reach its target.`,
            );
          const date = str(data, "date");
          if (!date || date > day)
            throw new Error("Choose today or an earlier date.");
          edit((d) => {
            d.contributions.push({ id: uid(), goalId: goal.id, amount, date });
          }, "Money set aside. Your goal is a little closer.");
        }}
      >
        <div className="receipt-expected">
          <span>Available to assign</span>
          <b className={pool.available < 0 ? "negative" : ""}>
            {cash(pool.available)}
          </b>
        </div>
        {pool.available <= 0 && (
          <div className="soft-box small">
            Your available savings are already assigned. Check off paychecks as
            they arrive, release an existing goal contribution, or update your
            starting savings in Profile.
          </div>
        )}
        {remaining <= 0 && (
          <div className="soft-box small">
            You’ve reached this goal. You can increase its target if you want to
            save more.
          </div>
        )}
        <Field label="Amount to set aside">
          <Amount
            cents={
              Math.max(0, Math.min(pool.available, remaining)) || undefined
            }
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            name="date"
            defaultValue={day}
            max={day}
            required
          />
        </Field>
        <p className="muted small">
          This assigns savings to your goal. It does not add an expense or move
          money from your bank.
        </p>
      </Form>
    </Modal>
  );
}
function GoalHistory({ dialog, onClose }: DialogProps) {
  const { s, cash, open } = useWorkspace();
  const goal = s.goals.find((g) => g.id === dialog.id);
  if (!goal) return null;
  const entries = s.contributions
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Modal
      title="Little steps, all adding up."
      subtitle={goal.name}
      onClose={onClose}
    >
      <div className="history-list">
        <div className="receipt-expected">
          <span>Total set aside</span>
          <b>{cash(goalSaved(s, goal.id))}</b>
        </div>
        {entries.map((c) => (
          <div className="history-row" key={c.id}>
            <CategoryIcon name={goal.icon} color={goal.color} small />
            <span className="grow">
              <b>Money set aside</b>
              <small>{dateLabel(c.date, true)}</small>
            </span>
            <b>{cash(c.amount)}</b>
            <button
              className="icon-button"
              aria-label={`Release contribution of ${money(c.amount)}`}
              onClick={() => open({ type: "release-contribution", id: c.id })}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        ))}
        {!entries.length && (
          <Empty icon="target" title="Your first step is ahead">
            Set money aside when it’s available.
          </Empty>
        )}
        <button
          className="primary full-width"
          onClick={() => open({ type: "contribution", id: goal.id })}
        >
          <Plus size={17} /> Set money aside
        </button>
      </div>
    </Modal>
  );
}

function ProfileForm({ dialog, onClose }: DialogProps) {
  const { s, edit } = useWorkspace();
  const [avatar, setAvatar] = useState(s.profile.avatar);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const zones = [
    ...new Set([
      s.profile.timezone,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Africa/Douala",
      "Europe/London",
      "UTC",
    ]),
  ];
  return (
    <Modal
      title="Make it feel like yours."
      subtitle="Edit your profile"
      onClose={onClose}
    >
      <Form
        onClose={onClose}
        label={photoBusy ? "Preparing photo…" : "Save profile"}
        disabled={photoBusy}
        onSave={(data) => {
          if (photoBusy)
            throw new Error("Wait for your photo to finish preparing.");
          const name = str(data, "name");
          if (!name) throw new Error("What should we call you?");
          const openingSavings = toCents(str(data, "amount"));
          const timezone = str(data, "timezone");
          const profile = {
            ...s.profile,
            name,
            openingSavings,
            timezone,
            avatar,
          };
          if (!isState({ ...s, profile }))
            throw new Error(
              "Your profile could not be saved. Try a smaller photo.",
            );
          edit((d) => {
            d.profile = profile;
          }, "Your profile is up to date.");
        }}
      >
        <div className="profile-photo-field">
          <span className="avatar photo-preview">
            <AvatarFace name={s.profile.name} photo={avatar} />
          </span>
          <div className="photo-controls">
            <b>Profile photo</b>
            <p>Choose a photo up to 5 MB. We’ll crop it to a square.</p>
            <div className="photo-buttons">
              <button
                type="button"
                className="secondary"
                disabled={photoBusy}
                onClick={() => photoInput.current?.click()}
              >
                <Camera size={16} />
                {photoBusy
                  ? "Preparing…"
                  : avatar
                    ? "Change photo"
                    : "Choose photo"}
              </button>
              {avatar && (
                <button
                  type="button"
                  className="text-button"
                  disabled={photoBusy}
                  onClick={() => {
                    setAvatar(undefined);
                    setPhotoError("");
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={photoInput}
              type="file"
              accept={PHOTO_TYPES}
              className="photo-file-input"
              aria-label="Upload profile photo"
              disabled={photoBusy}
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                setPhotoBusy(true);
                setPhotoError("");
                try {
                  setAvatar(await prepareProfilePhoto(file));
                } catch (error) {
                  setPhotoError(
                    error instanceof Error
                      ? error.message
                      : "This photo could not be opened.",
                  );
                } finally {
                  setPhotoBusy(false);
                  input.value = "";
                }
              }}
            />
          </div>
        </div>
        {photoError && (
          <div className="form-error" role="alert">
            <CircleAlert size={18} />
            {photoError}
          </div>
        )}
        <Field label="What should we call you?">
          <input
            name="name"
            defaultValue={s.profile.name}
            placeholder="Your first name"
            maxLength={40}
            autoComplete="given-name"
            required
          />
        </Field>
        <Field
          label="Starting savings"
          hint="Money you already have saved, before any monthly income in BudgetFlow."
        >
          <Amount cents={s.profile.openingSavings} />
        </Field>
        <Field label="Your time zone">
          <select name="timezone" defaultValue={s.profile.timezone}>
            {zones.map((z) => (
              <option value={z} key={z}>
                {z.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <div className="soft-box small">
          {s.mode === "demo"
            ? "Changes here apply to the example. Create an account to start your own plan."
            : "Your profile and plans are saved privately to your account."}
        </div>
      </Form>
    </Modal>
  );
}

function ConfirmDialog({ dialog, onClose }: DialogProps) {
  const { s, m, edit, replace, cash } = useWorkspace();
  const t = totals(m);
  const [target, setTarget] = useState(
    m.categories.find((c) => c.id !== dialog.id)?.id || "",
  );
  let title = "";
  let description: ReactNode = "";
  let button = "Confirm";
  let action: (data: FormData) => void = () => {};
  let danger = false;
  let fields: ReactNode = null;
  let disabled = false;
  if (dialog.type === "close-month") {
    title = "A month, wrapped up.";
    button = "Close this month";
    description = (
      <>
        <p>
          Close {monthLabel(m.key)} and release all unspent category money into
          its final savings.
        </p>
        <div className="closeout-math">
          <span>
            Actually received <b>{cash(t.received)}</b>
          </span>
          <span>
            Actually spent <b>−{cash(t.spent)}</b>
          </span>
          <span className="closeout-final">
            Final savings{" "}
            <b className={t.received - t.spent < 0 ? "negative" : ""}>
              {cash(t.received - t.spent)}
            </b>
          </span>
        </div>
        {t.pending > 0 && (
          <div className="soft-box small">
            {t.pending} paychecks are still unreceived. Their{" "}
            {cash(t.pendingIncome)} is excluded from final savings. You can
            reopen the month later.
          </div>
        )}
      </>
    );
    action = () =>
      edit((d) => {
        d.months[m.key].closed = true;
      }, "Month closed. Unspent budget money is included in final savings.");
  }
  if (dialog.type === "reopen") {
    title = "A little more room to adjust.";
    description = (
      <p>
        Reopen {monthLabel(m.key)} to edit your income, categories, and
        spending. Unspent budgets become reserved again, and all savings totals
        recalculate.
      </p>
    );
    button = "Reopen month";
    action = () =>
      edit((d) => {
        d.months[m.key].closed = false;
      }, "Month reopened. Your plan is ready to edit.");
  }
  if (dialog.type === "delete-expense") {
    const expense = m.expenses.find((e) => e.id === dialog.id);
    title = "Remove this expense?";
    description = (
      <p>
        Remove {cash(expense?.amount || 0)} of recorded spending. Its category
        balance and savings forecast will update.
      </p>
    );
    button = "Remove expense";
    danger = true;
    disabled = m.closed;
    action = () =>
      edit((d) => {
        d.months[m.key].expenses = d.months[m.key].expenses.filter(
          (e) => e.id !== dialog.id,
        );
      }, "Expense removed. Totals recalculated.");
  }
  if (dialog.type === "delete-category") {
    const category = m.categories.find((c) => c.id === dialog.id);
    const affected = m.expenses.filter((e) => e.categoryId === dialog.id);
    const alternatives = m.categories.filter((c) => c.id !== dialog.id);
    title = `Remove ${category?.name || "this budget"}?`;
    description = (
      <p>
        Its allocated budget returns to your savings plan.{" "}
        {affected.length > 0
          ? `${affected.length} recorded expenses need a new category.`
          : "No recorded spending belongs to this category."}
      </p>
    );
    button = "Remove budget";
    danger = true;
    disabled = m.closed || (affected.length > 0 && !alternatives.length);
    if (affected.length)
      fields = alternatives.length ? (
        <Field label="Move recorded expenses to">
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {alternatives.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <p className="negative small">
          Create another category, or remove this category’s expenses first.
        </p>
      );
    action = () => {
      if (affected.length && !alternatives.some((c) => c.id === target))
        throw new Error("Choose a destination for the recorded spending.");
      edit((d) => {
        const month = d.months[m.key];
        month.expenses = month.expenses.map((e) =>
          e.categoryId === dialog.id ? { ...e, categoryId: target } : e,
        );
        month.categories = month.categories.filter((c) => c.id !== dialog.id);
      }, "Budget removed. Expenses preserved and totals updated.");
    };
  }
  if (dialog.type === "delete-paycheck") {
    const p = m.paychecks.find((p) => p.id === dialog.id);
    title = "Remove this paycheck?";
    description = (
      <p>
        {p?.received !== null ? "This also removes its received income. " : ""}
        The income forecast, available money, and savings totals will
        recalculate.
      </p>
    );
    button = "Remove paycheck";
    danger = true;
    disabled = m.closed;
    action = () =>
      edit((d) => {
        d.months[m.key].paychecks = d.months[m.key].paychecks.filter(
          (p) => p.id !== dialog.id,
        );
      }, "Paycheck removed. Income and savings updated.");
  }
  if (dialog.type === "undo-receipt") {
    title = "Uncheck this payday?";
    description = (
      <p>
        Move it back to expected income. The received amount is removed from
        available money and funded savings; its expected amount returns to the
        forecast.
      </p>
    );
    button = "Undo receipt";
    disabled = m.closed;
    action = () =>
      edit((d) => {
        const p = d.months[m.key].paychecks.find((p) => p.id === dialog.id)!;
        p.received = null;
        p.receivedOn = null;
      }, "Payday unchecked. Your balances are up to date.");
  }
  if (dialog.type === "delete-goal") {
    const g = s.goals.find((g) => g.id === dialog.id);
    title = "Let this goal go?";
    description = (
      <p>
        Delete {g?.name}. Its {cash(goalSaved(s, dialog.id!))} in contributions
        returns to available general savings.
      </p>
    );
    button = "Delete goal";
    danger = true;
    action = () =>
      edit((d) => {
        d.goals = d.goals.filter((g) => g.id !== dialog.id);
        d.contributions = d.contributions.filter((c) => c.goalId !== dialog.id);
      }, "Goal removed. Its allocations have returned to general savings.");
  }
  if (dialog.type === "release-contribution") {
    const c = s.contributions.find((c) => c.id === dialog.id);
    title = "Give this money another purpose?";
    description = (
      <p>
        Release {cash(c?.amount || 0)} from this goal back into available
        savings. This does not create new income.
      </p>
    );
    button = "Release contribution";
    action = () =>
      edit((d) => {
        d.contributions = d.contributions.filter((c) => c.id !== dialog.id);
      }, "Contribution released to available savings.");
  }
  if (dialog.type === "reset-demo") {
    title =
      s.mode === "demo"
        ? "A fresh look at the example?"
        : "Replace your workspace with the example?";
    description = (
      <p>
        {s.mode === "personal"
          ? "Export your current plan from Profile first. "
          : ""}
        This replaces the current browser workspace with the original December
        example.
      </p>
    );
    button = "Load original example";
    danger = s.mode === "personal";
    action = () =>
      replace(demoState(), "The original December example is ready.");
  }
  return (
    <Modal title={title} onClose={onClose}>
      <Form
        onSave={action}
        onClose={onClose}
        label={button}
        disabled={disabled}
      >
        <div className={`confirm-copy ${danger ? "destructive" : ""}`}>
          {description}
        </div>
        {fields}
      </Form>
    </Modal>
  );
}
