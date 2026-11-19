// Copies the shared library and icon data from ../site into this package (runs before npm publish).
import { cpSync, mkdirSync } from "node:fs";
mkdirSync(new URL("../lib/", import.meta.url), { recursive: true });
cpSync(new URL("../../site/lib/icon.js", import.meta.url), new URL("../lib/icon.js", import.meta.url));
cpSync(new URL("../../site/icons.json", import.meta.url), new URL("../icons.json", import.meta.url));
console.log("synced lib/icon.js and icons.json");
