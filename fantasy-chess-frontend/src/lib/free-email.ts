import { supabase } from './supabase';

// Free email sending using Supabase Edge Functions
export interface FreeEmailData {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  emailType?: 'welcome' | 'weekly_results' | 'custom';
  userEmail?: string;
}

// Send email using the free Supabase Edge Function
export async function sendFreeEmail(emailData: FreeEmailData): Promise<{ 
  success: boolean; 
  provider?: string;
  messageId?: string; 
  error?: string 
}> {
  try {
    // Get access token for Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No access token available');
    }

    // Send email via SMTP edge function
    const response = await fetch('https://wdbwzvnkfbyzazodfhsw.supabase.co/functions/v1/send-smtp-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        to: emailData.to,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        textContent: emailData.textContent,
        emailType: emailData.emailType || 'custom',
        userEmail: emailData.userEmail,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email sending failed: ${error}`);
    }

    const result = await response.json();
    return { 
      success: true, 
      provider: result.provider,
      messageId: result.messageId 
    };
  } catch (error: any) {
    console.error('Error sending free email:', error);
    return { success: false, error: error.message };
  }
}

// Convenience functions for common email types
export async function sendWelcomeEmail(userEmail: string): Promise<{ success: boolean; error?: string }> {
  const result = await sendFreeEmail({
    to: userEmail,
    subject: 'Welcome to Fantasy League Chess!',
    emailType: 'welcome'
  });
  
  return { success: result.success, error: result.error };
}

export async function sendWeeklyResultsEmail(userEmail: string): Promise<{ success: boolean; error?: string }> {
  const result = await sendFreeEmail({
    to: userEmail,
    subject: 'Your Weekly Fantasy Chess Results',
    emailType: 'weekly_results',
    userEmail: userEmail
  });
  
  return { success: result.success, error: result.error };
}

export async function sendCustomEmail(
  to: string, 
  subject: string, 
  htmlContent: string, 
  textContent?: string
): Promise<{ success: boolean; error?: string }> {
  const result = await sendFreeEmail({
    to,
    subject,
    htmlContent,
    textContent,
    emailType: 'custom'
  });
  
  return { success: result.success, error: result.error };
}

