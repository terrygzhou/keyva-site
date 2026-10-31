import type { APIRoute } from "astro";

/**
 * Structured inquiry endpoint.
 *
 * Accepts the KEYVA inquiry form payload (one form per product series,
 * dynamic fields) and acks with { ok: true }. No dealer filtering — the
 * record goes straight to the backend of record.
 *
 * Integration note: forward `record` to a real inbox / CRM / Durable Object
 * at the `// TODO` below. Until then this is a validated stub that keeps the
 * form UX fully functional.
 */
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.company !== "string" ||
    typeof body.email !== "string" ||
    typeof body.application !== "string"
  ) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid payload." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const email = body.email as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid email address." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
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

  // Deliberately do NOT log raw PII to worker logs: only a redacted receipt.
  console.log(
    `[inquiry] ${record.product} · ${record.spec} from ${record.company.length}-char company (email omitted)`
  );

  // TODO: forward `record` to Resend/SendGrid/CRM (or a Durable Object) here.

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
