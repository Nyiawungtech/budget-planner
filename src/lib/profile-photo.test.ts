import { describe, expect, it } from "vitest";
import { blankState } from "./domain";
import { isState } from "./snapshot";
import { MAX_AVATAR_LENGTH, MAX_PHOTO_BYTES, prepareProfilePhoto } from "./profile-photo";

describe("private profile photos", () => {
  it("keeps a photo through the cloud snapshot JSON round trip", () => {
    const plan = blankState("Alex", "America/New_York");
    plan.profile.avatar = "data:image/jpeg;base64,/9j/2Q==";
    const saved = JSON.parse(JSON.stringify(plan));
    expect(isState(saved)).toBe(true);
    expect(saved.profile.avatar).toBe(plan.profile.avatar);
    delete saved.profile.avatar;
    expect(isState(saved)).toBe(true);
  });
  it("rejects remote, executable, and oversized saved photo values", () => {
    for (const avatar of ["https://example.com/tracker.jpg", "data:image/svg+xml,<svg/>", "javascript:alert(1)", "data:image/jpeg;base64," + "A".repeat(MAX_AVATAR_LENGTH)]) {
      const plan = blankState("Alex", "UTC");
      plan.profile.avatar = avatar;
      expect(isState(plan)).toBe(false);
    }
  });
  it("rejects unsuitable files before asking the browser to decode them", async () => {
    await expect(prepareProfilePhoto(new File(["<svg/>"], "photo.svg", { type: "image/svg+xml" }))).rejects.toThrow("Choose a photo");
    await expect(prepareProfilePhoto(new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "photo.jpg", { type: "image/jpeg" }))).rejects.toThrow("5 MB");
  });
});
