import { prisma } from "@/lib/prisma";

interface AuditParams {
  actorId: string;
  actorRole: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details?: Record<string, unknown>;
}

export async function auditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        targetId: params.targetId,
        targetType: params.targetType,
        details: params.details ? JSON.stringify(params.details) : undefined,
      },
    });
  } catch (err) {
    // Audit logging must never crash the main request
    console.error("Audit log failed:", err);
  }
}
