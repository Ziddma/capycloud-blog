import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { NotionToMarkdown } from "notion-to-md";
import type { Annotations, MdBlock } from "notion-to-md/build/types";
import GithubSlugger from "github-slugger";

const NOTION_COLORS: Record<
  string,
  { color?: string; background?: string; text?: string }
> = {
  red: { color: "#E03A45" },
  blue: { color: "#0B6E99" },
  green: { color: "#0F7B58" },
  yellow: { color: "#B76E00" },
  orange: { color: "#D9730D" },
  purple: { color: "#5A2CB4" },
  pink: { color: "#AD1A72" },
  brown: { color: "#634634" },
  gray: { color: "#9B9A97" },
  red_background: { background: "#FBE4E4", text: "#7F1D1D" },
  blue_background: { background: "#DDEBF5", text: "#0B658A" },
  green_background: { background: "#DFF4EC", text: "#0F5132" },
  yellow_background: { background: "#FEF3C7", text: "#92400E" },
  orange_background: { background: "#FFF0E5", text: "#7C2D12" },
  purple_background: { background: "#F3E8FF", text: "#5B21B6" },
  pink_background: { background: "#FCE7F3", text: "#9D174D" },
  brown_background: { background: "#EDE7E3", text: "#4B3621" },
  gray_background: { background: "#F3F4F6", text: "#374151" },
};

const CODE_COLOR_FLAGS = new Set(["red", "green", "blue"]);
const CODE_SEGMENT_PREFIX = "__NCOLOR_START:";
const CODE_SEGMENT_SUFFIX = "__NCOLOR_END__";

export interface Post {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
  coverImageOriginal?: string;
  description: string;
  date: string;
  content: string;
  author?: string;
  tags?: string[];
  category?: string;
  headings: Array<{ level: number; text: string; slug: string }>;
  status?: string;
}

class ColorAwareNotionToMarkdown extends NotionToMarkdown {
  annotatePlainText(text: string, annotations: Annotations): string {
    const annotated = super.annotatePlainText(text, annotations);
    const colorKey = annotations.color;
    if (!colorKey || colorKey === "default") return annotated;

    const leading = annotated.match(/^(\s*)/)?.[0] ?? "";
    const trailing = annotated.match(/(\s*)$/)?.[0] ?? "";
    const core = annotated.trim();
    if (!core) return annotated;

    const { color, background, text: textColor } =
      NOTION_COLORS[colorKey] ?? {};
    const styles = [
      color ? `color:${color}` : "",
      background ? `background-color:${background}` : "",
      textColor ? `color:${textColor}` : "",
    ].filter(Boolean);
    const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";

    if (annotations.bold && /^<strong>.*<\/strong>$/.test(core)) {
      const inner = core.replace(/^<strong>(.*)<\/strong>$/, "$1");
      return `${leading}<strong class="notion-${colorKey}"${styleAttr}>${inner}</strong>${trailing}`;
    }

    return `${leading}<span class="notion-${colorKey}"${styleAttr}>${core}</span>${trailing}`;
  }
}

function collectHeadings(blocks: MdBlock[], slugger: GithubSlugger) {
  const items: Array<{ level: number; text: string; slug: string }> = [];

  for (const block of blocks) {
    if (block.type?.startsWith("heading_")) {
      const cleanText = block.parent
        .replace(/^#+\s*/, "")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/[*_`~]/g, "")
        .trim();

      const slug = slugger.slug(cleanText || block.blockId);

      items.push({
        level: Number(block.type.split("_")[1]),
        text: cleanText,
        slug,
      });
    }
    if (block.children?.length) {
      items.push(...collectHeadings(block.children, slugger));
    }
  }

  return items;
}

function injectCodeColorFlag(
  markdown: string,
  color: "red" | "green" | "blue",
): string {
  const lines = markdown.split("\n");
  if (!lines[0]?.startsWith("```")) return markdown;
  const flag = `__CODE_COLOR:${color}__`;
  if (lines[1]?.startsWith("__CODE_COLOR:")) {
    lines[1] = flag;
  } else {
    lines.splice(1, 0, flag);
  }
  return lines.join("\n");
}

async function annotateCodeBlockColors(
  notion: Client,
  blocks: MdBlock[],
): Promise<void> {
  for (const block of blocks) {
    if (block.type === "code") {
      try {
        const notionBlock: any = await notion.blocks.retrieve({
          block_id: block.blockId,
        });
        const richSegments = Array.isArray(notionBlock?.code?.rich_text)
          ? (notionBlock.code.rich_text as any[])
          : [];

        let composed = "";

        for (const segment of richSegments) {
          const text = segment?.plain_text ?? "";
          if (!text) continue;

          let segmentColor = segment?.annotations?.color as
            | string
            | undefined;
          if (segmentColor && segmentColor !== "default") {
            segmentColor = segmentColor.replace(/_background$/, "").toLowerCase();
          } else {
            segmentColor = undefined;
          }

          if (segmentColor && CODE_COLOR_FLAGS.has(segmentColor)) {
            composed += `${CODE_SEGMENT_PREFIX}${segmentColor}__${text}${CODE_SEGMENT_SUFFIX}`;
          } else {
            composed += text;
          }
        }

        if (composed) {
          const language =
            typeof notionBlock?.code?.language === "string"
              ? notionBlock.code.language.toLowerCase()
              : "plaintext";
          const body = composed.trim();
          block.parent = `\`\`\`${language}\n${body}\n\`\`\``;
        }

        const candidates: Array<string | undefined> = [
          notionBlock?.code?.color,
          notionBlock?.color,
        ];

        const match = candidates
          .map((color) =>
            color ? color.replace(/_background$/, "").toLowerCase() : undefined,
          )
          .find((color) => (color ? CODE_COLOR_FLAGS.has(color) : false));

        if (match) {
          block.parent = injectCodeColorFlag(block.parent, match as
            | "red"
            | "green"
            | "blue");
        }
      } catch (error) {
        console.error("Error retrieving code block color:", error);
      }
    }

    if (block.children?.length) {
      await annotateCodeBlockColors(notion, block.children);
    }
  }
}

function ensureDatabaseId(
  provided: string | undefined,
  fallback?: string,
): string {
  if (provided) return provided;
  if (fallback) return fallback;
  throw new Error("Missing Notion database ID");
}

function sortPostsByDate(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const dateA = new Date(a.date ?? "").getTime();
    const dateB = new Date(b.date ?? "").getTime();
    return dateB - dateA;
  });
}

