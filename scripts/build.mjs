import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = join(root, "scripts", "index.template.html");
const outputPath = join(root, "index.html");
const marker = "__GAME_BUNDLE__";
const template = await readFile(templatePath, "utf8");

if (!template.includes(marker)) {
  throw new Error(`Marcador ${marker} não encontrado em ${templatePath}`);
}

const result = await build({
  absWorkingDir: root,
  entryPoints: ["game/browser.ts"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2020",
  minify: true,
  legalComments: "none",
});

const bundle = result.outputFiles[0]?.text;
if (!bundle) throw new Error("O compilador não gerou o motor do jogo.");

await writeFile(outputPath, template.replace(marker, bundle), "utf8");
console.log(`HTML jogável gerado: ${outputPath}`);
