export async function notifyUser(to: string, subject: string, text: string) {
  // TODO: Replace <your-project-ref> with your actual Supabase project ref
  await fetch('https://<your-project-ref>.functions.supabase.co/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, text }),
  });
} 