export interface NotionBridgeConfig {
  auth: string;
  databaseId?: string;
}

export function createNotionBridge(config: NotionBridgeConfig) {
  const notion = new Client({ auth: config.auth });
  const n2m = new ColorAwareNotionToMarkdown({ notionClient: notion });

  async function fetchPublishedPosts(
    databaseId?: string,
  ): Promise<PageObjectResponse[]> {
    const targetDatabaseId = ensureDatabaseId(databaseId, config.databaseId);
    const response: QueryDatabaseResponse = await notion.databases.query({
      database_id: targetDatabaseId,
      filter: {
        and: [
          {
            property: "Status",
            status: {
              equals: "Published",
            },
          },
        ],
      },
      sorts: [
        {
          property: "Published Date",
          direction: "descending",
        },
      ],
    });

    return response.results as PageObjectResponse[];
  }

  async function getDatabaseStructure(databaseId?: string) {
    const targetDatabaseId = ensureDatabaseId(databaseId, config.databaseId);
    return notion.databases.retrieve({ database_id: targetDatabaseId });
  }

  const configuredDatabaseId = normalizeId(config.databaseId) ?? undefined;

  async function buildPostFromPage(pageId: string): Promise<Post | null> {
    try {
      const page = (await notion.pages.retrieve({
        page_id: pageId,
      })) as PageObjectResponse;

      if (
        page.parent?.type === "database_id" &&
        configuredDatabaseId &&
        normalizeId(page.parent.database_id) !== configuredDatabaseId
      ) {
        // Ignore pages from other databases
        return null;
      }

      const mdBlocks = await n2m.pageToMarkdown(pageId);
      await annotateCodeBlockColors(notion, mdBlocks);
      const { parent: contentString } = n2m.toMarkdownString(mdBlocks);

      const slugger = new GithubSlugger();
      const headings = collectHeadings(mdBlocks, slugger);

      const paragraphs = contentString
        .split("\n")
        .filter((line: string) => line.trim().length > 0);
      const firstParagraph = paragraphs[0] || "";
      const description =
        firstParagraph.slice(0, 160) +
        (firstParagraph.length > 160 ? "..." : "");

      const properties = page.properties as any;

      const coverImageOriginal = (() => {
        const featured = properties["Featured Image"];
        if (
          featured?.type === "files" &&
          Array.isArray(featured.files) &&
          featured.files.length
        ) {
          const file = featured.files[0];
          if (file.type === "external") return file.external.url;
          if (file.type === "file") return file.file.url;
        }
        if (typeof featured?.url === "string" && featured.url) {
          return featured.url;
        }
        if (page.cover?.type === "external") return page.cover.external.url;
        if (page.cover?.type === "file") return page.cover.file.url;
        return undefined;
      })();

      const coverImage = coverImageOriginal;

      const post: Post = {
        id: page.id,
        title: properties.Title?.title?.[0]?.plain_text || "Untitled",
        slug:
          properties.Title?.title?.[0]?.plain_text
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "untitled",
        coverImage,
        coverImageOriginal,
        description,
        date:
          properties["Published Date"]?.date?.start ||
          new Date().toISOString(),
        content: contentString,
        author: properties.Author?.people?.[0]?.name,
        tags: properties.Tags?.multi_select?.map((tag: any) => tag.name) || [],
        category: properties.Category?.select?.name,
        headings,
        status: properties.Status?.status?.name,
      };

      return post;
    } catch (error) {
      console.error("Error building post from Notion:", error);
      return null;
    }
  }

  return {
    notion,
    n2m,
    fetchPublishedPosts,
    getDatabaseStructure,
    buildPostFromPage,
    sortPostsByDate,
  };
}

export type NotionBridge = ReturnType<typeof createNotionBridge>;
function normalizeId(value?: string | null): string | null {
  if (!value) return null;
  return value.replace(/-/g, "");
}
