import { Client } from "@notionhq/client";
import "dotenv/config";

const notion = new Client({ auth: process.env.NOTION_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
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

  return {
    id: page.id,
    title: props.Title.title[0]?.plain_text || "",
    content: props.Content.rich_text[0]?.plain_text || "",
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
