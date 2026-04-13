import { expect, type Page, test } from "@playwright/test";

async function type(page: Page, input: string) {
	const box = page.getByTestId("workout-input");
	await box.fill(input);
}

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test("empty input is valid", async ({ page }) => {
	await expect(page.getByTestId("status-valid")).toContainText("0 exercises");
});

test("single complete exercise is valid", async ({ page }) => {
	await type(page, "Bench\n135x8\n225x5");
	await expect(page.getByTestId("status-valid")).toContainText("1 exercise");
	await expect(page.getByTestId("status-valid")).toContainText("2 sets");
});

test("full example workout is valid", async ({ page }) => {
	const workout = [
		"Bench",
		"135x8",
		"225x5",
		"275x2",
		"315x2",
		"275x6",
		"225x14",
		"",
		"Incline Bench",
		"135x5",
		"185x8",
		"185x8",
	].join("\n");
	await type(page, workout);
	await expect(page.getByTestId("status-valid")).toContainText("2 exercises");
	await expect(page.getByTestId("status-valid")).toContainText("9 sets");
});

test("unknown exercise errors on line 1", async ({ page }) => {
	await type(page, "Squat\n135x5");
	await expect(page.getByTestId("error-line").first()).toHaveText(
		"Line 1: Unknown exercise",
	);
});

test("malformed set errors on line 2", async ({ page }) => {
	await type(page, "Bench\n135*8");
	await expect(page.getByTestId("error-line").first()).toHaveText(
		"Line 2: Expected set like 135x8",
	);
});

test("duplicate exercise errors on the repeat line", async ({ page }) => {
	await type(page, "Bench\n135x8\n\nBench\n95x10");
	await expect(page.getByTestId("error-line").first()).toHaveText(
		"Line 4: Exercise already used",
	);
});

test("set before any exercise is an error", async ({ page }) => {
	await type(page, "135x8");
	await expect(page.getByTestId("status-errors")).toBeVisible();
	await expect(page.getByTestId("error-line").first()).toContainText("Line 1");
});

test("exercise name is case-insensitive", async ({ page }) => {
	await type(page, "bench\n135x8");
	await expect(page.getByTestId("status-valid")).toContainText("1 exercise");
});
