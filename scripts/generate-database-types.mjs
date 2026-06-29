import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const result = spawnSync(
  "supabase",
  ["gen", "types", "typescript", "--local"],
  {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

writeFileSync(new URL("../types/database.ts", import.meta.url), result.stdout);
