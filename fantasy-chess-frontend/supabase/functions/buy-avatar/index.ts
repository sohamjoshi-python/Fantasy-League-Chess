import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { user_id, avatar_id } = await req.json();

  const { data: avatar } = await supabase.from("avatars").select("price").eq("id", avatar_id).single();
  if (!avatar) return new Response(JSON.stringify({ error: "Avatar not found" }), { status: 404 });

  const { data: user } = await supabase.from("users").select("coins").eq("id", user_id).single();
  if (!user || user.coins < avatar.price) {
    return new Response(JSON.stringify({ error: "Not enough coins" }), { status: 400 });
  }

  await supabase.from("users").update({ coins: user.coins - avatar.price }).eq("id", user_id);
  await supabase.from("user_avatars").upsert({ user_id, avatar_id, owned: true });

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
}); 