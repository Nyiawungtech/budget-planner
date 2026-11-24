import { describe, expect, it } from "vitest";
import { demoState } from "./demo";
import { blankState } from "./domain";
import { isState } from "./snapshot";
describe("remote plan validation", () => {
  it("accepts a new account and the working sample", () => {
    expect(isState(blankState("My plan", "America/New_York"))).toBe(true);
    expect(isState(demoState())).toBe(true);
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
