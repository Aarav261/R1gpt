/**
 * Invite email delivery.
 *
 * Delivery is best-effort and provider-optional: if RESEND_API_KEY is set we
 * POST the message to Resend, but we ALWAYS log a `[invite] <to> -> <url>` line
 * so local development works with no email provider configured. This function
 * never throws — email failure is logged and swallowed so it can't break the
 * invite-creation request.
 */

// Resend's transactional email endpoint.
const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Default sender when none is configured. Uses our verified `clupai.com`
// domain; override with RESEND_FROM if needed.
const DEFAULT_FROM = "R1GPT <onboarding@clupai.com>";

export async function sendInviteEmail({
  to,
  inviteUrl,
  workspaceName,
  inviterName,
}: {
  to: string;
  inviteUrl: string;
  workspaceName: string;
  inviterName?: string;
}): Promise<void> {
  // Always log so the link is reachable without any email provider.
  console.log(`[invite] ${to} -> ${inviteUrl}`);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const inviter = inviterName?.trim() || "Someone";
  const subject = `You've been invited to join ${workspaceName} on R1GPT`;
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#161616;">
      <p>${escapeHtml(inviter)} has invited you to join
        <strong>${escapeHtml(workspaceName)}</strong> on R1GPT.</p>
      <p>
        <a href="${inviteUrl}"
           style="display:inline-block;background:#0f62fe;color:#ffffff;
                  padding:12px 20px;text-decoration:none;font-weight:600;">
          Accept invitation
        </a>
      </p>
      <p style="color:#6f6f6f;">Or paste this link into your browser:<br />
        <a href="${inviteUrl}">${inviteUrl}</a></p>
      <p style="color:#6f6f6f;">This invitation expires in 7 days.</p>
    </div>
  `;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? DEFAULT_FROM,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[invite] Resend delivery failed (${res.status}): ${detail}`,
      );
    }
  } catch (err) {
    // Never let an email transport error break invite creation.
    console.error("[invite] Resend delivery threw:", err);
  }
}

/** Minimal HTML escaping for interpolated, user-controlled strings. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
