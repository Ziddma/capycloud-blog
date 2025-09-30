import { fetchPublishedPosts, getPostFromNotion } from "../src/lib/notion";
import fs from "fs";
import path from "path";
import GithubSlugger from "github-slugger";

async function cachePosts() {
  try {
    console.log("Fetching posts from Notion...");
    const posts = await fetchPublishedPosts();

    const allPosts = [];

    for (const post of posts) {
      const postDetails = await getPostFromNotion(post.id);
      if (postDetails) {
        // 🆕 generate slug untuk tiap heading agar konsisten dengan rehype-slug
        const slugger = new GithubSlugger();
        const fixedHeadings = postDetails.headings.map((h) => ({
          ...h,
          slug: slugger.slug(h.text),
        }));

        allPosts.push({
          ...postDetails,
          headings: fixedHeadings,
        });
      }
    }

    const cachePath = path.join(process.cwd(), "posts-cache.json");
    fs.writeFileSync(cachePath, JSON.stringify(allPosts, null, 2));

    console.log(`✅ Successfully cached ${allPosts.length} posts.`);
  } catch (error) {
    console.error("Error caching posts:", error);
    process.exit(1);
  }
}

cachePosts();
