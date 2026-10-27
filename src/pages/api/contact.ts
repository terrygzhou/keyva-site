import type { APIRoute } from "astro";

/**
 * Enquiry form endpoint (stub).
 *
 * This is a static-site scaffold: it validates the payload and acks, but does
 * not yet persist anything. For real delivery, wire the `// TODO` below to a
 * real inbox or CRM (Resend / SendGrid / webhook) — or persist to a Durable
 * Object. The payload shape matches the contact form's inline script.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.name !== "string" || typeof body.email !== "string" || typeof body.message !== "string") {
    return new Response(JSON.stringify({ ok: false, error: "Invalid payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = body.email as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid email address." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // TODO: forward `record` to Resend/SendGrid/CRM (or a Durable Object) here.
  const record = {
    receivedAt: new Date().toISOString(),
    name: (body.name as string).trim().slice(0, 200),
    email: email.slice(0, 320),
    message: (body.message as string).trim().slice(0, 5000),
    source: typeof body.source === "string" ? body.source.slice(0, 500) : undefined,
  };

  // Deliberately do NOT log raw PII to worker logs: only a redacted receipt.
  console.log(
    `[enquiry] received ${record.message.length}-char message from ${record.name.length}-char name (email omitted)`
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
