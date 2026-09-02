import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MESSAGES } from "@/lib/messages";
import { IconDeviceMobile, IconTruckDelivery } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { type AppRating, type DeliveryRating, NEGATIVE_QUICK_TAGS } from "../types/rating.types";
import { RatingStars } from "./RatingStars";

const M = MESSAGES.RATINGS;
const D = M.DETAIL;

/**
 * The review a drawer is showing. Tagged so one drawer can serve both tables —
 * they share the score, date and free-text sections, and differ only in the
 * middle block.
 */
export type SelectedReview =
  | { kind: "delivery"; data: DeliveryRating }
  | { kind: "app"; data: AppRating };

/** One key/value row — the shared drawer detail layout. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-kv">
      <div className="detail-k">{label}</div>
      <div className="detail-v">{value}</div>
    </div>
  );
}

/** Muted em dash for a field the payload left null. */
function orDash(value: string | null | undefined): string {
  return value?.trim() ? value : M.DASH;
}

export interface ReviewDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** `null` while nothing is selected. */
  review: SelectedReview | null;
}

/**
 * Read-only detail for one review.
 *
 * There is **no per-rating detail endpoint** — `/superadmin/ratings/delivery/`
 * and `/ratings/app/` already return every field on each row — so this renders
 * from the row the table is holding and issues no request. That also means it
 * opens instantly with no loading state.
 *
 * Its value over the table is the parts the table has to abbreviate: the full
 * comment, every quick tag, and both email addresses.
 */
export function ReviewDetailDrawer({ isOpen, onClose, review }: ReviewDetailDrawerProps) {
  const isDelivery = review?.kind === "delivery";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              {isDelivery ? <IconTruckDelivery size={22} /> : <IconDeviceMobile size={22} />}
            </div>
            <div>
              <SheetTitle className="text-xl">
                {isDelivery ? D.DELIVERY_TITLE : D.APP_TITLE}
              </SheetTitle>
              <SheetDescription>
                {isDelivery ? D.DELIVERY_SUBTITLE : D.APP_SUBTITLE}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {review && (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <section>
              <div className="sec-label">{D.SECTIONS.RATING}</div>
              <Row
                label={D.FIELDS.SCORE}
                value={<RatingStars value={review.data.rating} size={16} />}
              />
              <Row label={D.FIELDS.SUBMITTED} value={orDash(review.data.created_at)} />
            </section>

            {review.kind === "delivery" ? (
              <>
                <section>
                  <div className="sec-label">{D.SECTIONS.PEOPLE}</div>
                  <Row label={D.FIELDS.SAILOR} value={orDash(review.data.sailor_name)} />
                  <Row label={D.FIELDS.SAILOR_EMAIL} value={orDash(review.data.sailor_email)} />
                  <Row
                    label={D.FIELDS.PARTNER}
                    value={review.data.partner_name || M.DELIVERY.NO_PARTNER}
                  />
                  <Row label={D.FIELDS.PARTNER_EMAIL} value={orDash(review.data.partner_email)} />
                </section>

                <section>
                  <div className="sec-label">{D.SECTIONS.CONTEXT}</div>
                  <Row label={D.FIELDS.ORDER} value={orDash(review.data.order_number)} />
                  <Row
                    label={D.FIELDS.TAGS}
                    value={
                      review.data.tags.length === 0 ? (
                        <span className="text-[var(--t4)]">{D.NO_TAGS}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {review.data.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant={NEGATIVE_QUICK_TAGS.has(tag) ? "warning" : "teal"}
                              className="h-[22px] text-[10px]"
                            >
                              {M.TAG_LABELS[tag] ?? tag}
                            </Badge>
                          ))}
                        </div>
                      )
                    }
                  />
                </section>

                <p className="fg-hint">{D.PARTNER_NOTE}</p>
              </>
            ) : (
              <section>
                <div className="sec-label">{D.SECTIONS.CONTEXT}</div>
                <Row label={D.FIELDS.USER} value={orDash(review.data.user_name)} />
                <Row label={D.FIELDS.USER_EMAIL} value={orDash(review.data.user_email)} />
                <Row label={D.FIELDS.PLATFORM} value={orDash(review.data.platform)} />
                <Row label={D.FIELDS.VERSION} value={orDash(review.data.app_version)} />
              </section>
            )}

            <section>
              <div className="sec-label">{D.SECTIONS.FEEDBACK}</div>
              {/* Shown in full and unwrapped-preserving: the table truncates it,
                  and reading the sailor's actual words is the point of opening
                  this drawer. */}
              {(() => {
                const text =
                  review.kind === "delivery" ? review.data.comment : review.data.feedback;
                return text?.trim() ? (
                  <p className="whitespace-pre-wrap text-[13.5px] font-medium text-[var(--t1)]">
                    {text}
                  </p>
                ) : (
                  <p className="text-[13px] font-medium text-[var(--t4)]">{D.NO_COMMENT}</p>
                );
              })()}
            </section>
          </div>
        )}

        <SheetFooter className="border-t border-[var(--border-md)] bg-[var(--surface)] p-6">
          <div className="flex w-full items-center justify-between gap-4">
            <span className="fg-hint">{D.READ_ONLY}</span>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {D.CLOSE}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ReviewDetailDrawer;
