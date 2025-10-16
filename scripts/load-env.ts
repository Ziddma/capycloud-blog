import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const rootDir = process.cwd();
const envFiles = [".env.local", ".env"];

for (const filename of envFiles) {
  const fullPath = path.join(rootDir, filename);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: false });
  }
}
