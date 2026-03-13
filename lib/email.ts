import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Jail Ministry <noreply@jailministry.org>";

export async function sendApprovalEmail(to: string, name: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Your Jail Ministry volunteer application has been approved!",
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Your volunteer application has been <strong>approved</strong>. You can now log in and sign up for visits.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/login">Log in now</a></p>
      <p>Thank you for serving!</p>
    `,
  });
}

export async function sendRejectionEmail(to: string, name: string, reason?: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Update on your Jail Ministry volunteer application",
    html: `
      <h2>Hello, ${name}</h2>
      <p>Thank you for your interest in volunteering with the Jail Ministry.</p>
      <p>After review, we are unable to approve your application at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>If you have questions, please contact your county coordinator.</p>
    `,
  });
}

export async function sendPendingNotificationEmail(
  coordinatorEmail: string,
  volunteerName: string,
  volunteerEmail: string
) {
  await resend.emails.send({
    from: FROM,
    to: coordinatorEmail,
    subject: `New volunteer pending approval: ${volunteerName}`,
    html: `
      <h2>New Volunteer Application</h2>
      <p><strong>${volunteerName}</strong> (${volunteerEmail}) has submitted a volunteer application and is awaiting your approval.</p>
      <p><a href="${process.env.NEXTAUTH_URL}/admin/volunteers">Review applications</a></p>
    `,
  });
}
