import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { getSecretKey } from "../_shared/supabaseKeys.ts"
import { GENERIC_ERROR, logServerError } from "../_shared/publicError.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = getSecretKey()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase.rpc("auto_start_due_marketplaces")

    if (error) {
      logServerError("auto-start-marketplace", error)
      return new Response(
        JSON.stringify({
          success: false,
          error: GENERIC_ERROR,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Due turn-based marketplaces started",
        result: data,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    logServerError("auto-start-marketplace", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: GENERIC_ERROR,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
