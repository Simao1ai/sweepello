import sgMail from '@sendgrid/mail';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error('X-Replit-Token not found for repl/depl');

  const data = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    { headers: { 'Accept': 'application/json', 'X-Replit-Token': xReplitToken } }
  ).then(res => res.json()).then(d => d.items?.[0]);

  if (!data || !data.settings.api_key || !data.settings.from_email) {
    throw new Error('SendGrid not connected');
  }
  return { apiKey: data.settings.api_key, fromEmail: data.settings.from_email };
}

export async function getUncachableSendGridClient() {
  const { apiKey, fromEmail } = await getCredentials();
  sgMail.setApiKey(apiKey);
  return { client: sgMail, fromEmail };
}

const APP_URL = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'sweepello.replit.app'}`;

function emailWrapper(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
      <div style="background: linear-gradient(90deg, #0099FF, #44CC00); padding: 28px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Sweepello</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Nationwide Cleaning Services</p>
      </div>
      <div style="padding: 32px; background: #fff;">
        ${content}
      </div>
      <div style="background: #f9fafb; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sweepello — Nationwide Cleaning Dispatch</p>
      </div>
    </div>
  `;
}

function ctaButton(href: string, label: string): string {
  return `
    <div style="text-align: center; margin: 28px 0;">
      <a href="${href}" style="background: linear-gradient(90deg, #0099FF, #44CC00); color: white; padding: 14px 28px;
         border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
        ${label}
      </a>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    await client.send({ to, from: fromEmail, subject, html });
  } catch (err) {
    console.error(`SendGrid error (${subject}):`, (err as Error).message);
  }
}

// ─── Existing emails ──────────────────────────────────────────────────────────

export async function sendApplicationApprovedEmail(to: string, name: string) {
  const safeName = escapeHtml(name);
  await sendEmail(to, 'Your Sweepello Contractor Application Has Been Approved!', emailWrapper(`
    <h2>Congratulations, ${safeName}!</h2>
    <p style="line-height: 1.6;">We're thrilled to let you know that your contractor application has been <strong>approved</strong>. Welcome to the Sweepello network!</p>
    <p style="line-height: 1.6;">Sign in with the email address you used to apply and our onboarding will guide you through the rest.</p>
    ${ctaButton(APP_URL, 'Get Started →')}
    <p style="color: #6b7280; font-size: 14px;">If you have any questions, simply reply to this email.</p>
  `));
}

export async function sendApplicationRejectedEmail(to: string, name: string, note?: string) {
  const safeName = escapeHtml(name);
  const safeNote = note ? escapeHtml(note) : undefined;
  await sendEmail(to, 'Update on Your Sweepello Contractor Application', emailWrapper(`
    <h2>Hi ${safeName},</h2>
    <p style="line-height: 1.6;">Thank you for your interest in joining the Sweepello network. After careful review, we are unable to approve your contractor application at this time.</p>
    ${safeNote ? `<div style="background: #f9fafb; border-left: 4px solid #d1d5db; padding: 16px; margin: 16px 0;"><p style="margin: 0; font-style: italic;">${safeNote}</p></div>` : ''}
    <p style="line-height: 1.6;">We encourage you to reapply in the future as our needs evolve. We appreciate your time and interest.</p>
  `));
}

// ─── New transactional emails ─────────────────────────────────────────────────

export async function sendBookingConfirmedEmail(
  to: string,
  clientName: string,
  cleanerName: string,
  address: string,
  dateStr: string,
  price: string
) {
  await sendEmail(to, 'Your Sweepello Cleaning is Confirmed!', emailWrapper(`
    <h2>Booking Confirmed ✓</h2>
    <p style="line-height: 1.6;">Hi ${escapeHtml(clientName)}, great news — your cleaning has been confirmed!</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Cleaner</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(cleanerName)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Address</td><td style="padding: 8px 0;">${escapeHtml(address)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Date</td><td style="padding: 8px 0;">${escapeHtml(dateStr)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Price</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(price)}</td></tr>
    </table>
    ${ctaButton(`${APP_URL}/my-bookings`, 'View My Bookings →')}
    <p style="color: #6b7280; font-size: 14px;">Your cleaner will reach out with an arrival window. You'll also receive a notification when they're on their way.</p>
  `));
}

export async function sendCleanerEnRouteEmail(
  to: string,
  clientName: string,
  cleanerName: string,
  address: string
) {
  await sendEmail(to, `${escapeHtml(cleanerName)} is on the way!`, emailWrapper(`
    <h2>Your cleaner is on the way 🚗</h2>
    <p style="line-height: 1.6;">Hi ${escapeHtml(clientName)}, <strong>${escapeHtml(cleanerName)}</strong> is heading to <strong>${escapeHtml(address)}</strong> now.</p>
    <p style="line-height: 1.6;">Open the app to track their location in real time.</p>
    ${ctaButton(`${APP_URL}/my-bookings`, 'Track Live →')}
  `));
}

export async function sendJobCompletedEmail(
  to: string,
  clientName: string,
  cleanerName: string,
  address: string,
  rateUrl: string
) {
  await sendEmail(to, 'Your cleaning is complete — how did we do?', emailWrapper(`
    <h2>Cleaning Complete ✨</h2>
    <p style="line-height: 1.6;">Hi ${escapeHtml(clientName)}, <strong>${escapeHtml(cleanerName)}</strong> has finished your cleaning at <strong>${escapeHtml(address)}</strong>.</p>
    <p style="line-height: 1.6;">We'd love to hear how it went! Rating your experience takes less than 30 seconds and helps us match you with the best cleaners.</p>
    ${ctaButton(rateUrl, 'Rate Your Cleaning →')}
  `));
}

export async function sendCancellationConfirmedEmail(
  to: string,
  clientName: string,
  address: string,
  dateStr: string,
  tier: "free" | "half" | "full",
  chargeAmount?: string,
  refundAmount?: string
) {
  let feeNote: string;
  if (tier === "free") {
    feeNote = refundAmount
      ? `<div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 4px;">
           <p style="margin: 0; color: #065f46;">A full refund of <strong>${escapeHtml(refundAmount)}</strong> has been issued and should appear in 5–10 business days.</p>
         </div>`
      : `<p style="color: #374151; line-height: 1.6;">No charge — you cancelled with more than 24 hours' notice.</p>`;
  } else if (tier === "half") {
    feeNote = `<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; color: #92400e;">Per our policy, a <strong>50% cancellation fee${chargeAmount ? ` of ${escapeHtml(chargeAmount)}` : ""}</strong> has been charged (12–24 hours' notice).${refundAmount ? ` A partial refund of <strong>${escapeHtml(refundAmount)}</strong> has been issued.` : ""}</p>
    </div>`;
  } else {
    feeNote = `<div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b;">This booking was cancelled within 12 hours of service. Per our policy, <strong>no refund</strong> is issued${chargeAmount ? ` and the full amount of ${escapeHtml(chargeAmount)} has been retained` : ""}.</p>
    </div>`;
  }

  await sendEmail(to, 'Booking Cancellation Confirmed', emailWrapper(`
    <h2>Booking Cancelled</h2>
    <p style="line-height: 1.6;">Hi ${escapeHtml(clientName)}, your booking at <strong>${escapeHtml(address)}</strong> on <strong>${escapeHtml(dateStr)}</strong> has been cancelled.</p>
    ${feeNote}
    <p style="line-height: 1.6;">Need to rebook? We'd love to help.</p>
    ${ctaButton(`${APP_URL}/request-service`, 'Book Again →')}
  `));
}

