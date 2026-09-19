import { supabase } from './supabase';

// Resend email sending using Supabase Edge Functions
export interface ResendEmailData {
  to: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  emailType?: 'welcome' | 'weekly_results' | 'custom';
  userEmail?: string;
}

// Send email using Resend via Supabase Edge Function
export async function sendResendEmail(emailData: ResendEmailData): Promise<{ 
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

    // Send email via Resend edge function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const response = await fetch(`${supabaseUrl}/functions/v1/send-resend-email`, {
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
      provider: result.provider || 'Resend',
      messageId: result.messageId 
    };
  } catch (error: any) {
    console.error('Error sending Resend email:', error);
    return { success: false, error: error.message };
  }
}

// Convenience functions for common email types
export async function sendWelcomeEmail(userEmail: string): Promise<{ success: boolean; error?: string }> {
  const result = await sendResendEmail({
    to: userEmail,
    subject: 'Welcome to Fantasy League Chess - Your Fantasy Chess Adventure Begins!',
    emailType: 'welcome'
  });
  
  return { success: result.success, error: result.error };
}

export async function sendWeeklyResultsEmail(userEmail: string): Promise<{ success: boolean; error?: string }> {
  const result = await sendResendEmail({
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
  const result = await sendResendEmail({
    to,
    subject,
    htmlContent,
    textContent,
    emailType: 'custom'
  });
  
  return { success: result.success, error: result.error };
}

