import { build } from "esbuild";

/**
 * `sharp` ships a native compiled addon (.node binary) — esbuild can only
 * bundle JS, so sharp must stay external and its actual package (including
 * the platform-specific binary) needs to exist in `dist/node_modules` at
 * runtime. This is the standard pattern for JS Actions with native deps;
 * see the README's "Publishing" section for the exact commit/prune steps.
 * gifenc has no types package and an unusual CJS export shape but is pure
 * JS, so it bundles fine and does NOT need to be external.
 */
const EXTERNAL_PACKAGES = ["sharp"];

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/index.js",
  external: EXTERNAL_PACKAGES,
  logLevel: "info",
});

console.log("Bundled to dist/index.js (sharp kept external — see comment above)");
