// Supabase's new API keys (sb_publishable_... / sb_secret_...) replace the
// legacy anon and service_role JWTs. Edge Function secrets may not start with
// SUPABASE_, so the new keys are stored under the SB_ prefix. The legacy
// variables are auto-injected by the platform and stay as a fallback until the
// legacy keys are disabled in the dashboard.

export function getSecretKey(): string {
  const key =
    Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!key) {
    throw new Error(
      "Missing SB_SECRET_KEY (set it with: supabase secrets set SB_SECRET_KEY=sb_secret_...)"
    )
  }
  return key
}

export function getPublishableKey(): string {
  const key =
    Deno.env.get("SB_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")
  if (!key) {
    throw new Error(
      "Missing SB_PUBLISHABLE_KEY (set it with: supabase secrets set SB_PUBLISHABLE_KEY=sb_publishable_...)"
    )
  }
  return key
}
