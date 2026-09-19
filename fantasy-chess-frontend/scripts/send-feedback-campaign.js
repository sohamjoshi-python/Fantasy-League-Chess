import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
dotenv.config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'),
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_FEEDBACK_URL = 'https://fantasyleaguechess.com/feedback';
const EMAIL_FUNCTION_NAME = 'send-resend-email';
const SUPPORT_EMAIL = 'soham@fantasyleaguechess.com';
const CAMPAIGNS = new Set(['generic', 'known', 'why-flc', 'both']);

const args = parseArgs(process.argv.slice(2));

const campaign = args.campaign || 'generic';
const shouldSend = Boolean(args.send);
const feedbackUrl = args.feedbackUrl || DEFAULT_FEEDBACK_URL;
const limit = args.limit ? Number(args.limit) : null;
const onlyRecipients = args.to
  ? new Set(args.to.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean))
  : null;

if (!CAMPAIGNS.has(campaign)) {
  fail(`Unknown campaign "${campaign}". Use one of: ${Array.from(CAMPAIGNS).join(', ')}`);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  fail('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your environment.');
}

if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
  fail('--limit must be a positive whole number.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

main().catch((error) => {
  console.error('Feedback campaign failed:', error);
  process.exit(1);
});

async function main() {
  const users = await fetchAuthUsers();
  const recipients = users
    .filter((user) => user.email)
    .filter((user) => !onlyRecipients || onlyRecipients.has(user.email.toLowerCase()))
    .slice(0, limit || undefined);

  if (recipients.length === 0) {
    console.log('No matching recipients found.');
    return;
  }

  const selectedCampaigns = campaign === 'both' ? ['generic', 'why-flc'] : [campaign];
  const emails = recipients.flatMap((user) =>
    selectedCampaigns.map((selectedCampaign) => ({
      campaign: selectedCampaign,
      user,
      email: buildFeedbackCampaignEmail({
        campaign: selectedCampaign,
        feedbackUrl,
        firstName: getFirstName(user),
        subjectName: getSubjectName(user),
      }),
    }))
  );

  printPreview(emails);

  if (!shouldSend) {
    console.log('\nDry run only. Add --send when you are ready to send these emails.');
    return;
  }

  console.log(`\nSending ${emails.length} ${campaign} email(s)...`);

  let sent = 0;
  let failed = 0;

  for (const { campaign: emailCampaign, user, email } of emails) {
    try {
      await sendCampaignEmail(user, email, emailCampaign);
      sent += 1;
      console.log(`Sent ${emailCampaign} to ${user.email}`);
      await delay(250);
    } catch (error) {
      failed += 1;
      console.error(`Failed to send ${emailCampaign} to ${user.email}:`, error.message);
    }
  }

  console.log(`\nDone. Sent: ${sent}. Failed: ${failed}.`);
}

async function fetchAuthUsers() {
  const users = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`Could not list Supabase auth users: ${error.message}`);
    }

    users.push(...(data.users || []));

    if (!data.users || data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function buildFeedbackCampaignEmail({ campaign, feedbackUrl, firstName, subjectName }) {
  const isWhyFlcCampaign = campaign === 'why-flc';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const subject = createCampaignSubject(campaign, subjectName);

  const sharedParagraphs = [
    greeting,
    'Fantasy League Chess is requesting feedback from members who have tried the site.',
    'Some earlier versions had a few rough edges and bugs that made the experience less smooth than it should have been. The issues found so far have been cleaned up, and feedback on how the site feels now would be greatly appreciated.',
  ];

  const whyFlcParagraph =
    'It would also be helpful to know what made Fantasy League Chess worth trying in the first place. Was it fantasy sports, chess, Titled Tuesday, a friend, Google, or something else?';

  const closingParagraphs = [
    `If you have a minute, you can share thoughts here: ${feedbackUrl}`,
    'Even a short note about what was confusing, what you liked, or what you would change would be helpful.',
    `Questions can also be sent to ${SUPPORT_EMAIL}.`,
    'Best regards,',
    'Soham Joshi',
    'Fantasy League Chess',
  ];

  const textParagraphs = isWhyFlcCampaign
    ? [...sharedParagraphs, whyFlcParagraph, ...closingParagraphs]
    : [...sharedParagraphs, ...closingParagraphs];

  const textContent = textParagraphs.join('\n\n');
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <div style="background-color: #4CAF50; color: #ffffff; padding: 24px 20px; text-align: center;">
        <img src="https://fantasyleaguechess.com/assets/fantasy-league-chess-logo-updated.png" alt="Fantasy League Chess" style="max-width: 200px; height: auto; margin-bottom: 12px;">
        <h1 style="margin: 0; font-size: 24px; color: #ffffff;">Feedback Requested</h1>
      </div>
      <div style="padding: 28px 24px;">
        ${textParagraphs
          .map((paragraph) => formatEmailParagraph(paragraph, feedbackUrl))
          .join('\n        ')}
      </div>
      <div style="text-align: center; font-size: 12px; color: #777777; padding: 0 24px 24px;">
        <p style="margin: 0 0 8px;">Questions? Email <a href="mailto:${SUPPORT_EMAIL}" style="color: #4CAF50; text-decoration: none;">${SUPPORT_EMAIL}</a>.</p>
        <p style="margin: 0;">&copy; ${new Date().getFullYear()} Fantasy League Chess. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>`;

  return {
    subject,
    textContent,
    htmlContent,
  };
}

function createCampaignSubject(campaign, subjectName) {
  const namePrefix = subjectName ? `${subjectName}, ` : '';

  if (campaign === 'why-flc') {
    return `${namePrefix}quick question about Fantasy League Chess`;
  }

  return `${namePrefix}feedback on Fantasy League Chess?`;
}

function formatEmailParagraph(paragraph, feedbackUrl) {
  if (paragraph === `If you have a minute, you can share thoughts here: ${feedbackUrl}`) {
    return `<p style="margin: 0 0 18px;">If you have a minute, you can share thoughts here:</p>
        <p style="margin: 0 0 24px; text-align: center;"><a href="${escapeHtml(feedbackUrl)}" style="display: inline-block; background-color: #4CAF50; color: #ffffff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Open Feedback Form</a></p>`;
  }

  if (paragraph === 'Best regards,') {
    return `<p style="margin: 24px 0 4px;">${escapeHtml(paragraph)}</p>`;
  }

  if (paragraph === 'Soham Joshi' || paragraph === 'Fantasy League Chess') {
    return `<p style="margin: 0 0 4px;">${escapeHtml(paragraph)}</p>`;
  }

  return `<p style="margin: 0 0 18px;">${escapeHtml(paragraph)}</p>`;
}

