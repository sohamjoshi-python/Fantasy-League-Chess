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
    const { user_id, avatar_id } = await req.json();
    const { data: userAvatar } = await supabase
      .from("user_avatars")
      .select("owned")
      .eq("user_id", user_id)
      .eq("avatar_id", avatar_id)
      .single();
    if (!userAvatar || !userAvatar.owned) {
      return jsonResponse({ error: "You do not own this avatar" }, 400);
    }
    await supabase.from("user_avatars").update({ equipped: false }).eq("user_id", user_id);
    await supabase.from("user_avatars").update({ equipped: true }).eq("user_id", user_id).eq("avatar_id", avatar_id);
    const { data: avatar } = await supabase.from("avatars").select("image_url").eq("id", avatar_id).single();
    if (avatar) {
      await supabase.from("users").update({ selected_avatar_url: avatar.image_url }).eq("id", user_id);
    }
    return jsonResponse({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not equip avatar";
    return jsonResponse({ error: message }, 400);
  }
});
