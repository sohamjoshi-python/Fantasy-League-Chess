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
  const { user_id } = await req.json();
  const { data: avatars } = await supabase.from("avatars").select("*");
  const { data: userAvatars } = await supabase.from("user_avatars").select("*").eq("user_id", user_id);
  const ownedIds = new Set(userAvatars?.filter((a) => a.owned).map((a) => a.avatar_id));
  const equippedId = userAvatars?.find((a) => a.equipped)?.avatar_id;
  const result = avatars?.map((a) => ({
    ...a,
    owned: ownedIds.has(a.id),
    equipped: a.id === equippedId
  }));
  return new Response(JSON.stringify(result), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
});