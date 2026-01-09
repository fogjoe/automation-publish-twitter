import "dotenv/config";
import { fetchDailyJournal, updateStatus } from "./services/notion.js";
import { polishContent } from "./services/ai.js";
import { splitIntoThread } from "./utils/textSplitter.js";
import { postThread } from "./services/twitter.js";

async function main() {
  console.log("=== Starting automation ===");

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

  console.log("=== Automation complete ===");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
