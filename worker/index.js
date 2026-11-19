import { generateIcon } from "../site/lib/icon.js";

const hits = new Map(); // best-effort limiter per Worker instance; add a Cloudflare rate limiting rule too

export default {
  async fetch(req, env) {
    const origins = (env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin") || "";
    const allowed = origins.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin : origins[0] || "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      Vary: "Origin",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "content-type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json({ error: "Use POST" }, 405);
    if (!allowed) return json({ error: "Origin not allowed" }, 403);

    const ip = req.headers.get("CF-Connecting-IP") || "unknown";
    const now = Date.now();
    if (hits.size > 1000) hits.clear();
    const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (recent.length >= 10) return json({ error: "Too many requests. Try again in a few minutes." }, 429);
    recent.push(now);
    hits.set(ip, recent);

    let prompt;
    try {
      ({ prompt } = await req.json());
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    prompt = String(prompt || "").trim();
    if (prompt.length < 2 || prompt.length > 60) return json({ error: "Describe the icon in 2 to 60 characters." }, 400);

    try {
      return json(await generateIcon(env.ANTHROPIC_API_KEY, prompt));
    } catch (e) {
      return json({ error: "Could not generate a usable icon. Try different words." }, 502);
    }
  },
};
