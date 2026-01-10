import "dotenv/config";
import cron from "node-cron";
import {
  fetchDailyJournal,
  updateStatus,
  checkHasWrittenToday,
} from "./services/notion.js";
import { polishContent } from "./services/ai.js";
import { splitIntoThread } from "./utils/textSplitter.js";
import { postThread } from "./services/twitter.js";
import { sendReminderEmail } from "./services/email.js";

async function publishToTwitter() {
  console.log("=== Starting publish automation ===");

  // 1. Fetch journal from Notion
  console.log("Fetching today's journal...");
  const journal = await fetchDailyJournal();
  if (!journal) {
    console.log("No journal to post");
    return;
  }
  console.log(`Found: "${journal.title}"`);

  // 2. Polish content with AI
  console.log("Polishing content with AI...");
  const polished = await polishContent(journal.content);
  console.log("Content polished successfully");

  // 3. Split into Twitter thread
  console.log("Splitting into thread...");
  const tweets = splitIntoThread(polished);
  console.log(`Split into ${tweets.length} tweets`);

  // 4. Post to Twitter
  console.log("Posting to Twitter...");
  await postThread(tweets);
  console.log("Posted successfully!");

  // 5. Update Notion status
  console.log("Updating Notion status...");
  await updateStatus(journal.id, "Published");
  console.log("Status updated to Published");

  console.log("=== Publish automation complete ===");
}

async function checkAndRemind() {
  console.log("=== Checking daily journal ===");

  const hasWritten = await checkHasWrittenToday();

  if (hasWritten) {
    console.log("Journal entry found for today, skipping reminder");
  } else {
    console.log("No journal entry today, sending reminder...");
    await sendReminderEmail();
  }

  console.log("=== Check complete ===");
}

// Schedule publish check every hour
cron.schedule("0 * * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running hourly publish check`);
  try {
    await publishToTwitter();
  } catch (err) {
    console.error("Publish error:", (err as Error).message);
  }
});

// Schedule reminder check at 8:00 PM every day
cron.schedule("0 20 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running scheduled reminder check`);
  try {
    await checkAndRemind();
  } catch (err) {
    console.error("Reminder check error:", (err as Error).message);
  }
});

console.log("Scheduler started:");
console.log("  - Publish check: every hour at :00");
console.log("  - Reminder check: 20:00 daily");

// Run initial check on startup
console.log("\nRunning initial publish check...");
publishToTwitter()
  .then(() => {
    console.log("\nScheduler is running. Next actions:");
    console.log("  - Hourly: check for new articles with Status='Ready'");
    console.log("  - 20:00: send reminder if no article written today");
  })
  .catch((err) => {
    console.error("Initial check error:", (err as Error).message);
    console.log("\nScheduler is running, will retry on next hour...");
  });
