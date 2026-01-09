import { chromium } from "playwright";
import * as readline from "readline";
import * as path from "path";

const AUTH_FILE = "./auth.json";
const USER_DATA_DIR = "./browser-data";

async function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question("Press Enter after you have logged in...", () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = context.pages()[0] || (await context.newPage());

  await page.goto("https://twitter.com/login");
  console.log("Please log in to Twitter manually...");

  await waitForEnter();

  await context.storageState({ path: AUTH_FILE });
  console.log(`Login state saved to ${AUTH_FILE}`);

  await context.close();
}

main().catch(console.error);
