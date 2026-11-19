// Starts the server over stdio and calls each tool. Run: npm test
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const env = { ...process.env, IKONIA_CUSTOM_ICONS: join(mkdtempSync(join(tmpdir(), "ikonia-")), "icons.json") };
delete env.ANTHROPIC_API_KEY;
const client = new Client({ name: "test", version: "0" });
await client.connect(new StdioClientTransport({ command: "node", args: [new URL("./server.js", import.meta.url).pathname], env }));
const call = async (name, args) => (await client.callTool({ name, arguments: args }));
const txt = (r) => r.content[0].text;

const tools = (await client.listTools()).tools.map((t) => t.name);
assert.deepEqual(tools.sort(), ["generate_icon", "get_icon", "search_icons"]);

let r = await call("search_icons", { query: "save to device" });
assert.match(txt(r), /^download:/m); console.log("search ok:\n" + txt(r));

r = await call("get_icon", { name: "lock", style: "solid", background: "#101010" });
assert.match(txt(r), /<svg[^>]+xmlns/); assert.match(txt(r), /stroke="#101010"/); console.log("\nsvg ok:\n" + txt(r));

r = await call("get_icon", { name: "wallet", format: "react", size: 20 });
assert.match(txt(r), /export function WalletIcon\(props\)/); assert.match(txt(r), /strokeWidth="1.75"/); console.log("\nreact ok:\n" + txt(r));

r = await call("get_icon", { name: "lok" });
assert.equal(r.isError, true); console.log("\nnot found ok:", txt(r));

r = await call("get_icon", { name: "lock", color: 'red" onload="x' }).catch((e) => ({ isError: true, content: [{ text: String(e.message) }] }));
assert.equal(r.isError, true); console.log("injection rejected ok");

r = await call("generate_icon", { concept: "rocket" });
assert.equal(r.isError, true); assert.match(txt(r), /ANTHROPIC_API_KEY/); console.log("generate without key ok");

await client.close();
console.log("\nall tests passed");
