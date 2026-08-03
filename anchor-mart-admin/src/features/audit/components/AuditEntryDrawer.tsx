import { IconShieldLock } from "@tabler/icons-react";

import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import type { AuditEntry } from "../types/audit.types";

const D = MESSAGES.AUDIT.DETAIL;

export interface AuditEntryDrawerProps {
  entry: AuditEntry | null;
  isOpen: boolean;
  onClose: () => void;
  /** Opens chain verification pre-filled with this entry's subject. */
  onVerifySubject?: (entry: AuditEntry) => void;
}

/**
 * Read-only detail for one audit entry.
 *
 * There is no write surface here by design — an audit trail an admin can edit
 * is not an audit trail. The hashes are shown in full (rather than truncated)
 * so they can be copied and compared against an external record.
 */
export function AuditEntryDrawer({
  entry,
  isOpen,
  onClose,
  onVerifySubject,
}: AuditEntryDrawerProps) {
  if (!entry) return null;

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
              <IconShieldLock size={22} />
            </div>
            <div>
              <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">
                {D.TITLE}
              </SheetTitle>
              <SheetDescription className="text-[12.5px] text-[var(--t3)]">
                {entry.actionLabel}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="sec-label">{D.WHAT_HAPPENED}</div>
          <div className="mb-5 rounded-[var(--radius-md)] bg-[var(--navy-25)] p-4">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[15px] font-bold text-[var(--t1)]">{entry.actionLabel}</div>
                <div className="text-[11px] text-[var(--t4)]">{entry.createdAt}</div>
              </div>
              <Badge variant={entry.categoryVariant}>{entry.categoryLabel}</Badge>
            </div>
            <div className="text-[13px] font-medium leading-relaxed text-[var(--t2)]">
              {entry.summary}
            </div>
          </div>

          {/* Subject */}
          <div className="sec-label">{D.SUBJECT}</div>
          <FormRow>
            <FormField label={D.SUBJECT_TYPE}>
              <div className="ecard">{entry.subjectTypeLabel}</div>
            </FormField>
            <FormField label={D.SUBJECT_LABEL}>
              <div className="ecard">{entry.subjectLabel}</div>
            </FormField>
          </FormRow>
          <FormField label={D.SUBJECT_ID}>
            <div className="ecard mono break-all text-[12px]">{entry.subjectId || D.FALLBACK}</div>
          </FormField>

          {/* Actor */}
          <div className="sec-label mt-4">{D.ACTOR}</div>
          <FormRow columns={3}>
            <FormField label={D.ACTOR_EMAIL}>
              <div className="ecard">{entry.actorEmail}</div>
            </FormField>
            <FormField label={D.ACTOR_ROLE}>
              <div className="ecard">{entry.actorRole}</div>
            </FormField>
            <FormField label={D.ACTOR_ID}>
              <div className="ecard mono text-[12px]">{entry.actorId}</div>
            </FormField>
          </FormRow>

          {/* Metadata — shape varies per action, so it is rendered as-is. */}
          <div className="sec-label mt-4">{D.METADATA}</div>
          {entry.metadata ? (
            <pre className="ecard mono max-h-[260px] overflow-auto whitespace-pre-wrap break-all text-[11.5px] leading-relaxed">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          ) : (
            <p className="fg-hint">{D.METADATA_EMPTY}</p>
          )}

          {/* Chain — the tamper-evidence itself. */}
          <div className="sec-label mt-4">{D.CHAIN}</div>
          <FormField label={D.ENTRY_HASH}>
            <div className="ecard mono break-all text-[11.5px]">{entry.entryHash}</div>
          </FormField>
          <FormField label={D.PREV_HASH}>
            <div className="ecard mono break-all text-[11.5px]">{entry.prevHash}</div>
          </FormField>
          <FormField label={D.HASH_VERSION}>
            <div className="ecard">{entry.hashVersion}</div>
          </FormField>
        </div>

        {/* Only rendered for super admins — the caller decides by passing the
            handler at all, so a sub-admin never sees a button that 403s. */}
        {onVerifySubject && entry.subjectId && (
          <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
            <div className="flex w-full justify-end">
              <Button variant="secondary" size="sm" onClick={() => onVerifySubject(entry)}>
                <IconShieldLock size={15} className="mr-1" />
                {D.VERIFY_CTA}
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default AuditEntryDrawer;
