import { describe, it, expect } from "vitest";
import { demoState } from "./demo";
import {
  categorySpent,
  copyBudgets,
  goalSaved,
  monthlyPace,
  savingsPool,
  scheduleDates,
  shiftMonth,
  monthEnd,
  toCents,
  totals,
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
});
describe("paydays, dates, and money", () => {
  it("generates four weekly paychecks and includes month-end paydays", () => {
    expect(scheduleDates("2026-12-04", "weekly", 4, "2026-12")).toEqual([
      "2026-12-04",
      "2026-12-11",
      "2026-12-18",
      "2026-12-25",
    ]);
    expect(scheduleDates("2026-12-31", "weekly", 4, "2026-12")).toEqual([
      "2026-12-31",
    ]);
  });
  it("supports twice-monthly, biweekly, and single-income schedules", () => {
    expect(scheduleDates("2026-12-15", "semimonthly", 4, "2026-12")).toEqual([
      "2026-12-15",
      "2026-12-30",
    ]);
    expect(scheduleDates("2026-12-04", "biweekly", 3, "2026-12")).toEqual([
      "2026-12-04",
      "2026-12-18",
    ]);
    expect(scheduleDates("2026-12-04", "once", 4, "2026-12")).toEqual([
      "2026-12-04",
    ]);
    expect(() =>
      scheduleDates("2026-12-20", "semimonthly", 2, "2026-12"),
    ).toThrow();
  });
  it("handles year boundaries and leap years using calendar dates", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(monthEnd("2027-02")).toBe("2027-02-28");
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
