import type { User } from "@supabase/supabase-js";
import { blankState, type State } from "./domain";
import { supabase } from "./client";
import { isState } from "./snapshot";
import { ConflictError, type SaveRequest } from "./save-queue";
export type WorkspaceRecord = { snapshot: State; revision: number };
export async function readWorkspace(
  ownerId: string,
): Promise<WorkspaceRecord | null> {
  const { data, error } = await supabase
    .from("budgetflow_workspaces")
    .select("snapshot,revision")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (
    !isState(data.snapshot) ||
    data.snapshot.mode !== "personal" ||
    !Number.isSafeInteger(data.revision)
  )
    throw new Error(
      "Your saved plan could not be read. Contact support before making changes.",
    );
  return data as WorkspaceRecord;
}
export async function saveWorkspace(ownerId: string, request: SaveRequest) {
  if (!isState(request.snapshot) || request.snapshot.mode !== "personal")
    throw new Error("This plan contains invalid data.");
  const { data, error } = await supabase.rpc("budgetflow_save_workspace", {
    p_owner_id: ownerId,
    p_expected_revision: request.revision,
    p_snapshot: request.snapshot,
    p_write_id: request.writeId,
  });
  if (error?.code === "40001")
    throw new ConflictError("A newer plan was saved on another device.");
  if (error) throw error;
  if (!Number.isSafeInteger(data))
    throw new Error("The server did not confirm the save.");
  return data as number;
}
export async function loadWorkspace(user: User): Promise<WorkspaceRecord> {
  const existing = await readWorkspace(user.id);
  if (existing) return existing;
  let zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: user.user_metadata.timezone });
    zone = user.user_metadata.timezone || zone;
  } catch {
    /* Use browser zone. */
  }
  const name =
    typeof user.user_metadata.display_name === "string"
      ? user.user_metadata.display_name.trim().slice(0, 100)
      : "My budget";
  const snapshot = blankState(name || "My budget", zone);
  try {
    const revision = await saveWorkspace(user.id, {
      snapshot,
      revision: 0,
      writeId: crypto.randomUUID(),
    });
    return { snapshot, revision };
  } catch (e) {
    if (!(e instanceof ConflictError)) throw e;
    const winner = await readWorkspace(user.id);
    if (!winner) throw e;
    return winner;
  }
}
