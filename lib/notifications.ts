import { prisma } from "@/lib/prisma";
import {
  sendApprovalEmail,
  sendRejectionEmail,
  sendPendingNotificationEmail,
} from "@/lib/email";

async function recordNotification(
  userId: string,
  channel: "EMAIL" | "SMS",
  type: "APPROVAL" | "REJECTION" | "REMINDER" | "ANNOUNCEMENT" | "SCHEDULE_CHANGE",
  subject: string,
  body: string,
  sendFn: () => Promise<void>
): Promise<void> {
  const notification = await prisma.notification.create({
    data: { userId, channel, type, subject, body, status: "PENDING" },
  });

  try {
    await sendFn();
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "SENT", sentAt: new Date() },
    });
  } catch (err) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status: "FAILED" },
    }).catch(() => {}); // best-effort
    console.error("Notification send failed:", err);
  }
}

export async function notifyVolunteerApproved(userId: string, email: string, name: string): Promise<void> {
  await recordNotification(
    userId,
    "EMAIL",
    "APPROVAL",
    "Your Jail Ministry volunteer application has been approved!",
    `Volunteer ${name} was approved.`,
    () => sendApprovalEmail(email, name)
  );
}

export async function notifyVolunteerRejected(
  userId: string,
  email: string,
  name: string,
  reason?: string
): Promise<void> {
  await recordNotification(
    userId,
    "EMAIL",
    "REJECTION",
    "Update on your Jail Ministry volunteer application",
    `Volunteer ${name} was rejected. Reason: ${reason ?? "none"}`,
    () => sendRejectionEmail(email, name, reason)
  );
}
