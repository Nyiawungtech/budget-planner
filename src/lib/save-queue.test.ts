import { describe, expect, it, vi } from "vitest";
import { blankState } from "./domain";
import { ConflictError, SaveQueue, type SaveRequest } from "./save-queue";
const state = () => blankState("Kampii", "America/New_York");
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { resolve, promise };
}
describe("account save coordination", () => {
  it("serializes rapid edits while an older save is running", async () => {
    const first = deferred<number>();
    const writes: SaveRequest[] = [];
    const write = vi.fn(async (request: SaveRequest) => {
      writes.push(request);
      return writes.length === 1 ? first.promise : 3;
    });
    const status = vi.fn();
    const queue = new SaveQueue(1, write, status);
    queue.enqueue(state());
    const flush = queue.flush();
    const newer = state();
    newer.profile.name = "Latest edit";
    queue.enqueue(newer);
    first.resolve(2);
    await flush;
    expect(writes.map((x) => x.revision)).toEqual([1, 2]);
    expect(writes[1].snapshot.profile.name).toBe("Latest edit");
    expect(queue.revision).toBe(3);
    expect(queue.dirty).toBe(false);
    expect(status).toHaveBeenLastCalledWith("saved");
  });
  it("reuses the identical write ID after a lost acknowledgement before saving newer edits", async () => {
    const writes: SaveRequest[] = [];
    const write = vi.fn(async (request: SaveRequest) => {
      writes.push(request);
      if (writes.length === 1) throw new Error("Network lost");
      return writes.length;
    });
    const queue = new SaveQueue(1, write, vi.fn());
    queue.enqueue(state());
    await expect(queue.flush()).rejects.toThrow("Network lost");
    const newer = state();
    newer.profile.openingSavings = 50000;
    queue.enqueue(newer);
    await queue.flush();
    expect(writes[1]).toEqual(writes[0]);
    expect(writes[2].writeId).not.toBe(writes[0].writeId);
    expect(writes[2].revision).toBe(2);
    expect(writes[2].snapshot.profile.openingSavings).toBe(50000);
  });
  it("keeps conflicting edits and never overwrites a newer remote plan", async () => {
    const write = vi.fn(async () => {
      throw new ConflictError("Newer plan");
    });
    const status = vi.fn();
    const queue = new SaveQueue(4, write, status);
    queue.enqueue(state());
    await expect(queue.flush()).rejects.toThrow(ConflictError);
    queue.enqueue(state());
    await expect(queue.flush()).rejects.toThrow(ConflictError);
    expect(write).toHaveBeenCalledTimes(1);
    expect(queue.dirty).toBe(true);
    expect(status).toHaveBeenLastCalledWith("conflict");
  });
  it("abandons old account responses after logout", async () => {
    const response = deferred<number>();
    const status = vi.fn();
    const queue = new SaveQueue(1, () => response.promise, status);
    queue.enqueue(state());
    const flush = queue.flush();
    queue.enqueue(state());
    queue.stop();
    response.resolve(2);
    await flush;
    expect(queue.revision).toBe(1);
    expect(status).not.toHaveBeenCalledWith("saved");
    await expect(queue.flush()).rejects.toThrow("no longer active");
  });
});
