import type { APIRoute } from "astro";

/**
 * Structured inquiry endpoint.
 *
 * Accepts the KEYVA inquiry form payload (one form per product series,
 * dynamic fields) and acks with { ok: true }. No dealer filtering — the
 * record goes straight to the backend of record.
 *
 * Abuse hardening (pre-CRM):
 *   - Honeypot field ("website") that real users never see or fill.
 *   - Per-client-IP token-bucket throttle so a single caller can't spam.
 *     The bucket is in-memory per Worker instance, so it resets on cold
 *     start / scale-out — adequate for a marketing form, not a WAF.
 *
 * Integration note: forward `record` to a real inbox / CRM / Durable Object
 * at the `// TODO` below. Until then this is a validated stub that keeps the
 * form UX fully functional.
 */

const HONEYPOT_KEY = "website";
const BURST = 3; // max concurrent submissions per IP
const REFILL_MS = 10 * 60 * 1000; // one token every 10 minutes → ~6/hr
const IP_TTL_MS = 30 * 60 * 1000; // evict idle IPs after 30 min

type TokenBucket = { tokens: number; last: number; seen: number };
const buckets = new Map<string, TokenBucket>();

// Lazy sweep: on each request, opportunistically drop IPs idle longer than
// IP_TTL_MS. No top-level timer (Workers don't expose setInterval at module
// scope and a module-scope timer would keep a bare Node process alive).
function sweepIdle(): void {
  const now = Date.now();
  for (const [ip, b] of buckets) if (now - b.seen > IP_TTL_MS) buckets.delete(ip);
}

function clientIp(req: Request): string {
  // On Cloudflare, the edge sets CF-Connecting-IP (the real client IP).
  // Fall back to X-Forwarded-For for local / non-CF dev environments.
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.slice(0, 45);
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 45);
  return "unknown";
}

function allow(ip: string): boolean {
  sweepIdle();
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) {
    b = { tokens: BURST, last: now, seen: now };
    buckets.set(ip, b);
  } else {
    // Refill toward BURST at the configured rate.
    const elapsed = now - b.last;
    const refill = (elapsed / REFILL_MS) * BURST;
    b.tokens = Math.min(BURST, b.tokens + refill);
    b.last = now;
    b.seen = now;
  }
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}

export const POST: APIRoute = async ({ request }) => {
  const ip = clientIp(request);

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return json({ ok: false, error: "Invalid payload." }, 400);
  }

  // Honeypot: any value in the hidden field = bot.
  if (typeof body[HONEYPOT_KEY] === "string" && body[HONEYPOT_KEY].trim() !== "") {
    return json({ ok: true }, 200); // silently ack to fool bots
  }

  if (typeof body.name !== "string" || typeof body.company !== "string" ||
      typeof body.email !== "string" || typeof body.application !== "string") {
    return json({ ok: false, error: "Invalid payload." }, 400);
  }

  const email = body.email as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "Invalid email address." }, 400);
  }

  const record = {
    receivedAt: new Date().toISOString(),
    name: (body.name as string).trim().slice(0, 200),
    company: (body.company as string).trim().slice(0, 200),
    email: email.slice(0, 320),
    phone: typeof body.phone === "string" ? body.phone.slice(0, 80) : "",
    product: typeof body.product === "string" ? body.product.slice(0, 60) : "",
    spec: typeof body.spec === "string" ? body.spec.slice(0, 120) : "",
    quantity: typeof body.quantity === "string" ? body.quantity.slice(0, 40) : "",
    material: typeof body.material === "string" ? body.material.slice(0, 120) : "",
    application: (body.application as string).trim().slice(0, 1000),
    notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : "",
    source: typeof body.source === "string" ? body.source.slice(0, 500) : undefined,
  };

  // Throttle after validation so legit payloads still get a clean 429, not 400.
  if (!allow(ip)) {
    return json({ ok: false, error: "Too many requests — please try again later." }, 429);
  }

  // Deliberately do NOT log raw PII to worker logs: only a redacted receipt.
  console.log(
    `[inquiry] ${record.product} · ${record.spec} from ${record.company.length}-char company (email omitted)`
  );

  // TODO: forward `record` to Resend/SendGrid/CRM (or a Durable Object) here.

  return json({ ok: true }, 200);
};

function json<T>(payload: T, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
