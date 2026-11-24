export type Route =
  "overview" | "budget" | "income" | "expenses" | "savings" | "profile";
export const routePaths: Record<Route, string> = {
  overview: "/",
  budget: "/budget",
  income: "/income",
  expenses: "/expenses",
  savings: "/savings",
  profile: "/profile",
};
const aliases: Record<string, Route> = {
  overview: "overview",
  budget: "budget",
  income: "income",
  expenses: "expenses",
  spending: "expenses",
  savings: "savings",
  profile: "profile",
};
export function resolveRoute(input: string) {
  const url = new URL(input, "https://budgetflow.invalid");
  const legacy = aliases[url.hash.slice(1).replace(/^\//, "")];
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const route =
    legacy ||
    (Object.entries(routePaths).find(([, path]) => path === pathname)?.[0] as
      Route | undefined) ||
    aliases[pathname.slice(1)] ||
    "overview";
  const href = routePaths[route] + url.search;
  return {
    route,
    href,
    replace: url.pathname + url.search + url.hash !== href,
  };
}
export function currentRoute(): Route {
  const result = resolveRoute(window.location.href);
  if (result.replace) history.replaceState(null, "", result.href);
  return result.route;
}
export function navigate(route: Route) {
  const href = routePaths[route] + window.location.search;
  if (window.location.pathname + window.location.search !== href)
    history.pushState(null, "", href);
  window.dispatchEvent(new Event("budgetflow:navigation"));
}
