// Adds icons written by Claude in the chat (no API credit needed).
// Usage: node scripts/add-icons.mjs new-icons.json --category=finance-banking
// Category slugs are in site/categories.json. Icons that already carry a "c" field keep it.
import { readFile, writeFile } from "node:fs/promises";
import { cleanIcon } from "../site/lib/icon.js";

const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith("--"));
const category = (args.find((a) => a.startsWith("--category=")) || "").slice(11);
if (!src) { console.error("Usage: node scripts/add-icons.mjs new-icons.json --category=slug"); process.exit(1); }

const cats = JSON.parse(await readFile(new URL("../site/categories.json", import.meta.url), "utf8"));
const known = (s) => cats.some((c) => c.s === s);
if (category && !known(category)) { console.error(`Unknown category "${category}". See site/categories.json.`); process.exit(1); }

const raw = await readFile(src, "utf8");
const a = raw.search(/[\[{]/);
const b = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
if (a < 0 || b < a) { console.error("No JSON found in that file."); process.exit(1); }
let data = JSON.parse(raw.slice(a, b + 1));
if (!Array.isArray(data)) data = [data];

const FILE = new URL("../site/icons.json", import.meta.url);
const icons = JSON.parse(await readFile(FILE, "utf8"));
let added = 0;
for (const item of data) {
  try {
    const icon = cleanIcon(item);
    if (!icon.c && category) icon.c = category;
    if (icon.c && !known(icon.c)) throw new Error(`unknown category "${icon.c}"`);
    if (icons.some((i) => i.name === icon.name)) { console.log(`skip     ${icon.name} (already exists)`); continue; }
    icons.push(icon); added++;
    console.log(`added    ${icon.name}${icon.c ? "" : "  (no category: shows under Miscellaneous Objects)"}`);
  } catch (e) {
    console.error(`rejected ${item && item.name}: ${e.message}`);
  }
}
icons.sort((x, y) => x.name.localeCompare(y.name));
await writeFile(FILE, JSON.stringify(icons).replace(/},{/g, "},\n{").replace(/^\[/, "[\n").replace(/\]$/, "\n]") + "\n");
console.log(`\n${added} new icon(s). Total: ${icons.length}. Commit site/icons.json to publish.`);
