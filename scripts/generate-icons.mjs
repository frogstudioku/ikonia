// Usage: ANTHROPIC_API_KEY=... node scripts/generate-icons.mjs "rocket, coffee, shield" [category-slug]
import { readFile, writeFile } from "node:fs/promises";
import { generateIcon } from "../site/lib/icon.js";

const FILE = new URL("../site/icons.json", import.meta.url);
const category = process.argv[3] || ""; // optional category slug from site/categories.json
const words = (process.argv[2] || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);

if (!process.env.ANTHROPIC_API_KEY) { console.error("Set ANTHROPIC_API_KEY first."); process.exit(1); }
if (!words.length) { console.error('Usage: node scripts/generate-icons.mjs "rocket, coffee, shield"'); process.exit(1); }

const icons = JSON.parse(await readFile(FILE, "utf8"));
for (const w of words) {
  try {
    const icon = await generateIcon(process.env.ANTHROPIC_API_KEY, w);
    if (category) icon.c = category;
    if (icons.some((i) => i.name === icon.name)) { console.log(`skip   ${icon.name} (already exists)`); continue; }
    icons.push(icon);
    console.log(`added  ${icon.name}`);
  } catch (e) {
    console.error(`failed "${w}": ${e.message}`);
  }
}
icons.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(FILE, JSON.stringify(icons).replace(/},{/g, "},\n{").replace(/^\[/, "[\n").replace(/\]$/, "\n]") + "\n");
