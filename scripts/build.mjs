import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = join(root, "scripts", "index.template.html");
const outputPath = join(root, "index.html");
const marker = "__GAME_BUNDLE__";
const template = await readFile(templatePath, "utf8");
const defaultAnalyticsScriptSrc = "/_vercel/insights/script.js";
const analyticsScriptTag = `<script defer src="${defaultAnalyticsScriptSrc}"></script>`;

function getAnalyticsScriptSrc() {
  const rawConfig = process.env.VERCEL_OBSERVABILITY_CLIENT_CONFIG;
  if (!rawConfig) return defaultAnalyticsScriptSrc;

  let config;
  try {
    config = JSON.parse(rawConfig);
  } catch {
    throw new Error("VERCEL_OBSERVABILITY_CLIENT_CONFIG deve conter JSON válido.");
  }

  const configuredSrc = config?.analytics?.scriptSrc;
  if (configuredSrc === undefined || configuredSrc === null || configuredSrc === "") {
    return defaultAnalyticsScriptSrc;
  }
  if (typeof configuredSrc !== "string" || !/^\/?[\w/-]+\/script\.js$/.test(configuredSrc)) {
    throw new Error("analytics.scriptSrc deve ser um caminho relativo terminado em /script.js.");
  }

  return configuredSrc.startsWith("/") ? configuredSrc : `/${configuredSrc}`;
}

const analyticsScriptSrc = getAnalyticsScriptSrc();

if (!template.includes(marker)) {
  throw new Error(`Marcador ${marker} não encontrado em ${templatePath}`);
}
if (!template.includes(analyticsScriptTag)) {
  throw new Error("Referência padrão do script de Vercel Analytics não encontrada no template.");
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

const html = template
  .replace(marker, bundle)
  .replace(analyticsScriptTag, `<script defer src="${analyticsScriptSrc}"></script>`);
await writeFile(outputPath, html, "utf8");
console.log(`HTML jogável gerado: ${outputPath}`);
console.log(`Vercel Analytics script: ${analyticsScriptSrc}`);
