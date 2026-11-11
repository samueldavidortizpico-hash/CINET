import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const vite = resolve("node_modules/vite/bin/vite.js");
const builds = [
  { args: ["build"], env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "" } },
  {
    args: ["build", "--outDir", "node_modules/.cache/cinet-e2e-rooms", "--emptyOutDir"],
    env: {
      VITE_SUPABASE_URL: `http://localhost:${process.env.CINET_E2E_ROOMS_PORT || 4176}`,
      VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-publishable-key",
    },
  },
];

for (const { args, env } of builds) {
  const result = spawnSync(process.execPath, [vite, ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      TMDB_READ_TOKEN: "",
      VITE_TMDB_READ_TOKEN: "",
      VITE_TMDB_API_URL: "",
      VITE_ANALYTICS_ENDPOINT: "",
      ...env,
    },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
