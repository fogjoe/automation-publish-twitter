import { chromium } from "playwright";
import * as fs from "fs";

const AUTH_FILE = "./auth.json";

export async function postThread(tweets: string[]): Promise<void> {
  if (!fs.existsSync(AUTH_FILE)) {
    throw new Error(`${AUTH_FILE} not found. Run: npx tsx tools/login.ts`);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: AUTH_FILE });
  const page = await context.newPage();

  try {
    await page.goto("https://x.com/home");
    await page.waitForTimeout(3000);

    // First tweet
    await page.click('[data-testid="tweetTextarea_0"]');
    console.log(`Typing tweet 1 (${tweets[0].length} chars)`);
    await page.keyboard.type(tweets[0], { delay: 5 });
    await page.waitForTimeout(500);

    // Add remaining tweets
    for (let i = 1; i < tweets.length; i++) {
      console.log(`Adding tweet ${i + 1} (${tweets[i].length} chars)`);
      await page.click('[data-testid="addButton"]');
      await page.waitForTimeout(500);
      await page.click(`[data-testid="tweetTextarea_${i}"]`);
      await page.keyboard.type(tweets[i], { delay: 5 });
      await page.waitForTimeout(500);
    }

    // Wait for UI to settle, then click post
    await page.waitForTimeout(2000);
    await page.locator('[data-testid="tweetButtonInline"]').click({ timeout: 5000 });
    await page.waitForTimeout(5000);

    console.log(`Successfully posted ${tweets.length} tweets!`);
  } finally {
    await browser.close();
  }
}
