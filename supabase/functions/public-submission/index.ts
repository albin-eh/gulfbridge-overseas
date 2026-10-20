import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): HeadersInit {
  const permittedOrigin = origin && allowedOrigins.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": permittedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function response(status: number, payload: Record<string, unknown>, headers: HeadersInit) {
  return new Response(JSON.stringify(payload), { status, headers });
}

async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    if (origin && !allowedOrigins.includes(origin)) return new Response(null, { status: 403, headers });
    return new Response("ok", { headers });
  }
  if (request.method !== "POST") return response(405, { error: "method_not_allowed" }, headers);
  if (origin && !allowedOrigins.includes(origin)) return response(403, { error: "origin_not_allowed" }, headers);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 20_000) return response(413, { error: "request_too_large" }, headers);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateLimitSalt = Deno.env.get("RATE_LIMIT_SALT");
  if (!supabaseUrl || !serviceRoleKey || !rateLimitSalt) {
    console.error("Public submission function is missing required server configuration.");
    return response(503, { error: "service_unavailable" }, headers);
  }

  let body: Record<string, unknown>;
  try {
    const reader = request.body?.getReader();
    if (!reader) return response(400, { error: "invalid_request" }, headers);
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > 20_000) {
        await reader.cancel();
        return response(413, { error: "request_too_large" }, headers);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return response(400, { error: "invalid_request" }, headers);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return response(400, { error: "invalid_request" }, headers);
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = request.headers.get("x-real-ip")?.trim()
    || forwarded?.split(",").at(-1)?.trim()
    || "unknown";
  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { error: rateError } = await client.rpc("check_public_submission_rate_limit", {
    p_ip_hash: await hashIp(clientIp, rateLimitSalt),
  });
  if (rateError) {
    if (rateError.message.includes("rate_limited")) return response(429, { error: "rate_limited" }, headers);
    console.error("Unable to apply public submission rate limit.", rateError.code);
    return response(503, { error: "service_unavailable" }, headers);
  }

  if (body.kind === "application") {
    if (body.privacyConsent !== true) return response(400, { error: "consent_required" }, headers);
    const { data, error } = await client.rpc("submit_application", {
      p_job_id: body.jobId,
      p_applicant_name: body.applicantName,
      p_email: body.email,
      p_phone: body.phone,
      p_current_location: body.currentLocation,
      p_preferred_destination: body.preferredDestination,
      p_experience: body.experience,
      p_qualifications: body.qualifications,
      p_message: body.message ?? null,
      p_privacy_consent: body.privacyConsent,
      p_privacy_notice_version: body.privacyNoticeVersion,
    });
    if (error) {
      if (error.code === "23505") return response(409, { error: "duplicate_application" }, headers);
      if (error.code === "22023") return response(400, { error: "invalid_or_unavailable_application" }, headers);
      console.error("Application submission failed.", error.code);
      return response(503, { error: "submission_failed" }, headers);
    }
    return response(200, { reference: data }, headers);
  }

  if (body.kind === "enquiry") {
    if (body.consent !== true) return response(400, { error: "consent_required" }, headers);
    const { error } = await client.rpc("submit_enquiry", {
      p_name: body.name,
      p_email: body.email,
      p_phone: body.phone ?? null,
      p_enquiry_type: body.enquiryType,
      p_message: body.message,
      p_consent: body.consent,
    });
    if (error) {
      if (error.code === "22023") return response(400, { error: "invalid_enquiry" }, headers);
      console.error("Enquiry submission failed.", error.code);
      return response(503, { error: "submission_failed" }, headers);
    }
    return response(200, { received: true }, headers);
  }

  return response(400, { error: "invalid_request" }, headers);
});
