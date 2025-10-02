import { fetchAllPosts } from "../src/lib/notion";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function assertEnv() {
  const missing = ["NOTION_TOKEN", "NOTION_DATABASE_ID"].filter((key) => !process.env[key]);

  if (missing.length) {
    console.error(
      `Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.\n` +
        "Populate them in .env.local (or your deployment environment) before running cache-posts."
    );
    process.exit(1);
  }

}

async function cachePosts() {
  try {
    assertEnv();
    console.log("Fetching posts from Notion...");
    const allPosts = await fetchAllPosts({ forceRefresh: true, cacheTtlSeconds: 0 });

    const cachePath = path.join(process.cwd(), "posts-cache.json");
    fs.writeFileSync(cachePath, JSON.stringify(allPosts, null, 2));

    console.log(`✅ Successfully cached ${allPosts.length} posts.`);
  } catch (error) {
    console.error("Error caching posts:", error);
    process.exit(1);
  }
}

cachePosts();
