import { describe, expect, it } from "vitest";
import { resolveRoute } from "./navigation";

describe("clean routes and existing bookmarks", () => {
  it.each([
    ["/", "overview", "/"],
    ["/budget", "budget", "/budget"],
    ["/income", "income", "/income"],
    ["/expenses", "expenses", "/expenses"],
    ["/savings", "savings", "/savings"],
    ["/profile", "profile", "/profile"],
    ["/login", "login", "/login"],
    ["/signup", "signup", "/signup"],
    ["/verify-email", "verify-email", "/verify-email"],
    ["/forgot-password", "forgot-password", "/forgot-password"],
    [
      "/reset-password?code=test-code",
      "reset-password",
      "/reset-password?code=test-code",
    ],
    [
      "/auth/callback?code=test-code",
      "auth-callback",
      "/auth/callback?code=test-code",
    ],
  ])("opens %s directly without a hash", (input, route, href) => {
    expect(resolveRoute(input)).toEqual({ route, href, replace: false });
  });
  it.each([
    ["/#overview", "overview", "/"],
    ["/#income", "income", "/income"],
    ["/#spending", "expenses", "/expenses"],
    ["/#expenses", "expenses", "/expenses"],
    ["/spending", "expenses", "/expenses"],
    ["/overview", "overview", "/"],
    ["/income/", "income", "/income"],
    ["/?example=1#budget", "budget", "/budget?example=1"],
  ])("keeps the destination of the old link %s", (input, route, href) => {
    expect(resolveRoute(input)).toEqual({ route, href, replace: true });
  });
});
