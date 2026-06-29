import { execFileSync } from "node:child_process";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

type LocalSupabaseStatus = {
  API_URL: string;
  ANON_KEY: string;
  SERVICE_ROLE_KEY: string;
};

export type TestUser = {
  user: User;
  client: SupabaseClient;
};

function getLocalStatus(): LocalSupabaseStatus {
  const output = execFileSync("supabase", ["status", "-o", "json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const status = JSON.parse(output) as LocalSupabaseStatus;
  const hostname = new URL(status.API_URL).hostname;

  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error("Integration tests must run against local Supabase");
  }

  return status;
}

const status = getLocalStatus();

export const adminClient = createClient(
  status.API_URL,
  status.SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

export async function createTestUser(label: string): Promise<TestUser> {
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const email = `${label}-${suffix}@example.test`;
  const password = `Test-${crypto.randomUUID()}`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;

  const client = createClient(status.API_URL, status.ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) throw signInError;
  return { user: data.user, client };
}

export async function deleteTestUser(testUser: TestUser): Promise<void> {
  const { error } = await adminClient.auth.admin.deleteUser(testUser.user.id);
  if (error) throw error;
}
