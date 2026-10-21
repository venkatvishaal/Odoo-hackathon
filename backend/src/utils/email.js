// Sends mail through Resend's HTTP API. Without RESEND_API_KEY (local dev) the mail is printed instead.
const sendEmail = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[email to ${to}] ${subject}\n${html.replace(/<[^>]+>/g, ' ')}\n`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'TransitOps <onboarding@resend.dev>', to, subject, html })
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const frontendUrl = (path) => `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;

const sendVerificationEmail = (user, token) => {
  const link = frontendUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  return sendEmail(user.email, 'Verify your TransitOps email',
    `<p>Hi ${escapeHtml(user.name)},</p><p>Confirm your email to activate your account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`);
};

const sendPasswordResetEmail = (user, token) => {
  const link = frontendUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  return sendEmail(user.email, 'Reset your TransitOps password',
    `<p>Hi ${escapeHtml(user.name)},</p><p>Use this link to choose a new password:</p><p><a href="${link}">${link}</a></p><p>It expires in 30 minutes and works once. If you didn't ask for this, ignore this email.</p>`);
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
