import { IconLock, IconMailFast } from "@tabler/icons-react";

import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import { useGetOutboundMessageQuery } from "../api/outboundMessageApi";
import type { OutboundMessage } from "../types/outboundMessage.types";

const D = MESSAGES.OUTBOUND_MESSAGES.DETAIL;

export interface MessageDetailDrawerProps {
  /** The selected ledger row; null when none is selected. */
  message: OutboundMessage | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * One message's delivery record (Flow 22 §3.2).
 *
 * The detail endpoint returns the same shape as a list row, so the selected row
 * renders immediately and is replaced by the fresh copy when it arrives — a
 * message that moved from `sent` to `delivered` since the page loaded shows its
 * current state without a blank frame in between.
 */
export function MessageDetailDrawer({ message, isOpen, onClose }: MessageDetailDrawerProps) {
  const { data: fresh } = useGetOutboundMessageQuery(message?.id ?? "", {
    skip: !isOpen || !message?.id,
  });

  if (!message) return null;
  const m = fresh ?? message;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={720}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="p-6 pb-2 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconMailFast size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {D.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {m.recipient}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Delivery */}
          <div className="sec-label">{D.DELIVERY}</div>
          <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="mb-3.5 flex items-center gap-2">
              <Badge variant={m.channelVariant}>{m.channelLabel}</Badge>
              <Badge variant={m.statusVariant}>{m.statusLabel}</Badge>
              <span className="ml-auto text-[11px] font-semibold text-[var(--t4)]">
                {`${D.ATTEMPTS}: ${m.attempts}`}
              </span>
            </div>
            <div className="text-[14px] font-bold text-[var(--t1)]">{m.recipient}</div>
            <div className="text-[12px] text-[var(--t4)]">{m.subject}</div>
          </div>

          {/* A failure is the reason most people open this drawer, so the error
              gets its own panel rather than a row in a grid. */}
          {m.error && (
            <div className="mb-5 rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
              <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.3px] text-[var(--danger-text)]">
                {D.ERROR}
              </div>
              <div className="text-[12.5px] font-medium leading-relaxed text-[var(--danger-text)]">
                {m.error}
              </div>
            </div>
          )}

          <FormRow>
            <FormField label={D.TEMPLATE}>
              <div className="ecard">{m.template}</div>
            </FormField>
            <FormField label={D.SUBJECT}>
              <div className="ecard">{m.subject}</div>
            </FormField>
          </FormRow>

          {/* Account */}
          <div className="sec-label mt-4">{D.ACCOUNT}</div>
          <FormRow>
            <FormField label={D.USER_EMAIL}>
              <div className="ecard">{m.userEmail}</div>
            </FormField>
            <FormField label={D.USER_ID}>
              <div className="ecard mono break-all text-[12px]">{m.userId || D.FALLBACK}</div>
            </FormField>
          </FormRow>

          {/* Source event + provider */}
          <div className="sec-label mt-4">{D.SOURCE}</div>
          <FormRow>
            <FormField label={D.EVENT_TYPE}>
              <div className="ecard">{m.eventType}</div>
            </FormField>
            <FormField label={D.EVENT_ID}>
              <div className="ecard mono break-all text-[12px]">{m.eventId}</div>
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label={D.PROVIDER}>
              <div className="ecard">{m.provider}</div>
            </FormField>
            <FormField label={D.PROVIDER_MESSAGE_ID}>
              <div className="ecard mono break-all text-[12px]">{m.providerMessageId}</div>
            </FormField>
          </FormRow>

          {/* Timeline — the per-state timestamps, in lifecycle order. */}
          <div className="sec-label mt-4">{D.TIMELINE}</div>
          <FormRow columns={3}>
            <FormField label={D.CREATED_AT}>
              <div className="ecard">{m.createdAt}</div>
            </FormField>
            <FormField label={D.SENT_AT}>
              <div className="ecard">{m.sentAt}</div>
            </FormField>
            <FormField label={D.DELIVERED_AT}>
              <div className="ecard">{m.deliveredAt}</div>
            </FormField>
          </FormRow>
          <FormRow columns={3}>
            <FormField label={D.READ_AT}>
              <div className="ecard">{m.readAt}</div>
            </FormField>
            <FormField label={D.FAILED_AT}>
              <div className="ecard">{m.failedAt}</div>
            </FormField>
            <FormField label={D.UPDATED_AT}>
              <div className="ecard">{m.updatedAt}</div>
            </FormField>
          </FormRow>

          {/* Explains an absence rather than leaving an unexplained gap where a
              message body would obviously belong. */}
          <div className="mt-5 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-4">
            <IconLock size={18} className="mt-px shrink-0 text-[var(--t4)]" />
            <div>
              <div className="text-[12.5px] font-extrabold text-[var(--t2)]">{D.NO_BODY_TITLE}</div>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-[var(--t3)]">
                {D.NO_BODY}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MessageDetailDrawer;
