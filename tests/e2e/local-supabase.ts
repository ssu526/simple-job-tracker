import { execFileSync } from "node:child_process";

export type LocalSupabaseStatus = {
  API_URL: string;
  SERVICE_ROLE_KEY: string;
  INBUCKET_URL: string;
};

export function getLocalSupabaseStatus(): LocalSupabaseStatus {
  const output = execFileSync("supabase", ["status", "-o", "json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const status = JSON.parse(output) as LocalSupabaseStatus;
  const hostname = new URL(status.API_URL).hostname;

  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error("E2E tests must run against local Supabase");
  }

  return status;
}
