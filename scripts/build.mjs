import { build } from "esbuild";

const shared = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  sourcemap: true,
  target: "es2020",
};

async function buildBundle({ format, outfile, globalName, minify }) {
  await build({
    ...shared,
    format,
    outfile,
    globalName,
    minify: Boolean(minify),
  });
}

await buildBundle({
  format: "esm",
  outfile: "dist/mcp-view.esm.js",
});

await buildBundle({
  format: "esm",
  outfile: "dist/mcp-view.esm.min.js",
  minify: true,
});

await buildBundle({
  format: "iife",
  globalName: "McpView",
  outfile: "dist/mcp-view.umd.js",
});

await buildBundle({
  format: "iife",
  globalName: "McpView",
  outfile: "dist/mcp-view.umd.min.js",
  minify: true,
});
