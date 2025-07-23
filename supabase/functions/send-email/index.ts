import { serve } from "https://deno.land/std/http/server.ts";

function withCorsHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }

  try {
    const { to, subject, text } = await req.json();
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL');

    if (!SENDGRID_API_KEY || !FROM_EMAIL) {
      return withCorsHeaders(new Response('Missing SENDGRID_API_KEY or FROM_EMAIL', { status: 500 }));
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL },
        subject,
        content: [{ type: 'text/plain', value: text }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return withCorsHeaders(new Response(`Failed to send email: ${error}`, { status: 500 }));
    }

    return withCorsHeaders(new Response('Email sent!', { status: 200 }));
  } catch (err) {
    return withCorsHeaders(new Response('Error: ' + (err?.message || err), { status: 500 }));
  }
}); 