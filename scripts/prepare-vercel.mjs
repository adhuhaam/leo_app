import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiUrl = (process.env.API_URL ?? process.env.VITE_API_URL ?? "").replace(/\/+$/, "");

const templatePath = path.join(root, "vercel.template.json");
const outputPath = path.join(root, "vercel.json");
const sourcePath = existsSync(templatePath) ? templatePath : outputPath;
const config = JSON.parse(readFileSync(sourcePath, "utf8"));

if (apiUrl && !apiUrl.includes("REPLACE_WITH")) {
  config.rewrites = [
    { source: "/api/(.*)", destination: `${apiUrl}/api/$1` },
    { source: "/(.*)", destination: "/index.html" },
  ];
  console.log(`✓ vercel.json API rewrite → ${apiUrl}`);
} else {
  console.warn("⚠ API_URL not set — API rewrites use placeholder until you set API_URL on Vercel");
}

writeFileSync(outputPath, JSON.stringify(config, null, 2) + "\n");
