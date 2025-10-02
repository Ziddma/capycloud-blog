const Module = require('module');
const path = require('path');

const preferredEsbuildDir = path.join(
  process.cwd(),
  "node_modules/.pnpm/esbuild@0.25.4/node_modules/esbuild"
);

let resolvedEsbuild;
try {
  resolvedEsbuild = require.resolve(path.join(preferredEsbuildDir, "lib/main.js"));
} catch (error) {
  resolvedEsbuild = require.resolve('esbuild');
}

const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'esbuild') {
    return originalLoad(resolvedEsbuild, parent, isMain);
  }
  return originalLoad(request, parent, isMain);
};

const packageRoot = path.resolve(path.dirname(resolvedEsbuild), '..');
process.env.ESBUILD_BINARY_PATH = path.join(packageRoot, 'bin', 'esbuild');
