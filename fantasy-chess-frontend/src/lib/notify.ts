export async function notifyUser(to: string, subject: string, text: string, accessToken: string) {
  await fetch('https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, subject, text }),
  });
} 