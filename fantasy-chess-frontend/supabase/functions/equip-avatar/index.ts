import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { user_id, avatar_id } = await req.json();
  const { data: userAvatar } = await supabase
    .from("user_avatars")
    .select("owned")
    .eq("user_id", user_id)
    .eq("avatar_id", avatar_id)
    .single();
  if (!userAvatar || !userAvatar.owned) {
    return new Response(JSON.stringify({ error: "You do not own this avatar" }), { status: 400, headers: corsHeaders });
  }
  await supabase.from("user_avatars").update({ equipped: false }).eq("user_id", user_id);
  await supabase.from("user_avatars").update({ equipped: true }).eq("user_id", user_id).eq("avatar_id", avatar_id);
  const { data: avatar } = await supabase.from("avatars").select("image_url").eq("id", avatar_id).single();
  if (avatar) {
    await supabase.from("users").update({ selected_avatar_url: avatar.image_url }).eq("id", user_id);
  }
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}); 