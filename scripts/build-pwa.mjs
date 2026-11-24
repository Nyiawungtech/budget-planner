import { createHash } from "node:crypto";
import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");
const routes = ["/", "/budget", "/income", "/expenses", "/savings", "/profile"];
// Physical entry pages make fresh clean URLs work even on hosts without an SPA rewrite.
for (const route of [...routes.slice(1), "/spending", "/overview"]) {
  const directory = path.join(dist, route.slice(1));
  await mkdir(directory, { recursive: true });
  await copyFile(
    path.join(dist, "index.html"),
    path.join(directory, "index.html"),
  );
}
async function list(directory) {
  const paths = [];
  for (const entry of await readdir(path.join(dist, directory), {
    withFileTypes: true,
  })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await list(relative)));
    else paths.push("/" + relative);
  }
  return paths;
}
const assets = [
  ...(await list("assets")),
  ...(await list("icons")),
  "/manifest.webmanifest",
  "/favicon.svg",
].sort();
const digest = createHash("sha256");
for (const name of ["/index.html", ...assets])
  digest.update(name).update(await readFile(path.join(dist, name.slice(1))));
const configuration = {
  cache: "budgetflow-" + digest.digest("hex").slice(0, 16),
  routes,
  assets,
};
const template = await readFile(
  path.join(root, "scripts/service-worker.js"),
  "utf8",
);
await writeFile(
  path.join(dist, "sw.js"),
  template.replace("/* BUILD_CONFIG */ {}", JSON.stringify(configuration)),
);
console.log(
  `PWA ready: ${routes.length} clean routes and ${assets.length} cached assets.`,
);
