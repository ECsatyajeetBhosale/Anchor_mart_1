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
import { Link } from "react-router-dom";

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
import type {
  SpecialRequestAddress,
  SpecialRequestDetail,
  SpecialRequestPlace,
} from "../types/specialRequest.types";
import { SpecialRequestLifecycleRail } from "./SpecialRequestLifecycleRail";

const M = MESSAGES.SPECIAL_REQUESTS;
const D = M.DETAIL;
const RB = M.REBILL_BANNER;

/** "Fujairah (AEFJR)" — the place plus its code, when there is one. */
function placeLabel(place?: SpecialRequestPlace | null): string {
  if (!place?.name) return "";
  return place.code ? `${place.name} (${place.code})` : place.name;
}

/**
 * The delivery address as one readable block: who receives it, on which vessel,
 * and where on board. Blank parts are dropped rather than rendered as dashes —
 * the object is optional in most of its own fields.
 */
function addressLines(address?: SpecialRequestAddress | null): string[] {
  if (!address) return [];
  const berth = [
    address.deck && D.ADDRESS.DECK(address.deck),
    address.cabin_number && D.ADDRESS.CABIN(address.cabin_number),
    address.section && D.ADDRESS.SECTION(address.section),
  ].filter(Boolean) as string[];
  return [
    [address.full_name, address.phone].filter(Boolean).join(" · "),
    [address.vessel_name, address.imo_number && D.ADDRESS.IMO(address.imo_number)]
      .filter(Boolean)
      .join(" · "),
    berth.join(" · "),
    [address.port_name, address.anchorage_name].filter(Boolean).join(" · "),
    address.delivery_instructions ?? "",
  ].filter((line) => line.trim() !== "");
}

/**
 * One line of the rebill diff: what the delivery detail is now, and what the
 * sailor is asking for. Rendered only for the keys they actually changed —
 * `pending_delivery_changes` omits the rest.
 */
function DiffRow({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="detail-kv">
      <div className="detail-k">{label}</div>
      <div className="detail-v">
        <div className="text-[12px] font-medium text-[var(--t4)] line-through">{from || "—"}</div>
        <div className="text-[13px] font-bold text-[var(--warning-text)]">{to || "—"}</div>
      </div>
    </div>
  );
}

