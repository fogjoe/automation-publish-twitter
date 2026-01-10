import { Client } from "@notionhq/client";
import "dotenv/config";

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  tags: string[]; // 新增：标签数组
}

/**
 * 清理 Markdown 格式，保留纯文本和换行
 */
function cleanMarkdown(text: string): string {
  return (
    text
      // 移除图片 ![alt](url)
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // 移除链接但保留文字 [text](url) -> text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 移除粗体 **text** 或 __text__
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      // 移除斜体 *text* 或 _text_
      .replace(/(\*|_)(.*?)\1/g, "$2")
      // 移除代码块 ```code```
      .replace(/```[\s\S]*?```/g, "")
      // 移除行内代码 `code`
      .replace(/`([^`]+)`/g, "$1")
      // 移除标题符号 # ## ###
      .replace(/^#{1,6}\s+/gm, "")
      // 移除引用 >
      .replace(/^>\s+/gm, "")
      // 移除列表符号 - * 数字.
      .replace(/^[\s]*[-*]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // 移除多余空行，但保留单个换行
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export async function fetchDailyJournal(): Promise<JournalEntry | null> {
  const today = new Date().toISOString().split("T")[0];

  const response = await notion.dataSources.query({
    data_source_id: databaseId,
    filter: {
      and: [
        { property: "Date", date: { equals: today } },
        { property: "Status", select: { equals: "Ready" } },
      ],
    },
  });

  if (response.results.length === 0) return null;

  const page = response.results[0] as any;
  const props = page.properties;

  // 获取标签（Multi-select 类型）
  const tags: string[] = [];
  if (props.Tags?.multi_select) {
    for (const tag of props.Tags.multi_select) {
      tags.push(tag.name);
    }
  }

  // 获取内容并清理 Markdown
  const rawContent = props.Content.rich_text[0]?.plain_text || "";
  const cleanedContent = cleanMarkdown(rawContent);

  return {
    id: page.id,
    title: props.Title.title[0]?.plain_text || "",
    content: cleanedContent,
    tags,
  };
}

export async function updateStatus(
  pageId: string,
  status: "Ready" | "Published"
): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: { select: { name: status } },
    },
  });
}

export async function checkHasWrittenToday(): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  const response = await notion.dataSources.query({
    data_source_id: databaseId,
    filter: {
      property: "Date",
      date: { equals: today },
    },
  });

  return response.results.length > 0;
}
