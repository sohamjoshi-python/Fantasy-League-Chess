import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { user_id, avatar_id } = await req.json();
    const { data: avatar } = await supabase.from("avatars").select("price").eq("id", avatar_id).single();
    if (!avatar) return jsonResponse({ error: "Avatar not found" }, 404);
    const { data: user } = await supabase.from("users").select("coins").eq("id", user_id).single();
    if (!user || user.coins < avatar.price) {
      return jsonResponse({ error: "Not enough coins" }, 400);
    }
    await supabase.from("users").update({ coins: user.coins - avatar.price }).eq("id", user_id);
    await supabase.from("user_avatars").upsert({ user_id, avatar_id, owned: true });
    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed";
    return jsonResponse({ error: message }, 400);
  }
});