export async function sendRecurringBookingCreatedEmail(
  to: string,
  clientName: string,
  address: string,
  frequency: string,
  nextDate: string,
  price: string
) {
  const friendlyFreq = frequency === 'weekly' ? 'weekly' : frequency === 'biweekly' ? 'every two weeks' : 'monthly';
  await sendEmail(to, 'Recurring Cleaning Schedule Set Up!', emailWrapper(`
    <h2>Recurring Schedule Confirmed 🔄</h2>
    <p style="line-height: 1.6;">Hi ${escapeHtml(clientName)}, your recurring cleaning schedule has been set up!</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Address</td><td style="padding: 8px 0;">${escapeHtml(address)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Frequency</td><td style="padding: 8px 0; text-transform: capitalize;">${escapeHtml(friendlyFreq)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Next Visit</td><td style="padding: 8px 0;">${escapeHtml(nextDate)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Est. Price</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(price)}</td></tr>
    </table>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">We'll automatically create a booking before each visit and notify you. You can pause or cancel anytime from My Bookings.</p>
    ${ctaButton(`${APP_URL}/my-bookings`, 'Manage Recurring →')}
  `));
}

export async function sendTipReceivedEmail(
  to: string,
  cleanerName: string,
  clientName: string,
  address: string,
  tipAmount: string
) {
  await sendEmail(to, `You received a $${tipAmount} tip!`, emailWrapper(`
    <h2>You got a tip! 🎉</h2>
    <p style="line-height: 1.6;">Hi ${escapeHtml(cleanerName)}, great news — <strong>${escapeHtml(clientName)}</strong> sent you a <strong>$${escapeHtml(tipAmount)}</strong> tip for your cleaning at ${escapeHtml(address)}.</p>
    <p style="line-height: 1.6;">The tip will be paid out to your connected bank account with your next payout cycle.</p>
    ${ctaButton(`${APP_URL}/contractor/earnings`, 'View Earnings →')}
    <p style="color: #6b7280; font-size: 14px;">Keep up the great work! Happy clients are the best kind.</p>
  `));
}
