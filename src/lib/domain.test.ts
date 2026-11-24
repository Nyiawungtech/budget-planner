import { describe, it, expect } from "vitest";
import { demoState } from "./demo";
import {
  blankMonth,
  blankState,
  categorySpent,
  copyBudgets,
  goalSaved,
  isCalendarDate,
  monthlyPace,
  savingsPool,
  scheduleDates,
  shiftMonth,
  monthEnd,
  toCents,
  totals,
  validateReceiptDate,
} from "./domain";

describe("a monthly plan that always reconciles", () => {
  it("leaves $3,000 from the user’s $10,000 income and $7,000 plan", () => {
    const s = demoState();
    const t = totals(s.months["2026-12"]);
    expect(t.expected).toBe(1000000);
    expect(t.budget).toBe(700000);
    expect(t.savings).toBe(300000);
    expect(t.received).toBe(500000);
    expect(t.cashRemaining).toBe(133500);
  });
  it("recalculates every derived savings balance when Greece receives $1,500", () => {
    const s = demoState();
    const m = s.months["2026-12"];
    m.categories.push({
      id: "vacation",
      name: "Vacation to Greece",
      budget: 150000,
      color: "blue",
      icon: "plane",
    });
    expect(totals(m).budget).toBe(850000);
    expect(totals(m).savings).toBe(150000);
    m.categories.find((c) => c.id === "vacation")!.budget = 200000;
    expect(totals(m).savings).toBe(100000);
    expect(savingsPool(s).capacity).toBe(240000);
  });
  it("shows a negative category balance and reduces savings only by the overspend", () => {
    const s = demoState();
    const m = s.months["2026-12"];
    m.expenses.push({
      id: "extra",
      categoryId: "food",
      amount: 10000,
      date: "2026-12-12",
      note: "Dinner",
    });
    const c = m.categories.find((c) => c.id === "food")!;
    expect(c.budget - categorySpent(m, c.id)).toBe(-2500);
    expect(totals(m).overspent).toBe(2500);
    expect(totals(m).savings).toBe(297500);
    m.expenses.pop();
    expect(totals(m).savings).toBe(300000);
  });
  it("preserves an overall negative balance instead of clamping it to zero", () => {
    const s = demoState();
    const m = s.months["2026-12"];
    m.categories[0].budget += 400000;
    expect(totals(m).savings).toBe(-100000);
  });
  it("uses actual paycheck income after receipt, and never adds it twice", () => {
    const s = demoState();
    const m = s.months["2026-12"];
    const p = m.paychecks[2];
    p.received = 230000;
    p.receivedOn = "2026-12-12";
    expect(totals(m).received).toBe(730000);
    expect(totals(m).forecastIncome).toBe(980000);
    expect(totals(m).savings).toBe(280000);
    p.received = 240000;
    expect(totals(m).received).toBe(740000);
    expect(totals(m).savings).toBe(290000);
    p.received = null;
    p.receivedOn = null;
    expect(totals(m).savings).toBe(300000);
    expect(totals(m).received).toBe(500000);
  });
  it("keeps future income out of confirmed savings, then funds the residual after receipt", () => {
    const s = demoState();
    const m = s.months["2026-12"];
    expect(totals(m).fundedSavings).toBe(0);
    expect(savingsPool(s).available).toBe(0);
    for (const p of m.paychecks) {
      p.received = p.expected;
      p.receivedOn = p.date;
    }
    expect(totals(m).fundedSavings).toBe(300000);
    expect(savingsPool(s).available).toBe(300000);
  });
  it("releases unused category reserves at closeout without counting pending income", () => {
    const s = demoState();
    const m = s.months["2026-12"];
    m.closed = true;
    expect(totals(m).savings).toBe(133500);
    expect(totals(m).fundedSavings).toBe(133500);
    expect(savingsPool(s).available).toBe(133500);
    m.closed = false;
    expect(savingsPool(s).available).toBe(0);
  });
  it("does not duplicate money when savings is assigned to a goal", () => {
    const s = demoState();
    for (const p of s.months["2026-12"].paychecks) p.received = p.expected;
    const before = savingsPool(s).capacity;
    s.contributions.push({
      id: "new",
      goalId: "greece",
      amount: 150000,
      date: "2026-12-12",
    });
    expect(savingsPool(s).capacity).toBe(before);
    expect(savingsPool(s).available).toBe(150000);
    expect(goalSaved(s, "greece")).toBe(290000);
    s.months["2026-12"].categories[0].budget += 200000;
    expect(savingsPool(s).available).toBe(-50000);
  });
  it("copies only budget templates; spending and paycheck receipts start empty", () => {
    const old = demoState().months["2026-12"];
    const next = copyBudgets(old, "2027-01");
    expect(next.categories.map((c) => c.budget)).toEqual(
      old.categories.map((c) => c.budget),
    );
    expect(next.categories[0].id).not.toBe(old.categories[0].id);
    expect(next.expenses).toEqual([]);
    expect(next.paychecks).toEqual([]);
    next.categories[0].budget = 1;
    expect(old.categories[0].budget).toBe(250000);
  });
  it.each([
    ["2026-11", "2026-12-04"],
    ["2026-12", "2027-01-08"],
  ])("keeps %s income paid on %s in its original plan and counts it once", (key, payday) => {
    const s = blankState("Cross-month plan", "UTC");
    const nextKey = shiftMonth(key, 1);
    const m = blankMonth(key);
    s.selectedMonth = key;
    s.months = { [key]: m, [nextKey]: blankMonth(nextKey) };
    m.categories.push({
      id: "rent", name: "Rent", budget: 150000, color: "green", icon: "home",
    });
    m.paychecks = scheduleDates(payday, "once", 1).map((date) => ({
      id: "pay", sourceId: "job", date, expected: 250000,
      received: null, receivedOn: null, note: "Income for the original plan",
    }));
    const p = m.paychecks[0];
    expect(p.date).toBe(payday);
    expect(totals(m).savings).toBe(100000);
    expect(totals(m).received).toBe(0);
    expect(savingsPool(s).capacity).toBe(0);
    p.received = 240000;
    p.receivedOn = payday;
    expect(totals(m).forecastIncome).toBe(240000);
    expect(totals(m).received).toBe(240000);
    expect(savingsPool(s).capacity).toBe(90000);
    expect(totals(s.months[nextKey]).expected).toBe(0);
    expect(totals(s.months[nextKey]).received).toBe(0);
    p.received = 230000;
    expect(savingsPool(s).capacity).toBe(80000);
    p.received = null;
    p.receivedOn = null;
    expect(savingsPool(s).capacity).toBe(0);
    expect(totals(m).savings).toBe(100000);
  });
});
describe("paydays, dates, and money", () => {
  it("generates four weekly paychecks and includes month-end paydays", () => {
    expect(scheduleDates("2026-12-04", "weekly", 4)).toEqual([
      "2026-12-04",
      "2026-12-11",
      "2026-12-18",
      "2026-12-25",
    ]);
    expect(scheduleDates("2026-12-31", "weekly", 4)).toEqual([
      "2026-12-31",
    ]);
  });
  it("supports twice-monthly, biweekly, and single-income schedules", () => {
    expect(scheduleDates("2026-12-15", "semimonthly", 4)).toEqual([
      "2026-12-15",
      "2026-12-30",
    ]);
    expect(scheduleDates("2026-12-04", "biweekly", 3)).toEqual([
      "2026-12-04",
      "2026-12-18",
    ]);
    expect(scheduleDates("2026-12-04", "once", 4)).toEqual([
      "2026-12-04",
    ]);
    expect(() => scheduleDates("2026-12-20", "semimonthly", 2)).toThrow();
  });
  it("handles year boundaries and leap years using calendar dates", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(monthEnd("2027-02")).toBe("2027-02-28");
  });
  it("validates real paydays without restricting them to a budget month", () => {
    expect(scheduleDates("2027-01-08", "biweekly", 2)).toEqual(["2027-01-08", "2027-01-22"]);
    expect(scheduleDates("2028-02-29", "once", 1)).toEqual(["2028-02-29"]);
    for (const date of ["", "2026-02-29", "2026-12-00", "2026-13-01", "2026-11-31"]) {
      expect(isCalendarDate(date)).toBe(false);
      expect(() => scheduleDates(date, "once", 1)).toThrow("valid first payday");
    }
  });
  it("allows actual receipts in another month or year but rejects future and invalid dates", () => {
    expect(() => validateReceiptDate("2026-12-04", "2026-12-05")).not.toThrow();
    expect(() => validateReceiptDate("2027-01-08", "2027-01-08")).not.toThrow();
    expect(() => validateReceiptDate("2026-12-04", "2026-11-30")).toThrow("future");
    expect(() => validateReceiptDate("2026-11-31", "2026-12-05")).toThrow("valid received date");
  });
  it("stores cents exactly and rejects malformed or fractional-cent amounts", () => {
    expect(toCents("10000")).toBe(1000000);
    expect(toCents("0.01")).toBe(1);
    expect(toCents("1000.99")).toBe(100099);
    for (const bad of ["1.999", "-1", "1e3", "NaN", "1,000", "Infinity", ""])
      expect(() => toCents(bad)).toThrow();
  });
  it("calculates a remaining monthly goal pace without treating the forecast as saved", () => {
    const s = demoState();
    const g = s.goals[0];
    expect(monthlyPace(g, 140000, "2026-12-12")).toBe(65715);
    expect(monthlyPace(g, g.target, "2026-12-12")).toBe(0);
    expect(monthlyPace(g, 140000, "2028-01-01")).toBe(460000);
  });
});
