import { expect, test } from "@playwright/test";

test("manages a job search, application, and timeline event", async ({
  page,
}) => {
  await page.goto("/app");

  await page.getByPlaceholder("New job search").fill("E2E Search");
  await page.getByPlaceholder("New job search").press("Enter");
  await expect(page.getByRole("heading", { name: "E2E Search" })).toBeVisible();

  await page.getByPlaceholder("Role", { exact: true }).fill("QA Engineer");
  await page.getByPlaceholder("Company", { exact: true }).fill("Acme");
  await page
    .getByPlaceholder("Location (optional)", { exact: true })
    .fill("Remote");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("button", { name: "Edit QA Engineer application" }),
  ).toBeVisible();

  await page.getByLabel("Application status").selectOption("In progress");
  await expect(page.getByLabel("Application status")).toHaveValue("In progress");

  const followUp = page.getByRole("button", {
    name: "Mark QA Engineer for follow-up",
  });
  await followUp.click();
  await expect(
    page.getByRole("button", {
      name: "Remove follow-up from QA Engineer",
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Follow up (1)" })).toBeVisible();

  const search = page.getByPlaceholder(
    "Search roles, companies, or locations",
  );
  await search.fill("missing");
  await expect(page.getByText("No applications.")).toBeVisible();
  await search.fill("QA");
  await expect(
    page.getByRole("button", { name: "Edit QA Engineer application" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Edit QA Engineer application" })
    .click();
  const editApplication = page.getByRole("dialog", {
    name: "Edit application",
  });
  await editApplication
    .getByPlaceholder("e.g. Frontend Engineer")
    .fill("Senior QA");
  await editApplication.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Senior QA application" }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Add timeline event to Senior QA application",
    })
    .click();
  const addEvent = page.getByRole("dialog", { name: "Add timeline event" });
  await addEvent.getByPlaceholder("e.g. Phone screen").fill("Phone screen");
  await addEvent.locator('input[type="date"]').fill("2026-06-27");
  await addEvent.locator("textarea").fill("Initial conversation");
  await addEvent.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Phone screen event" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Edit Phone screen event" }).click();
  const editEvent = page.getByRole("dialog", { name: "Edit timeline event" });
  await expect(editEvent.locator("textarea")).toHaveValue(
    "Initial conversation",
  );
  await editEvent
    .getByPlaceholder("e.g. Phone screen")
    .fill("Technical interview");
  await editEvent.locator("textarea").fill("Updated notes");
  await editEvent.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Technical interview event" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Edit Technical interview event" })
    .click();
  await page
    .getByRole("dialog", { name: "Edit timeline event" })
    .getByRole("button", { name: "Delete event" })
    .click();
  await page
    .getByRole("dialog", { name: "Edit timeline event" })
    .getByRole("button", { name: "Delete event" })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit Technical interview event" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Edit Senior QA application" }).click();
  await page
    .getByRole("dialog", { name: "Edit application" })
    .getByRole("button", { name: "Delete application" })
    .click();
  await page
    .getByRole("dialog", { name: "Edit application" })
    .getByRole("button", { name: "Delete application" })
    .click();
  await expect(page.getByText("No applications.")).toBeVisible();

  await page.getByRole("button", { name: "E2E Search", exact: true }).hover();
  await page.getByRole("button", { name: "Delete E2E Search" }).click();
  await expect(page.getByText("No job search selected")).toBeVisible();
});

test("signs out and returns to authentication", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Open user menu" }).click();
  await page.getByRole("button", { name: "Logout" }).click();

  await expect(page).toHaveURL("/");
  await page.goto("/app");
  await expect(
    page.getByRole("button", { name: "Send magic link" }),
  ).toBeVisible();
});
