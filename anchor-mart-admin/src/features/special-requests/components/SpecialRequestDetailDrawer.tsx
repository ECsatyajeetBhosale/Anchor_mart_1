import {
  IconAlertTriangle,
  IconBolt,
  IconClipboardText,
  IconFileInvoice,
  IconPhotoOff,
  IconPlus,
  IconX,
} from "@tabler/icons-react";

import type { ReactNode } from "react";

import { DynamicTabs } from "@/components/common/DynamicTabs";
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
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import {
  specialRequestStatusVariant,
  useGetSpecialRequestDetailQuery,
} from "../api/specialRequestApi";
import { dash, formatDate, money, quotedTotal, symbolFor } from "../lib/specialRequestFormat";
import {
  canAdminReject,
  canAllowChanges,
  canGenerateBill,
  isAtRebillCap,
  isKnownStatus,
} from "../lib/specialRequestStatus";
import type { SpecialRequestDetail } from "../types/specialRequest.types";
import { SpecialRequestLifecycleRail } from "./SpecialRequestLifecycleRail";

const M = MESSAGES.SPECIAL_REQUESTS;
const D = M.DETAIL;
const RB = M.REBILL_BANNER;

/** One key/value row — the Orders-drawer detail layout. */
function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="detail-kv">
      <div className="detail-k">{label}</div>
      <div className={className ? `detail-v ${className}` : "detail-v"}>{value}</div>
    </div>
  );
}

export interface SpecialRequestDetailDrawerProps {
  /** Row id (UUID) sent to the detail API as `product_id`; null when none selected. */
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Opens the quote popup (Flow 13 API 10). Like the Orders drawer, each action
   * renders **only** when its handler is supplied — and then only when the
   * request's status actually allows it.
   */
  onGenerateBill?: (detail: SpecialRequestDetail) => void;
  /** Opens the reject-reason popup (Flow 13 API 11). */
  onReject?: (detail: SpecialRequestDetail) => void;
  /** Opens the raise-the-rebill-cap popup (Flow 13 API 12). */
  onAllowChanges?: (detail: SpecialRequestDetail) => void;
}

/**
 * Right-side review drawer for a special request, built on the shared shadcn
 * `Sheet` and matching the Orders drawer: icon-tile header, lifecycle rail,
 * status badges, then `sec-label` sections of `detail-kv` rows and a
 * highlighted total block.
 *
 * The footer actions are gated on the Flow 13 state machine: quote and reject
 * only before the request is quoted, allow-changes on anything not closed. When
 * no action is legal the footer explains whose move it is instead of offering a
 * button that would 400.
 */
