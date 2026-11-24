import { describe, expect, it } from "vitest";
import { demoState } from "./demo";
import { blankMonth, blankState } from "./domain";
import { isState } from "./snapshot";
describe("remote plan validation", () => {
  it("accepts a new account and the working sample", () => {
    expect(isState(blankState("My plan", "America/New_York"))).toBe(true);
    expect(isState(demoState())).toBe(true);
  });
  it("preserves a plan's next-month payday and actual receipt in cloud snapshots", () => {
    const plan = demoState();
    plan.selectedMonth = "2026-11";
    plan.months["2026-11"] = blankMonth("2026-11");
    const income = {
      id: "cross-month-income", sourceId: plan.sources[0].id,
      date: "2026-12-04", expected: 250000,
      received: null as number | null, receivedOn: null as string | null, note: "November income",
    };
    plan.months["2026-11"].paychecks.push(income);
    expect(isState(plan)).toBe(true);
    income.received = 240000;
    income.receivedOn = "2026-12-05";
    const restored = JSON.parse(JSON.stringify(plan));
    expect(isState(restored)).toBe(true);
    expect(restored.months["2026-11"].paychecks[0]).toEqual(income);
    expect(restored.months["2026-12"].paychecks.some((p: { id: string }) => p.id === income.id)).toBe(false);
  });
  it("rejects malformed money, time zones, and dangling categories", () => {
    const plan = demoState();
    plan.profile.openingSavings = -1;
    expect(isState(plan)).toBe(false);
    plan.profile.openingSavings = 0;
    plan.profile.timezone = "No/SuchPlace";
    expect(isState(plan)).toBe(false);
    plan.profile.timezone = "UTC";
    plan.months[plan.selectedMonth].expenses[0].categoryId = "missing";
    expect(isState(plan)).toBe(false);
  });
  it("rejects incomplete and duplicate records", () => {
    expect(isState({ version: 1, mode: "personal" })).toBe(false);
    const plan = demoState();
    plan.sources.push({ ...plan.sources[0] });
    expect(isState(plan)).toBe(false);
  });
});
