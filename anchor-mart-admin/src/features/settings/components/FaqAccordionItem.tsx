import { MESSAGES } from "@/lib/messages";
import { IconChevronDown, IconPencil, IconTrash } from "@tabler/icons-react";
import type { Faq } from "../types/settings.types";

export interface FaqAccordionItemProps {
  faq: Faq;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * One question in the FAQ list, as a disclosure row.
 *
 * A FAQ is read as a question first and an answer only on demand, so the
 * collapsed row shows just the question — the answer expands beneath it. Radix
 * has no accordion installed in this project, so this is a plain button +
 * conditional panel with the same keyboard behaviour (`aria-expanded`,
 * `aria-controls`) a disclosure needs.
 */
export function FaqAccordionItem({
  faq,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
}: FaqAccordionItemProps) {
  const panelId = `faq-panel-${faq.id}`;

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-md)] border transition-colors ${
        isOpen
          ? "border-[var(--teal-200)] bg-[var(--surface)]"
          : "border-[var(--border-sm)] bg-[var(--surface)] hover:border-[var(--border-lg)]"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <IconChevronDown
            size={17}
            className={`mt-0.5 shrink-0 text-[var(--t4)] transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[var(--teal-600)]" : ""
            }`}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold leading-snug text-[var(--t1)]">
              {faq.question}
            </span>
            {!isOpen && (
              <span className="mt-0.5 block truncate text-[12.5px] font-medium text-[var(--t4)]">
                {faq.answer}
              </span>
            )}
          </span>
        </button>

        {/* Category is the group heading above, so it is not repeated per row —
            this column holds the actions alone, at a fixed width so they land
            at the same x on every FAQ. */}
        <div className="flex w-[64px] shrink-0 items-center justify-end gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-icon"
            title={MESSAGES.SETTINGS.FAQ.ACTION_EDIT}
            onClick={onEdit}
          >
            <IconPencil size={15} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-icon text-[var(--danger-icon)]"
            title={MESSAGES.SETTINGS.FAQ.ACTION_REMOVE}
            onClick={onDelete}
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div id={panelId} className="border-t border-[var(--border-xs)] bg-[var(--surface-alt)]">
          <p className="whitespace-pre-line px-4 py-3 pl-[44px] text-[13px] font-medium leading-relaxed text-[var(--t3)]">
            {faq.answer}
          </p>
          <p className="px-4 pb-3 pl-[44px] text-[11.5px] font-semibold text-[var(--t4)]">
            {MESSAGES.SETTINGS.FAQ.UPDATED_PREFIX} {faq.updated_at}
          </p>
        </div>
      )}
    </div>
  );
}
