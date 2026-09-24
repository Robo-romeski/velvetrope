import { resolveAppBaseUrl } from './email.config';

export function passwordResetEmail(input: {
  resetToken: string;
}): { subject: string; text: string; html: string } {
  const base = resolveAppBaseUrl();
  const url = `${base}/auth/reset-password?token=${encodeURIComponent(input.resetToken)}`;
  const subject = 'Reset your VelvetKey password';
  const text = [
    'You requested a password reset for your VelvetKey account.',
    '',
    `Open this link to choose a new password (valid for 1 hour):`,
    url,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
  const html = `<p>You requested a password reset for your VelvetKey account.</p>
<p><a href="${url}">Reset your password</a> (link valid for 1 hour).</p>
<p>If you did not request this, you can ignore this email.</p>`;
  return { subject, text, html };
}

export function applicationDecisionEmail(input: {
  eventTitle: string;
  eventId: string;
  status: 'approved' | 'rejected';
  reason?: string;
}): { subject: string; text: string; html: string } {
  const base = resolveAppBaseUrl();
  const eventUrl = `${base}/events/${encodeURIComponent(input.eventId)}`;
  const ticketUrl = `${base}/events/${encodeURIComponent(input.eventId)}/ticket`;
  const approved = input.status === 'approved';
  const subject = approved
    ? `You're in: ${input.eventTitle}`
    : `Update on your application: ${input.eventTitle}`;
  const lines = [
    approved
      ? `Good news — your application for "${input.eventTitle}" was approved.`
      : `Your application for "${input.eventTitle}" was not approved this time.`,
  ];
  if (input.reason?.trim()) {
    lines.push('', `Note from the host: ${input.reason.trim()}`);
  }
  lines.push('');
  if (approved) {
    lines.push(`View your ticket: ${ticketUrl}`);
  } else {
    lines.push(`Event details: ${eventUrl}`);
  }
  const text = lines.join('\n');
  const html = approved
    ? `<p>Good news — your application for <strong>${escapeHtml(input.eventTitle)}</strong> was approved.</p>
${reasonHtml(input.reason)}
<p><a href="${ticketUrl}">View your ticket</a></p>`
    : `<p>Your application for <strong>${escapeHtml(input.eventTitle)}</strong> was not approved this time.</p>
${reasonHtml(input.reason)}
<p><a href="${eventUrl}">View event</a></p>`;
  return { subject, text, html };
}

function reasonHtml(reason?: string): string {
  if (!reason?.trim()) return '';
  return `<p>Note from the host: ${escapeHtml(reason.trim())}</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
