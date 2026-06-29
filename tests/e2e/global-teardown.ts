import { createClient } from "@supabase/supabase-js";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { getLocalSupabaseStatus } from "./local-supabase";

export default async function globalTeardown(): Promise<void> {
  const authDir = path.join(process.cwd(), "tests/e2e/.auth");

  try {
    const identity = JSON.parse(
      await readFile(path.join(authDir, "identity.json"), "utf8"),
    ) as { email: string };
    const { API_URL, SERVICE_ROLE_KEY } = getLocalSupabaseStatus();
    const admin = createClient(API_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email === identity.email);
    if (user) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
    }
  } finally {
    await rm(authDir, { recursive: true, force: true });
  }
}
