import type { State } from "./domain";
export type SaveStatus = "saved" | "saving" | "error" | "conflict";
export type SaveRequest = {
  snapshot: State;
  revision: number;
  writeId: string;
};
export class ConflictError extends Error {}
/** Serial, idempotent writes. Older responses never replace newer edits. */
export class SaveQueue {
  private pending: State | null = null;
  private attempt: SaveRequest | null = null;
  private running: Promise<void> | null = null;
  private stopped = false;
  private conflict = false;
  revision: number;
  constructor(
    revision: number,
    private write: (request: SaveRequest) => Promise<number>,
    private status: (status: SaveStatus) => void,
  ) {
    this.revision = revision;
  }
  get dirty() {
    return !!(this.pending || this.attempt || this.running);
  }
  enqueue(snapshot: State) {
    if (this.stopped) return;
    this.pending = structuredClone(snapshot);
    this.status(this.conflict ? "conflict" : "saving");
  }
  flush(): Promise<void> {
    if (this.stopped)
      return Promise.reject(new Error("This account is no longer active."));
    if (this.conflict)
      return Promise.reject(
        new ConflictError("A newer version was saved on another device."),
      );
    if (this.running) return this.running;
    this.running = this.drain().finally(() => {
      this.running = null;
    });
    return this.running;
  }
  private async drain() {
    while (!this.stopped && (this.attempt || this.pending)) {
      if (!this.attempt) {
        this.attempt = {
          snapshot: this.pending!,
          revision: this.revision,
          writeId: crypto.randomUUID(),
        };
        this.pending = null;
      }
      try {
        const revision = await this.write(this.attempt);
        if (this.stopped) return;
        this.revision = revision;
        this.attempt = null;
      } catch (e) {
        if (!this.stopped) {
          this.conflict = e instanceof ConflictError;
          this.status(this.conflict ? "conflict" : "error");
        }
        throw e;
      }
    }
    if (!this.stopped) this.status("saved");
  }
  stop() {
    this.stopped = true;
    this.pending = null;
    this.attempt = null;
  }
}
