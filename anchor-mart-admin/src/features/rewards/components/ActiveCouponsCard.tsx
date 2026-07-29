import { IconEdit, IconTicket, IconTrash } from "@tabler/icons-react";

import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/lib/messages";
import type { Coupon } from "../types/reward.types";

const M = MESSAGES.REWARDS;

export interface ActiveCouponsCardProps {
  coupons: Coupon[];
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
}

/**
 * "Active Coupons" panel — renders the coupon list inside a SectionCard.
 * Purely presentational: the parent owns coupon state and passes handlers for
 * the add / edit / delete actions.
 */
export function ActiveCouponsCard({ coupons, onEdit, onDelete }: ActiveCouponsCardProps) {
  return (
    <SectionCard
      icon={<IconTicket size={18} />}
      title={M.COUPONS.TITLE}
      // Body is a positioning context; the absolutely-filled list below lets the
      // card stretch to match the Loyalty card without its coupon count
      // inflating the grid row (which would make Loyalty taller too).
      bodyPadding="none"
      bodyClassName="relative min-h-0"
    >
      {/* Fills the card height; overflowing coupons scroll. `pt-4` sets the
          space above the first coupon; `pb-2.5` the space below the last. */}
      <div className="absolute inset-0 flex flex-col gap-2.5 overflow-y-auto px-5 pt-4.5 pb-2.5">
        {coupons.map((cp) => (
          // Clickable row rendered as an ARIA button (a native <button>
          // can't wrap the edit/delete buttons inside it).
          <div
            key={cp.code}
            // biome-ignore lint/a11y/useSemanticElements: contains nested action buttons, so a native <button> is invalid
            role="button"
            tabIndex={0}
            onClick={() => onEdit(cp)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(cp);
              }
            }}
            className="cursor-pointer rounded-[var(--radius-md)] border border-[color:var(--border-xs)] border-l-[3px] border-l-[color:var(--teal-500)] bg-[var(--surface-alt)] px-3.5 py-2.5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-500)]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="mono text-[14px] font-extrabold text-[var(--teal-600)]">
                    {cp.code}
                  </span>
                </div>
                <div className="text-[12px] font-semibold text-[var(--t2)]">
                  {cp.d} · {cp.m}
                </div>
                <div className="text-[11px] text-[var(--t4)] mt-0.5">
                  {M.COUPONS.USES(cp.u)} · {M.COUPONS.EXPIRES(cp.e)}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="xs"
                  title={MESSAGES.COMMON.EDIT}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(cp);
                  }}
                >
                  <IconEdit size={14} />
                </Button>
                <Button
                  variant="danger"
                  size="xs"
                  title={MESSAGES.COMMON.DELETE}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(cp);
                  }}
                >
                  <IconTrash size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
