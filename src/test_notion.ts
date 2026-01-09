import { fetchDailyJournal } from "./services/notion.js";

async function main() {
  console.log("Fetching today's journal...");
  const journal = await fetchDailyJournal();

  if (!journal) {
    console.log("No journal found for today with status 'Ready'");
    return;
  }

  console.log("Found journal:");
  console.log("ID:", journal.id);
  console.log("Title:", journal.title);
  console.log("Content:", journal.content);
}

main().catch(console.error);
