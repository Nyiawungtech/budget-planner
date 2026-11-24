import { describe, expect, it, vi, beforeEach } from "vitest";
import { blankState } from "./domain";
import { demoState } from "./demo";
const { rpc, maybeSingle, eq, select, from } = vi.hoisted(() => {
  const rpc = vi.fn();
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { rpc, maybeSingle, eq, select, from };
});
vi.mock("./client", () => ({ supabase: { rpc, from } }));
import { loadWorkspace, readWorkspace, saveWorkspace } from "./cloud";
import { ConflictError } from "./save-queue";
import type { User } from "@supabase/supabase-js";
const user: User = {
  id: "owner-a",
  app_metadata: {},
  aud: "authenticated",
  created_at: "2026-11-24T00:00:00Z",
  user_metadata: { display_name: "Kampii", timezone: "America/New_York" },
};
beforeEach(() => {
  vi.clearAllMocks();
});
describe("private cloud plans", () => {
  it("reads only the requested owner and validates saved data", async () => {
    maybeSingle.mockResolvedValue({
      data: { snapshot: blankState("My budget"), revision: 5 },
      error: null,
    });
    expect((await readWorkspace("owner-a"))?.revision).toBe(5);
    expect(eq).toHaveBeenCalledWith("owner_id", "owner-a");
    maybeSingle.mockResolvedValue({
      data: { snapshot: {}, revision: 5 },
      error: null,
    });
    await expect(readWorkspace("owner-a")).rejects.toThrow("could not be read");
  });
  it("never uploads example data into a personal account", async () => {
    await expect(
      saveWorkspace("owner-a", {
        snapshot: demoState(),
        revision: 1,
        writeId: "operation",
      }),
    ).rejects.toThrow("invalid data");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("binds writes to the original owner and exposes a conflict without overwriting", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "Changed" },
    });
    const snapshot = blankState("Budget");
    await expect(
      saveWorkspace("owner-a", { snapshot, revision: 4, writeId: "operation" }),
    ).rejects.toThrow(ConflictError);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("budgetflow_save_workspace", {
      p_owner_id: "owner-a",
      p_expected_revision: 4,
      p_snapshot: snapshot,
      p_write_id: "operation",
    });
  });
  it("loads the winner when two devices create the first plan together", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { snapshot: blankState("The other device"), revision: 1 },
        error: null,
      });
    rpc.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "Changed" },
    });
    const loaded = await loadWorkspace(user);
    expect(loaded.snapshot.profile.name).toBe("The other device");
    expect(loaded.revision).toBe(1);
  });
});
