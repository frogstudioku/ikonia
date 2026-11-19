// Shared by the browser, the Cloudflare Worker and the batch script.
// Pure ES module: no Node or browser APIs except fetch (only in generateIcon).

export const MODEL = "claude-sonnet-5-5";

export const STYLE_PROMPT = `You design icons for an open icon library.
Reply with ONLY one JSON object, no markdown, in exactly this shape:
{"name":"kebab-case-name","tags":"6-12 lowercase synonyms and related meanings separated by spaces","f":["closed shape path"],"l":"inner detail path or empty string","x":"open stroke path or empty string"}

Rules:
- viewBox is 24x24, keep coordinates between 2 and 22.
- Icons are drawn with stroke-width 1.75, round caps and round joins.
- "f" = closed shapes (array, max 4). They are filled in the solid style.
- "l" = details drawn inside the shapes. They are cut out in the solid style.
- "x" = open strokes outside the shapes. They are never filled.
- Use only the path commands M L H V C S Q T A Z. No text, transforms or other SVG elements.
- Keep it simple and recognisable, about 6 sub-paths at most, same visual weight as the examples.

Examples:
{"name":"lock","tags":"security password private secure protect safe","f":["M5 11h14v10H5z"],"l":"M12 15v2","x":"M8 11V8a4 4 0 0 1 8 0v3"}
{"name":"download","tags":"save get export device arrow down","f":[],"l":"","x":"M12 3v12M7 10l5 5 5-5M4 20h16"}`;

const PATH = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]*$/;

function path(s, max) {
  if (s == null || s === "") return "";
  if (typeof s !== "string" || s.length > max || !PATH.test(s)) throw new Error("Invalid path data");
  return s.trim();
}

// Validates and normalises an icon. Throws if anything looks wrong.
export function cleanIcon(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Icon is not an object");
  const name = String(raw.name || "").toLowerCase().trim().replace(/\s+/g, "-");
  if (!/^[a-z0-9-]{2,30}$/.test(name)) throw new Error("Invalid icon name");
  const tags = String(raw.tags || "").toLowerCase().replace(/[^a-z0-9 -]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  const f = (Array.isArray(raw.f) ? raw.f : []).slice(0, 4).map((d) => path(d, 700)).filter(Boolean);
  const l = path(raw.l, 900);
  const x = path(raw.x, 900);
  if (!f.length && !l && !x) throw new Error("Icon has no shapes");
  const c = /^[a-z0-9-]{2,40}$/.test(String(raw.c || "")) ? String(raw.c) : "";
  return { name, tags, f, l, x, c };
}

export function parseModelJson(text) {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("No JSON in model reply");
  return JSON.parse(text.slice(a, b + 1));
}

// Asks Claude for one icon and returns the validated result.
export async function generateIcon(apiKey, concept) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: STYLE_PROMPT,
      messages: [{ role: "user", content: `Icon concept: ${concept}` }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic API error ${r.status}`);
  const data = await r.json();
  const text = (data.content || []).map((b) => b.text || "").join("");
  return cleanIcon(parseModelJson(text));
}
