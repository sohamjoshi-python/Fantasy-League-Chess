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
  const { data: avatar } = await supabase.from("avatars").select("price").eq("id", avatar_id).single();
  if (!avatar) return new Response(JSON.stringify({ error: "Avatar not found" }), { status: 404, headers: corsHeaders });
  const { data: user } = await supabase.from("users").select("coins").eq("id", user_id).single();
  if (!user || user.coins < avatar.price) {
    return new Response(JSON.stringify({ error: "Not enough coins" }), { status: 400, headers: corsHeaders });
  }
  await supabase.from("users").update({ coins: user.coins - avatar.price }).eq("id", user_id);
  await supabase.from("user_avatars").upsert({ user_id, avatar_id, owned: true });
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}); 