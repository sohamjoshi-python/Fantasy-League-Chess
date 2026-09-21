import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecretKey } from "../_shared/supabaseKeys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body ?? null), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getSecretKey()
    );
    const { user_id } = await req.json();
    const { data: avatars, error: avatarsError } = await supabase.from("avatars").select("*");
    if (avatarsError) {
      return jsonResponse({ error: avatarsError.message }, 500);
    }
    const { data: userAvatars, error: ownershipError } = await supabase
      .from("user_avatars")
      .select("*")
      .eq("user_id", user_id);
    if (ownershipError) {
      return jsonResponse({ error: ownershipError.message }, 500);
    }
    const ownedIds = new Set((userAvatars ?? []).filter((a) => a.owned).map((a) => a.avatar_id));
    const equippedId = (userAvatars ?? []).find((a) => a.equipped)?.avatar_id;
    const result = (avatars ?? []).map((a) => ({
      ...a,
      owned: ownedIds.has(a.id),
      equipped: a.id === equippedId,
    }));
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load avatars";
    return jsonResponse({ error: message }, 400);
  }
});
