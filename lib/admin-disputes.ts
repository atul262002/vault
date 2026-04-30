import { Dispute, DisputeDecisionType, DisputeStatus } from "@prisma/client";

export type DisputeMessageEntry = {
  id: string;
  sender: "ADMIN" | "BUYER" | "SELLER" | "SYSTEM";
  content: string;
  createdAt: string;
};

export type DisputeNotificationEntry = {
  id: string;
  toUserId: string;
  title: string;
  message: string;
  createdAt: string;
};

export function readMessages(dispute: Dispute): DisputeMessageEntry[] {
  const raw = dispute.messages;
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean) as DisputeMessageEntry[];
}

export function readNotificationLogs(dispute: Dispute): DisputeNotificationEntry[] {
  const raw = dispute.notificationsLog;
  if (!Array.isArray(raw)) return [];
  return raw.filter(Boolean) as DisputeNotificationEntry[];
}

export function canDecideDispute(dispute: Dispute) {
  return !dispute.isLocked && dispute.status !== DisputeStatus.RESOLVED && !dispute.decisionType;
}

export function shouldDisableDecisionActions(dispute: Dispute) {
  return dispute.isLocked || dispute.status === DisputeStatus.RESOLVED || Boolean(dispute.decisionType);
}

export function getResolvedStatusFromDecision(decisionType: DisputeDecisionType) {
  return {
    status: DisputeStatus.RESOLVED,
    decisionType,
    decidedAt: new Date(),
    resolvedAt: new Date(),
    isLocked: true,
  };
}