export function SpecialRequestDetailDrawer({
  requestId,
  isOpen,
  onClose,
  onGenerateBill,
  onReject,
  onAllowChanges,
}: SpecialRequestDetailDrawerProps) {
  // Fetch only when the drawer is open and a row id is present.
  const {
    data: detail,
    isFetching,
    isUninitialized,
    isError,
    error,
    refetch,
  } = useGetSpecialRequestDetailQuery(requestId ?? "", { skip: !isOpen || !requestId });

  // Treat the not-yet-started frame as loading too, so the empty state never
  // flashes between opening the drawer and the request kicking off.
  const isBusy = isFetching || isUninitialized;

  // Derived, fallback-guarded view values (meaningful once `detail` resolves).
  const user = detail?.user ?? undefined;
  // The API frequently sends empty first/last names, so the email is the only
  // usable identity — fall back to it rather than rendering a bare dash.
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || (user?.email ?? "");
  // The detail endpoint does expose a real profile picture (unlike the list),
  // so prefer it and only fall back to the deterministic placeholder.
  const avatarSrc = user?.profile_picture || getFallbackAvatar(user?.id || fullName || "sailor");
  const currency = detail?.currency;
  const productName = dash(detail?.product_name);
  // `images` is the gallery, but a request can carry only a `primary_image` —
  // fall back to it rather than claiming there is no image.
  const images = detail?.images?.length
    ? detail.images
    : detail?.primary_image
      ? [detail.primary_image]
      : [];
  const total = quotedTotal(
    detail?.quoted_price,
    detail?.quantity,
    detail?.fast_delivery_charge,
    detail?.is_fastest_delivery,
  );

  // Quote above the sailor's stated ceiling — compared on the same basis the
  // sailor sees (the full quoted total, not the per-unit price).
  const budget = Number(detail?.max_budget);
  const overBudget = total !== null && !Number.isNaN(budget) && budget > 0 && total > budget;

  // Flow 13 gates — which of the three admin actions this status permits.
  const status = detail?.status ?? "";
  const showBill = !!onGenerateBill && !!detail && canGenerateBill(status);
  const showReject = !!onReject && !!detail && canAdminReject(status);
  const showAllowChanges = !!onAllowChanges && !!detail && canAllowChanges(status);
  const hasActions = showBill || showReject || showAllowChanges;
  const atCap = isAtRebillCap(detail?.rebill_count, detail?.rebill_cap);

  /**
   * When something is unavailable, say why. `quote_sent` isn't stuck — the ball
   * is simply in the sailor's court. The final branch covers a status outside
   * the documented machine: without it the footer would vanish silently and
   * leave the admin with no explanation at all.
   */
  const idleNotice = !detail
    ? null
    : status === "quote_sent"
      ? D.AWAITING_SAILOR
      : status === "accepted"
        ? D.CLOSED_ACCEPTED
        : status === "rejected"
          ? D.CLOSED_REJECTED
          : isKnownStatus(status)
            ? null
            : D.UNKNOWN_STATUS(status);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        adjustable
        defaultWidth={640}
        className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
      >
        {/* Header — icon tile + title + context line, matching the Orders drawer. */}
        <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconClipboardText size={22} />
            </div>
            <div>
              <SheetTitle className="text-[15px] font-extrabold">
                {detail?.reference ? D.TITLE(detail.reference) : D.TITLE_FALLBACK}
              </SheetTitle>
              <SheetDescription>{detail ? productName : D.FALLBACK}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div key={detail?.id ?? requestId ?? "none"} className="flex-1 overflow-y-auto p-6">
          {isBusy ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--border-md)] border-t-[var(--teal-500)]" />
              <span className="text-[13px] font-semibold text-[var(--t4)]">{D.LOADING}</span>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="text-[13.5px] font-semibold text-[var(--danger-text)]">
                {getApiMessage(error) ?? D.FETCH_ERROR}
              </span>
              <Button variant="secondary" size="xs" onClick={() => refetch()}>
                {D.RETRY}
              </Button>
            </div>
          ) : !detail ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <span className="text-[14px] font-bold text-[var(--t3)]">{D.EMPTY}</span>
            </div>
          ) : (
            <>
              {/* Status badges */}
              <div className="flex gap-2 mb-5">
                <Badge
                  variant={specialRequestStatusVariant(detail.status ?? "")}
                  className="h-auto text-[12px] px-3 py-[5px]"
                >
                  {dash(detail.status_display)}
                </Badge>
                {detail.is_fastest_delivery && (
                  <Badge variant="amber" className="h-auto text-[12px] px-3 py-[5px]">
                    <IconBolt size={13} className="mr-1 inline" />
                    {D.FASTEST_BADGE}
                  </Badge>
                )}
              </div>

              {/* Where the request sits in the sourcing/quotation lifecycle. */}
              <SpecialRequestLifecycleRail
                status={status}
                statusLabel={detail.status_display ?? undefined}
                className="mb-5"
              />

              {/* The sailor changed delivery details after the quote — the admin
                  must re-quote, and the cap tells them whether that loop is
                  still open. */}
              {detail.rebill_requested && (
                <div className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3.5 py-3">
                  <IconAlertTriangle
                    size={16}
                    className="mt-0.5 shrink-0 text-[var(--warning-icon)]"
                  />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-extrabold text-[var(--warning-text)]">
                      {RB.TITLE}
                    </div>
                    <div className="mt-0.5 text-[11.5px] font-medium leading-[1.45] text-[var(--t3)]">
                      {atCap ? RB.AT_CAP(detail.rebill_cap ?? 0) : RB.BODY}
                    </div>
                  </div>
                </div>
              )}

              {/* The detail itself is tabbed; the state above stays pinned so
                  it reads the same whichever tab is open. */}
              <DynamicTabs
                tabs={[
                  {
                    value: "overview",
                    label: D.TABS.OVERVIEW,
                    content: (
                      <>
                        <div className="sec-label">{D.REQUEST_INFO}</div>
                        <Row
                          label={D.REFERENCE}
                          value={dash(detail.reference)}
                          className="mono cteal"
                        />
                        <Row
                          label={D.SAILOR}
                          value={
                            <span className="flex items-center gap-2">
                              <span className="av av-sm av-img">
                                <img src={avatarSrc} alt={dash(fullName)} />
                              </span>
                              {dash(fullName)}
                            </span>
                          }
                        />
                        <Row label={D.EMAIL} value={dash(user?.email)} />
                        <Row label={D.REQUESTED} value={dash(detail.created_at)} />
                        <Row label={D.UPDATED} value={dash(detail.updated_at)} />

                        <div className="sec-label mt16">{D.ITEM_DETAILS}</div>
                        <Row label={D.PRODUCT_NAME} value={productName} />
                        <Row label={D.BRAND} value={dash(detail.brand)} />
                        <Row label={D.QUANTITY} value={dash(detail.quantity)} />
                        <Row
                          label={D.MAX_BUDGET}
                          value={
                            <span className="flex items-center gap-2">
                              {money(detail.max_budget, currency)}
                              {/* The sailor may well reject a quote above what
                                  they said they'd pay — make it obvious. */}
                              {overBudget && (
                                <Badge variant="warning" className="h-[20px] text-[10px]">
                                  {D.OVER_BUDGET}
                                </Badge>
                              )}
                            </span>
                          }
                        />
                        <Row label={D.DESCRIPTION} value={dash(detail.description)} />
                        <Row label={D.CUSTOMER_NOTE} value={dash(detail.customer_note)} />
                      </>
                    ),
                  },
                  {
                    value: "delivery",
                    label: D.TABS.DELIVERY,
                    content: (
                      <>
                        <Row label={D.SHIP_ARRIVAL} value={formatDate(detail.ship_arrival_date)} />
                        <Row
                          label={D.EXPECTED_DEPARTURE}
                          value={formatDate(detail.expected_departure)}
                        />
                        <Row
                          label={D.FASTEST_DELIVERY}
                          value={detail.is_fastest_delivery ? D.YES : D.NO}
                          className={detail.is_fastest_delivery ? "camber" : undefined}
                        />
                        <Row
                          label={D.REBILL}
                          value={D.REBILL_SUMMARY(
                            detail.rebill_requested ? D.REBILL_REQUESTED : D.REBILL_NOT_REQUESTED,
                            detail.rebill_count ?? 0,
                            detail.rebill_cap ?? 0,
                          )}
                          className={detail.rebill_requested ? "cwarning" : undefined}
                        />
                      </>
                    ),
                  },
                  {
                    value: "quote",
                    label: D.TABS.QUOTE,
                    content: (
                      <>
                        <Row
                          label={D.QUOTED_PRICE}
                          value={
                            detail.quoted_price
                              ? money(detail.quoted_price, currency)
                              : D.NOT_QUOTED
                          }
                          className={detail.quoted_price ? "csuccess" : "c4"}
                        />
                        <Row
                          label={D.FAST_DELIVERY_CHARGE}
                          value={money(detail.fast_delivery_charge, currency)}
                        />
                        <Row label={D.ADMIN_RESPONSE} value={dash(detail.admin_response)} />

                        {/* Quoted total — only once a quote exists. */}
                        {total !== null && (
                          <div className="mt16 rounded-[var(--radius-md)] bg-[var(--navy-25)] px-4 py-3.5">
                            <div className="flex jb aic">
                              <span className="sm c3 w6">{D.QUOTED_TOTAL}</span>
                              <span className="lg w8 num">
                                {`${symbolFor(currency)}${total.toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ),
                  },
                  {
                    value: "images",
                    label: D.TABS.IMAGES(images.length),
                    content:
                      images.length === 0 ? (
                        <div className="srq-img empty">
                          <IconPhotoOff size={26} />
                          <span>{D.NO_IMAGE}</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {images.map((src, i) => (
                            <img
                              key={src}
                              src={src}
                              alt={D.IMAGE_ALT(productName, i + 1)}
                              className="h-28 w-28 rounded-[var(--radius-sm)] border border-[var(--border-sm)] object-cover"
                            />
                          ))}
                        </div>
                      ),
                  },
                ]}
              />
            </>
          )}
        </div>

        {/* Footer — only what the current status actually permits. When no
            action is legal, the notice says whose move it is. Suppressed while
            loading or on a fetch error: the status driving these gates isn't
            trustworthy then, and an action bar over an error message would
            invite a click that is bound to fail. */}
        {detail && !isBusy && !isError && (hasActions || idleNotice) && (
          <SheetFooter className="p-5 border-t border-[var(--border-md)] bg-[var(--surface-alt)] flex-col gap-2.5 items-stretch">
            {/* `quote_sent` still allows allow-changes, so the "whose move is
                it" line can accompany the buttons rather than replace them. */}
            {idleNotice && (
              <div className="w-full text-[12.5px] font-semibold text-[var(--t4)]">
                {idleNotice}
              </div>
            )}
            {hasActions && (
              <div className="flex items-center gap-2 w-full">
                {showReject && (
                  <Button variant="danger" size="sm" onClick={() => onReject?.(detail)}>
                    <IconX size={15} />
                    {D.REJECT}
                  </Button>
                )}
                {showAllowChanges && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className={showReject ? undefined : "mr-auto"}
                    onClick={() => onAllowChanges?.(detail)}
                  >
                    <IconPlus size={15} />
                    {D.ALLOW_CHANGES}
                  </Button>
                )}
                {showBill && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="ml-auto"
                    onClick={() => onGenerateBill?.(detail)}
                  >
                    <IconFileInvoice size={15} />
                    {D.SEND_QUOTE}
                  </Button>
                )}
              </div>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default SpecialRequestDetailDrawer;
