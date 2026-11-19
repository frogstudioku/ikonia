// Shows how many icons each category has (target 50). Usage: node scripts/status.mjs [--names]
import { readFile } from "node:fs/promises";
const read = async (f) => JSON.parse(await readFile(new URL(`../site/${f}`, import.meta.url), "utf8"));
const cats = await read("categories.json"), icons = await read("icons.json");
if (process.argv.includes("--names")) { console.log(icons.map((i) => i.name).sort().join(", ")); process.exit(0); }
const per = {};
for (const i of icons) { const s = i.c || "miscellaneous-objects"; per[s] = (per[s] || 0) + 1; }
let group = "", done = 0;
for (const c of cats) {
  if (c.g !== group) { group = c.g; console.log(`\n${group}`); }
  const n = per[c.s] || 0; if (n >= 50) done++;
  console.log(`  ${String(n).padStart(2)}/50  ${c.s}`);
}
const unknown = Object.keys(per).filter((s) => !cats.some((c) => c.s === s));
if (unknown.length) console.log(`\nWarning: icons use unknown categories: ${unknown.join(", ")}`);
console.log(`\n${icons.length} icons. ${done}/${cats.length} categories complete.`);
