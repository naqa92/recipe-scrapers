// The reader runs on the iPhone (Hermes): its bundle must not pull any Node built-in.
import { build } from "esbuild";

const result = await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  write: false,
  platform: "neutral",
  format: "esm",
  mainFields: ["browser", "module", "main"],
  conditions: ["browser", "import"],
  target: "es2022",
  minify: true,
  metafile: true,
  logLevel: "silent",
}).catch((e: { errors?: { text: string }[] }) => {
  console.error("✗ bundle failed:\n" + (e.errors ?? []).map((x) => "  " + x.text).join("\n"));
  process.exit(1);
});
const bytes = result.outputFiles[0]!.contents.length;
const nodeImports = Object.values(result.metafile.inputs).flatMap((i) => i.imports.filter((x) => x.path.startsWith("node:") || x.external));
if (nodeImports.length) {
  console.error("✗ Node imports:", nodeImports.map((x) => x.path));
  process.exit(1);
}
console.log(`✓ portable bundle, ${(bytes / 1024).toFixed(0)} KiB minified`);
