import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type Caller =
  | { kind: 'service' }
  | { kind: 'user'; id: string; email: string | null }
  | { kind: 'anonymous' }

// SUPABASE_SECRET_KEYS is injected by the platform as JSON (name -> sb_secret_... key).
function serviceKeys(): string[] {
  const keys = [Deno.env.get('SB_SECRET_KEY'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')]
  const bundle = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (bundle) {
    try {
      const parsed = JSON.parse(bundle)
      const values = Array.isArray(parsed) ? parsed : Object.values(parsed ?? {})
      for (const value of values) {
        if (typeof value === 'string') keys.push(value)
      }
    } catch {
      keys.push(...bundle.split(','))
    }
  }
  return keys.map((key) => key?.trim() ?? '').filter((key) => key.length > 0)
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Who sent this request: our own servers (secret key), a signed-in user, or anyone else. */
export async function identifyCaller(req: Request, admin: SupabaseClient): Promise<Caller> {
  const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const apikey = (req.headers.get('apikey') || '').trim()

  const keys = serviceKeys()
  const presented = [bearer, apikey].filter((value) => value.length > 0)
  if (presented.some((value) => keys.some((key) => sameSecret(value, key)))) {
    return { kind: 'service' }
  }

  if (bearer.split('.').length === 3) {
    const { data, error } = await admin.auth.getUser(bearer)
    if (!error && data?.user) {
      return { kind: 'user', id: data.user.id, email: data.user.email ?? null }
    }
  }

  return { kind: 'anonymous' }
}

export function denied(corsHeaders: Record<string, string>, status = 401): Response {
  return new Response(
    JSON.stringify({ success: false, error: status === 429 ? 'Too many requests. Try again later.' : 'Not allowed.' }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}
