import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const baseConfig = defineCloudflareConfig();

export default {
  ...baseConfig,
  functions: {
    ...(baseConfig.functions ?? {}),
    notionImages: {
      runtime: "edge",
      placement: "global",
      entrypoint: "app/images/notion/route",
      routes: ["app/images/notion/route"],
      patterns: ["/images/notion*"],
    },
    notionCoverImages: {
      runtime: "edge",
      placement: "global",
      entrypoint: "app/images/notion-cover/route",
      routes: ["app/images/notion-cover/route"],
      patterns: ["/images/notion-cover*"],
    },
  },
};