/** A row of thumbnails; used once per uploader. */
function Gallery({ srcs, productName }: { srcs: string[]; productName: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      {srcs.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={D.IMAGE_ALT(productName, i + 1)}
          className="h-28 w-28 rounded-[var(--radius-sm)] border border-[var(--border-sm)] object-cover"
        />
      ))}
    </div>
  );
}

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
  /**
   * Galleries, split by who uploaded. `images_by_customer` falls back to
   * `primary_image` so a request carrying only that still shows something; the
   * legacy flat `images` list is deliberately not used, since it merges both
   * uploaders and cannot say which is which.
   */
  const adminImages = detail?.images_by_admin ?? [];
  const customerImages = detail?.images_by_customer?.length
    ? detail.images_by_customer
    : detail?.primary_image
      ? [detail.primary_image]
      : [];
  const images = [...customerImages, ...adminImages];
  const deliveryLines = addressLines(detail?.shipping_address);
  // Only present while a delivery change is staged and unquoted.
  const pending = detail?.pending_delivery_changes ?? null;
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
                        <Row label={D.CATEGORY} value={dash(detail.category?.name)} />
                        {/* The sailor's own words. `description` and `notes` are
                            never written by an admin — the quote's text lives in
                            `quote_description` on the Quote tab. */}
                        <Row label={D.DESCRIPTION} value={dash(detail.description)} />
                        <Row label={D.NOTES} value={dash(detail.notes)} />
                        <Row label={D.CUSTOMER_NOTE} value={dash(detail.customer_note)} />
                        <Row label={D.PLATFORM} value={dash(detail.platform)} />
                      </>
                    ),
                  },
                  {
                    value: "delivery",
                    label: D.TABS.DELIVERY,
                    content: (
                      <>
                        {/* Where the goods are going. Until the admin detail
                            carried this, the quote screen priced a delivery it
                            could not see. */}
                        <div className="sec-label">{D.DESTINATION}</div>
                        <Row
                          label={D.ADDRESS_LABEL}
                          value={
                            deliveryLines.length ? (
                              <div className="flex flex-col gap-0.5">
                                {deliveryLines.map((line) => (
                                  <span key={line}>{line}</span>
                                ))}
                              </div>
                            ) : (
                              D.FALLBACK
                            )
                          }
                        />
                        <Row label={D.PORT} value={dash(placeLabel(detail.port))} />
                        <Row label={D.ANCHORAGE} value={dash(placeLabel(detail.anchorage))} />

                        <div className="sec-label mt16">{D.SCHEDULE}</div>
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

                        {/* What the sailor is asking to change, against what is
                            on the request today. The staged snapshot is not
                            applied until generate-bill folds it in, so the rows
                            above still show the current values — the two read as
                            a before/after and the admin re-quotes on facts. */}
                        {pending && (
                          <>
                            <div className="sec-label mt16">{D.PENDING_CHANGES}</div>
                            {pending.shipping_address && (
                              <DiffRow
                                label={D.ADDRESS_LABEL}
                                from={addressLines(detail.shipping_address).join(" · ")}
                                to={addressLines(pending.shipping_address).join(" · ")}
                              />
                            )}
                            {pending.port && (
                              <DiffRow
                                label={D.PORT}
                                from={placeLabel(detail.port)}
                                to={placeLabel(pending.port)}
                              />
                            )}
                            {pending.anchorage && (
                              <DiffRow
                                label={D.ANCHORAGE}
                                from={placeLabel(detail.anchorage)}
                                to={placeLabel(pending.anchorage)}
                              />
                            )}
                            {pending.ship_arrival_date && (
                              <DiffRow
                                label={D.SHIP_ARRIVAL}
                                from={formatDate(detail.ship_arrival_date)}
                                to={formatDate(pending.ship_arrival_date)}
                              />
                            )}
                            {pending.expected_departure && (
                              <DiffRow
                                label={D.EXPECTED_DEPARTURE}
                                from={formatDate(detail.expected_departure)}
                                to={formatDate(pending.expected_departure)}
                              />
                            )}
                            {/* A port change without an anchorage clears the
                                anchorage when applied — one belongs to a single
                                port and must not outlive a change of port. */}
                            {pending.port && !pending.anchorage && detail.anchorage?.name && (
                              <div className="mt-1 text-[11.5px] font-medium text-[var(--t4)]">
                                {D.ANCHORAGE_CLEARED}
                              </div>
                            )}
                          </>
                        )}
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
                        {/* The admin's own description of what they sourced.
                            Shown only when it exists: it is `""` on every
                            request quoted before the field was split out, and
                            falling back to `description` there would put the
                            sailor's words under an admin label. */}
                        {detail.quote_description && (
                          <Row label={D.QUOTE_DESCRIPTION} value={detail.quote_description} />
                        )}
                        <Row label={D.ADMIN_RESPONSE} value={dash(detail.admin_response)} />

                        {/* Once paid, the request became an order — this is the
                            only place its `AM…` number appears. */}
                        {detail.order?.order_number && (
                          <Row
                            label={D.ORDER}
                            value={
                              <span className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/orders?search=${encodeURIComponent(detail.order.order_number)}`}
                                  className="mono cteal hover:underline"
                                >
                                  {detail.order.order_number}
                                </Link>
                                {detail.order.status && (
                                  <Badge variant="neutral" className="h-[20px] text-[10px]">
                                    {detail.order.status}
                                  </Badge>
                                )}
                              </span>
                            }
                          />
                        )}

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
                        /* Split by uploader. The flat `images` list mixes both
                           and loses `is_uploaded_by_admin`, so a reference photo
                           attached to a quote was indistinguishable from what
                           the sailor sent. */
                        <>
                          {customerImages.length > 0 && (
                            <>
                              <div className="sec-label">{D.IMAGES_BY_CUSTOMER}</div>
                              <Gallery srcs={customerImages} productName={productName} />
                            </>
                          )}
                          {adminImages.length > 0 && (
                            <>
                              <div className="sec-label mt16">{D.IMAGES_BY_ADMIN}</div>
                              <Gallery srcs={adminImages} productName={productName} />
                            </>
                          )}
                        </>
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
