// app/email/emailService.js

const MAILTRAP_SEND_URL = 'https://send.api.mailtrap.io/api/send';

// Uses the same EMAIL_PASS env var as before — for Mailtrap Live Sending,
// EMAIL_USER is always the literal string "api" and EMAIL_PASS is actually
// the API token, so it doubles as the Bearer token here. EMAIL_HOST/
// EMAIL_PORT are no longer used (SMTP-specific) — left in .env harmlessly
// in case of a future rollback, but this file no longer reads them.
async function sendEmail({ to, subject, html }) {
  const res = await fetch(MAILTRAP_SEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.EMAIL_PASS}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    { email: process.env.EMAIL_FROM },
      to:      [{ email: to }],
      subject,
      html,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `Mailtrap API error (${res.status}): ${JSON.stringify(body)}`
    );
  }

  console.log('[emailService] Mailtrap API response:', body);
}

module.exports = { sendEmail };