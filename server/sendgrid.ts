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

export async function sendApplicationApprovedEmail(to: string, name: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const safeName = escapeHtml(name);
    await client.send({
      to,
      from: fromEmail,
      subject: 'Your Sweepello Contractor Application Has Been Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(90deg, #0099FF, #44CC00); padding: 28px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Sweepello</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Nationwide Cleaning Services</p>
          </div>
          <div style="padding: 32px; background: #fff;">
            <h2 style="color: #111827;">Congratulations, ${safeName}!</h2>
            <p style="color: #374151; line-height: 1.6;">
              We're thrilled to let you know that your contractor application has been <strong>approved</strong>. 
              Welcome to the Sweepello network!
            </p>
            <p style="color: #374151; line-height: 1.6;">
              To get started, visit our website and sign in with the email address you used to apply. 
              You'll be guided through our onboarding process to set up your profile, sign your agreement, 
              and connect your payout account.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'sweepello.replit.app'}" 
                 style="background: linear-gradient(90deg, #0099FF, #44CC00); color: white; padding: 14px 28px; border-radius: 8px; 
                        text-decoration: none; font-weight: bold; display: inline-block;">
                Get Started →
              </a>
            </div>
            <p style="color: #6b7280; font-size: 14px;">
              If you have any questions, simply reply to this email and we'll be happy to help.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 16px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sweepello — Nationwide Cleaning Dispatch</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('SendGrid error (approved):', err);
  }
}

export async function sendApplicationRejectedEmail(to: string, name: string, note?: string) {
  try {
    const { client, fromEmail } = await getUncachableSendGridClient();
    const safeName = escapeHtml(name);
    const safeNote = note ? escapeHtml(note) : undefined;
    await client.send({
      to,
      from: fromEmail,
      subject: 'Update on Your Sweepello Contractor Application',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(90deg, #0099FF, #44CC00); padding: 28px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px;">Sweepello</h1>
            <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Nationwide Cleaning Services</p>
          </div>
          <div style="padding: 32px; background: #fff;">
            <h2 style="color: #111827;">Hi ${safeName},</h2>
            <p style="color: #374151; line-height: 1.6;">
              Thank you for your interest in joining the Sweepello network. After careful review, 
              we are unable to approve your contractor application at this time.
            </p>
            ${safeNote ? `
            <div style="background: #f9fafb; border-left: 4px solid #d1d5db; padding: 16px; margin: 16px 0;">
              <p style="color: #374151; margin: 0; font-style: italic;">${safeNote}</p>
            </div>
            ` : ''}
            <p style="color: #374151; line-height: 1.6;">
              We encourage you to reapply in the future as our needs and capacity evolve. 
              We appreciate your time and interest.
            </p>
          </div>
          <div style="background: #f9fafb; padding: 16px; text-align: center;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Sweepello — Nationwide Cleaning Dispatch</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error('SendGrid error (rejected):', err);
  }
}
