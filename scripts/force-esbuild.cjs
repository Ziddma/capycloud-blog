const path = require("path");
const fs = require("fs");

const esbuildPackagePath = require.resolve("esbuild/package.json", { paths: [process.cwd()] });
const esbuildDir = path.dirname(esbuildPackagePath);
const esbuildBinary = path.join(esbuildDir, "bin", "esbuild");

if (fs.existsSync(esbuildBinary)) {
  process.env.ESBUILD_BINARY_PATH = esbuildBinary;
}
