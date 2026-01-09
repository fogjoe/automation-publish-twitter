import "dotenv/config";
import { fetchDailyJournal } from "./services/notion.js";

async function main() {
  // 1. Fetch journal from Notion
  const journal = await fetchDailyJournal();
  if (!journal) {
    console.log("No journal ready for today");
    return;
  }
  console.log("Found journal:", journal.title);

  // TODO: 2. Polish content with AI (OpenRouter)
  // TODO: 3. Split into Twitter thread
  // TODO: 4. Publish to Twitter via Playwright
  // TODO: 5. Update Notion status to "Published"
}

main().catch(console.error);
