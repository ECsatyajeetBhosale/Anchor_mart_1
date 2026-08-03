import { IconAlertTriangle, IconShieldCheck, IconShieldLock } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { DropdownSelect } from "@/components/common/DropdownSelect";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useLazyVerifyAuditChainQuery } from "../api/auditApi";
import { AUDIT_SUBJECT_TYPES } from "../types/audit.types";

const V = MESSAGES.AUDIT.VERIFY;
const M = MESSAGES.AUDIT;

const SUBJECT_OPTIONS = AUDIT_SUBJECT_TYPES.map((t) => ({
  value: t,
  label: M.SUBJECT_LABELS[t] ?? t,
}));

export interface VerifyChainDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-fills the form when opened from an entry (subject already known). */
  initialSubjectType?: string;
  initialSubjectId?: string;
}

/**
 * Flow 34 §2 — chain verification.
 *
 * Two things this screen must get right, because both invert the usual reading:
 *
 * 1. **A broken chain is a `200`.** The verdict is `verified` in the body, so
 *    the result panel is driven by that flag and never by request success.
 * 2. **A pruned chain is still clean.** `pruned_before` marks an *authorised*
 *    truncation, so it is shown as context beside a pass, not as a warning.
 *
 * Rendered only for super admins — the endpoint 403s everyone else.
 */
export function VerifyChainDialog({
  isOpen,
  onClose,
  initialSubjectType,
  initialSubjectId,
}: VerifyChainDialogProps) {
  const [subjectType, setSubjectType] = useState<string>(
    initialSubjectType || AUDIT_SUBJECT_TYPES[0],
  );
  const [subjectId, setSubjectId] = useState(initialSubjectId ?? "");
  const [error, setError] = useState("");

  const [verify, { data: result, isFetching, isError, error: apiError, reset }] =
    useLazyVerifyAuditChainQuery();

  // Re-seed from the entry that opened the dialog and drop any previous verdict
  // — a stale "intact" answer next to a new subject would read as this subject's.
  useEffect(() => {
    if (isOpen) {
      setSubjectType(initialSubjectType || AUDIT_SUBJECT_TYPES[0]);
      setSubjectId(initialSubjectId ?? "");
      setError("");
      reset();
    }
  }, [isOpen, initialSubjectType, initialSubjectId, reset]);

  const handleVerify = () => {
    const id = subjectId.trim();
    // Both params are required — the API answers 400 without them, so the form
    // says so instead of spending a round trip to find out.
    if (!subjectType || !id) {
      setError(V.REQUIRED);
      return;
    }
    setError("");
    verify({ subjectType, subjectId: id });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{V.TITLE}</DialogTitle>
          <DialogDescription>{V.SUBTITLE}</DialogDescription>
        </DialogHeader>

        <FormRow className="mt-2">
          <FormField label={V.SUBJECT_TYPE}>
            <DropdownSelect
              value={subjectType}
              options={SUBJECT_OPTIONS}
              onValueChange={setSubjectType}
              width="100%"
            />
          </FormField>
          <FormField label={V.SUBJECT_ID} error={error || undefined}>
            <Input
              className="mono text-[12px]"
              placeholder={V.SUBJECT_ID_PLACEHOLDER}
              value={subjectId}
              error={!!error}
              onChange={(e) => {
                setSubjectId(e.target.value);
                if (error) setError("");
              }}
            />
          </FormField>
        </FormRow>

        {/* A transport/permission failure — distinct from a "chain is broken"
            verdict, which arrives as a successful response. */}
        {isError && (
          <div className="rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-[12.5px] font-semibold text-[var(--danger-text)]">
            {getApiMessage(apiError, { labelFields: false }) ?? V.ERROR}
          </div>
        )}

        {result && !isError && (
          <div
            className={`rounded-[var(--radius-md)] border p-4 ${
              result.verified
                ? "border-[var(--success-border)] bg-[var(--success-bg)]"
                : "border-[var(--danger-border)] bg-[var(--danger-bg)]"
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              {result.verified ? (
                <IconShieldCheck size={18} className="text-[var(--success-icon)]" />
              ) : (
                <IconAlertTriangle size={18} className="text-[var(--danger-icon)]" />
              )}
              <span
                className={`text-[14px] font-extrabold ${
                  result.verified ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"
                }`}
              >
                {result.verified ? V.CLEAN : V.BROKEN}
              </span>
              <Badge variant="neutral" className="ml-auto">
                {`${V.ENTRIES}: ${result.entries.toLocaleString("en-US")}`}
              </Badge>
            </div>

            <p
              className={`text-[12.5px] font-medium ${
                result.verified ? "text-[var(--success-text)]" : "text-[var(--danger-text)]"
              }`}
            >
              {result.verified ? V.CLEAN_DETAIL(result.entries) : result.error}
            </p>

            {result.prunedBefore && (
              <p className="mt-2 text-[11.5px] font-semibold text-[var(--t3)]">
                {`${V.PRUNED_BEFORE}: ${result.prunedBefore} — ${V.PRUNED_HINT}`}
              </p>
            )}
          </div>
        )}

        <p className="fg-hint">{V.RESULT_HINT}</p>

        <DialogFooter className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isFetching}>
            {MESSAGES.COMMON.CANCEL}
          </Button>
          <Button variant="primary" size="sm" onClick={handleVerify} loading={isFetching}>
            <IconShieldLock size={15} className="mr-1" />
            {isFetching ? V.RUNNING : V.SUBMIT}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VerifyChainDialog;
