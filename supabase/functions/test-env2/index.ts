import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
  const FROM_EMAIL = 'no-reply@fantasyleaguechess.com';
  console.log('SENDGRID_API_KEY:', SENDGRID_API_KEY);
  console.log('FROM_EMAIL:', FROM_EMAIL);

  return new Response(
    JSON.stringify({
      SENDGRID_API_KEY: SENDGRID_API_KEY ? 'set' : 'not set',
      FROM_EMAIL: FROM_EMAIL || 'not set'
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
});