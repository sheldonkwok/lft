import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test("suggestions appear on empty line 1", async ({ page }) => {
	await page.getByTestId("workout-input").focus();
	await expect(page.getByTestId("suggestions")).toBeVisible();
	await expect(page.getByTestId("suggestion-item")).toHaveCount(2);
});

test("typing filters suggestions by prefix", async ({ page }) => {
	await page.getByTestId("workout-input").fill("I");
	await expect(page.getByTestId("suggestion-item")).toHaveCount(1);
	await expect(page.getByTestId("suggestion-item")).toHaveText("Incline Bench");
});

test("clicking a suggestion completes the line", async ({ page }) => {
	await page.getByTestId("workout-input").fill("I");
	await page.getByTestId("suggestion-item").first().click();
	await expect(page.getByTestId("workout-input")).toHaveValue(
		"Incline Bench\n",
	);
	await expect(page.getByTestId("status-valid")).toContainText("1 exercise");
});

test("used exercises are excluded", async ({ page }) => {
	const box = page.getByTestId("workout-input");
	await box.fill("Bench\n135x8\n\n");
	await box.focus();
	await expect(page.getByTestId("suggestion-item")).toHaveCount(1);
	await expect(page.getByTestId("suggestion-item")).toHaveText("Incline Bench");
});

test("no suggestions on a set line", async ({ page }) => {
	await page.getByTestId("workout-input").fill("Bench\n135x8");
	await expect(page.getByTestId("suggestions")).toHaveCount(0);
});
