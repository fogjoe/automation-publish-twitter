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
import { publishToXhs } from "./xhs/index.js";

/**
 * 获取随机图片 URL（使用 Lorem Picsum）
 */
function getRandomImageUrl(): string {
  // 随机图片 ID (1-1000)
  const randomId = Math.floor(Math.random() * 1000) + 1;
  return `https://picsum.photos/id/${randomId}/1080/1080.jpg`;
}

/**
 * 将标签数组转换为 hashtag 格式
 */
function formatTagsAsHashtags(tags: string[]): string {
  if (tags.length === 0) return "";
  return tags.map((tag) => `#${tag}`).join(" ");
}

/**
 * 发布到 Twitter
 */
async function publishTwitter() {
  console.log("=== Starting Twitter publish ===");

  // 1. Fetch journal from Notion
  console.log("Fetching today's journal...");
  const journal = await fetchDailyJournal();
  if (!journal) {
    console.log("No journal to post");
    return false;
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
  console.log("Posted to Twitter successfully!");

  return true;
}

/**
 * 发布到小红书（不更新 Notion 状态）
 */
async function publishRedNote() {
  console.log("\n=== Starting RedNote (小红书) publish ===");

  // 1. Fetch journal from Notion
  console.log("Fetching today's journal...");
  const journal = await fetchDailyJournal();
  if (!journal) {
    console.log("No journal to post");
    return null;
  }
  console.log(`Found: "${journal.title}"`);

  // 2. 准备标题
  const title = journal.title;

  // 3. AI 润色内容
  console.log("Polishing content with AI...");
  const polished = await polishContent(journal.content);
  console.log("Content polished successfully");

  // 4. 准备正文（润色后内容 + 标签）
  const hashtags = formatTagsAsHashtags(journal.tags);
  const content = hashtags ? `${polished}\n\n${hashtags}` : polished;

  console.log(`Tags: ${journal.tags.join(", ") || "无"}`);
  console.log(`Content length: ${content.length} chars`);

  // 5. 获取随机图片
  const imageUrl = getRandomImageUrl();
  console.log(`Random image: ${imageUrl}`);

  // 6. 发布到小红书
  await publishToXhs(imageUrl, title, content);
  console.log("Posted to RedNote successfully!");

  return journal.id; // 返回 journal id 用于后续更新状态
}

/**
 * 单独运行小红书发布（供命令行调用）
 */
export async function runRedNotePublish() {
  try {
    const journalId = await publishRedNote();
    if (!journalId) {
      console.log("No article to publish");
      return;
    }

    // 更新 Notion 状态
    console.log("\nUpdating Notion status...");
    await updateStatus(journalId, "Published");
    console.log("Status updated to Published");

    console.log("\n=== RedNote publish complete ===");
  } catch (err) {
    console.error("RedNote publish error:", (err as Error).message);
    process.exit(1);
  }
}

/**
 * 发布到所有平台
 */
async function publishToAllPlatforms() {
  console.log("=== Starting publish automation ===\n");

  const journal = await fetchDailyJournal();
  if (!journal) {
    console.log("No journal to post today");
    return;
  }

  let twitterSuccess = false;
  let redNoteJournalId: string | null = null;

  // 发布到 Twitter
  try {
    twitterSuccess = await publishTwitter();
  } catch (err) {
    console.error("Twitter publish error:", (err as Error).message);
  }

  // 发布到小红书
  try {
    redNoteJournalId = await publishRedNote();
  } catch (err) {
    console.error("RedNote publish error:", (err as Error).message);
  }

  // 只有两个平台都成功才更新状态
  if (twitterSuccess && redNoteJournalId) {
    console.log("\nUpdating Notion status...");
    await updateStatus(journal.id, "Published");
    console.log("Status updated to Published");
  } else if (twitterSuccess || redNoteJournalId) {
    console.log("\n⚠ 部分平台发布成功，暂不更新状态");
  }

  console.log("\n=== Publish automation complete ===");
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
  console.log(`\n[${new Date().toISOString()}] Running hourly publish check`);
  try {
    await publishToAllPlatforms();
  } catch (err) {
    console.error("Publish error:", (err as Error).message);
  }
});

// Schedule reminder check at 8:00 PM every day
cron.schedule("0 20 * * *", async () => {
  console.log(`\n[${new Date().toISOString()}] Running scheduled reminder check`);
  try {
    await checkAndRemind();
  } catch (err) {
    console.error("Reminder check error:", (err as Error).message);
  }
});

console.log("Scheduler started:");
console.log("  - Publish check: every hour at :00 (Twitter + RedNote)");
console.log("  - Reminder check: 20:00 daily");

// Run initial check on startup
console.log("\nRunning initial publish check...");
publishToAllPlatforms()
  .then(() => {
    console.log("\nScheduler is running. Next actions:");
    console.log("  - Hourly: check for new articles with Status='Ready'");
    console.log("  - 20:00: send reminder if no article written today");
  })
  .catch((err) => {
    console.error("Initial check error:", (err as Error).message);
    console.log("\nScheduler is running, will retry on next hour...");
  });
