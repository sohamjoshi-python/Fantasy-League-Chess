import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Kept deployed (not deleted) so the slug cannot be reclaimed; every request is refused.
export function serveRetired() {
  serve((req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders })
    }
    return new Response(JSON.stringify({ success: false, error: "This endpoint has been retired." }), {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  })
}