async function sendCampaignEmail(user, email, emailCampaign) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${EMAIL_FUNCTION_NAME}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: user.email,
      subject: email.subject,
      htmlContent: email.htmlContent,
      textContent: email.textContent,
      emailType: 'custom',
      userId: user.id,
      metadata: {
        source: 'feedback_campaign_script',
        campaign: emailCampaign,
        feedbackUrl,
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(responseText);
  }

  return responseText ? JSON.parse(responseText) : {};
}

function printPreview(emails) {
  console.log(`Campaign: ${campaign}`);
  console.log(`Feedback URL: ${feedbackUrl}`);
  console.log(`Recipients: ${emails.length}`);
  console.log(`Mode: ${shouldSend ? 'SEND' : 'DRY RUN'}`);

  for (const { campaign: emailCampaign, user, email } of emails.slice(0, 4)) {
    console.log('\n--- Preview ---');
    console.log(`Campaign: ${emailCampaign}`);
    console.log(`To: ${user.email}`);
    console.log(`Subject: ${email.subject}`);
    console.log(email.textContent);
  }

  if (emails.length > 4) {
    console.log(`\n...and ${emails.length - 4} more email(s).`);
  }
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === '--send') {
      parsed[toCamelCase(arg.slice(2))] = true;
      continue;
    }

    if (!arg.startsWith('--')) {
      if (!parsed.campaign && CAMPAIGNS.has(arg)) {
        parsed.campaign = arg;
      }
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split('=');
    const value = inlineValue ?? rawArgs[index + 1];

    if (inlineValue === undefined) {
      index += 1;
    }

    parsed[toCamelCase(key)] = value;
  }

  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function getFirstName(user) {
  const metadata = user.user_metadata || {};
  const name =
    metadata.first_name ||
    metadata.full_name ||
    metadata.name ||
    metadata.display_name ||
    metadata.username;

  if (typeof name === 'string' && name.trim()) {
    return name.trim().split(/\s+/)[0];
  }

  return null;
}

function getSubjectName(user) {
  const metadata = user.user_metadata || {};
  const name =
    metadata.first_name ||
    metadata.username ||
    metadata.display_name ||
    metadata.full_name ||
    metadata.name;

  if (typeof name === 'string' && name.trim()) {
    return name.trim().split(/\s+/)[0];
  }

  const emailName = user.email?.split('@')[0]?.trim();

  if (!emailName) {
    return null;
  }

  return emailName
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
