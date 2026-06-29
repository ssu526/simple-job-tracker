import { expect, test as setup } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getLocalSupabaseStatus } from "./local-supabase";

type MessageSummary = {
  ID: string;
  To: { Address: string }[];
  Created: string;
};

type MessageList = {
  messages: MessageSummary[];
};

type Message = {
  Text: string;
};

const authDir = path.join(process.cwd(), "tests/e2e/.auth");
const storageStatePath = path.join(authDir, "user.json");
const identityPath = path.join(authDir, "identity.json");

async function waitForMagicLink(
  inboxUrl: string,
  email: string,
  requestedAt: number,
): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(`${inboxUrl}/api/v1/messages`);
    if (!response.ok) throw new Error("Could not read the local email inbox");

    const { messages } = (await response.json()) as MessageList;
    const match = messages.find(
      (message) =>
        message.To.some((recipient) => recipient.Address === email) &&
        new Date(message.Created).getTime() >= requestedAt - 1_000,
    );

    if (match) {
      const messageResponse = await fetch(
        `${inboxUrl}/api/v1/message/${match.ID}`,
      );
      if (!messageResponse.ok) {
        throw new Error("Could not read the local magic-link email");
      }

      const message = (await messageResponse.json()) as Message;
      const magicLink = message.Text.match(/https?:\/\/[^\s)]+/)?.[0];
      if (!magicLink) throw new Error("Magic link was missing from the email");
      return magicLink;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for a magic-link email to ${email}`);
}

setup("authenticate with a real magic link", async ({ page }) => {
  const { INBUCKET_URL } = getLocalSupabaseStatus();
  const email = `e2e-${Date.now()}@example.test`;

  const loginResponse = await page.goto("/app");
  expect(loginResponse?.headers()["x-request-id"]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  await page.getByPlaceholder("you@email.com").fill(email);

  const requestedAt = Date.now();
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  const magicLink = await waitForMagicLink(INBUCKET_URL, email, requestedAt);
  const authenticatedResponse = await page.goto(magicLink);
  await expect(page).toHaveURL(/\/app$/);
  expect(authenticatedResponse?.headers()["x-request-id"]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  await expect(page.getByText("No job search selected")).toBeVisible();

  await mkdir(authDir, { recursive: true });
  await page.context().storageState({ path: storageStatePath });
  await writeFile(identityPath, JSON.stringify({ email }), "utf8");
});
