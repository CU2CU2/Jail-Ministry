import { Resend } from "resend";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = process.env.EMAIL_FROM ?? "Jail Ministry <noreply@jailministry.org>";

export async function sendApprovalEmail(to: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Your Jail Ministry volunteer application has been approved!",
    html: `
      <h2>Welcome, ${escHtml(name)}!</h2>
      <p>Your volunteer application has been <strong>approved</strong>. You can now log in and sign up for visits.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/login">Log in now</a></p>
      <p>Thank you for serving!</p>
    `,
  });
}

export async function sendRejectionEmail(to: string, name: string, reason?: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Update on your Jail Ministry volunteer application",
    html: `
      <h2>Hello, ${escHtml(name)}</h2>
      <p>Thank you for your interest in volunteering with the Jail Ministry.</p>
      <p>After review, we are unable to approve your application at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${escHtml(reason)}</p>` : ""}
      <p>If you have questions, please contact your county coordinator.</p>
    `,
  });
}

export async function sendPendingNotificationEmail(
  coordinatorEmail: string,
  volunteerName: string,
  volunteerEmail: string
) {
  await getResend().emails.send({
    from: FROM,
    to: coordinatorEmail,
    subject: `New volunteer pending approval: ${volunteerName}`,
    html: `
      <h2>New Volunteer Application</h2>
      <p><strong>${escHtml(volunteerName)}</strong> (${escHtml(volunteerEmail)}) has submitted a volunteer application and is awaiting your approval.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/admin/volunteers">Review applications</a></p>
    `,
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Verify your email — Jail Ministry",
    html: `
      <h2>Hello, ${escHtml(name)}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${url}">Verify Email</a></p>
      <p>This link expires in 24 hours. If you did not register, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Reset your password — Jail Ministry",
    html: `
      <h2>Hello, ${escHtml(name)}!</h2>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <p><a href="${url}">Reset Password</a></p>
      <p>This link expires in 1 hour. If you did not request a password reset, you can ignore this email.</p>
    `,
  });
}
