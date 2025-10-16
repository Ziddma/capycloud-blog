import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "prod-files-secure.s3.us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "www.notion.so",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.notion-static.com",
      },
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "**/@img/sharp*/**",
      "**/sharp/lib/**",
    ],
  },
  /* config options here */
};

export default nextConfig;
