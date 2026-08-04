import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { textColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { clearParams } from "@/lib/utils";
import {
  IconAlertTriangle,
  IconGift,
  IconGiftOff,
  IconSettings,
  IconShip,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  useDismissShipMutation,
  useGetGiftConfigQuery,
  useGetGiftShipsQuery,
  useUndismissShipMutation,
} from "../api/giftApi";
import { DepartureChip, GiftProgress, shortDate } from "../lib/giftFormat";
import type { GiftShip } from "../types/gift.types";
import { GiftConfigDrawer } from "./GiftConfigDrawer";
import { GiftShipDetailDrawer } from "./GiftShipDetailDrawer";
import { useShipGiftActions } from "./useShipGiftActions";

const M = MESSAGES.GIFTS;
const LIMIT = 10;

/**
 * Sentinel for "no gift-state filter". Every filter select needs an explicit
 * clear option — a placeholder only shows while nothing is selected, so without
 * this the filter could be set and then never unset.
 */
const GIFT_STATUS_ANY = "any";

const GIFT_STATUS_OPTIONS = [
  { value: GIFT_STATUS_ANY, label: M.FILTERS.GIFT_STATUS_ANY },
  { value: "none", label: M.FILTERS.GIFT_STATUS_NONE },
  { value: "partial", label: M.FILTERS.GIFT_STATUS_PARTIAL },
  { value: "all", label: M.FILTERS.GIFT_STATUS_ALL },
];

// `arrival` is the API's own default, so it is a real selectable option rather
// than an implicit blank.
const ORDERING_OPTIONS = [
  { value: "arrival", label: M.FILTERS.ORDERING_ARRIVAL },
  { value: "-arrival", label: M.FILTERS.ORDERING_ARRIVAL_DESC },
  { value: "-order_count", label: M.FILTERS.ORDERING_ORDERS },
];

/**
 * Dismissed vessels are hidden by default. A select rather than a bare
 * checkbox, so this reads as one of the header's filters instead of a stray
 * form control.
 */
const VISIBILITY_OPTIONS = [
  { value: "active", label: M.FILTERS.VISIBILITY_ACTIVE },
  { value: "all", label: M.FILTERS.VISIBILITY_ALL },
];

/**
 * Flow 20 — the ship-browse landing screen.
 *
 * One row per IMO with live giftable orders. A vessel below `min_orders` is not
 * filtered out, it is **out of scope entirely** — it never appears, its detail
 * 404s, and both grant paths refuse it — which is why the empty state explains
 * the threshold rather than offering a filter reset.
 */
export function GiftShipsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedImo, setSelectedImo] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const [dismissShip] = useDismissShipMutation();
  const [undismissShip] = useUndismissShipMutation();
  const { grantShip, isGranting } = useShipGiftActions();

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const giftStatus = searchParams.get("gift_status") ?? GIFT_STATUS_ANY;
  const ordering = searchParams.get("ordering") ?? "arrival";
  const visibility = searchParams.get("visibility") ?? "active";

  const { data, isLoading, isError, refetch } = useGetGiftShipsQuery({
    page,
    limit: LIMIT,
    search,
    // The sentinel is a UI concept — the API validates `gift_status` and 400s
    // on anything outside none/partial/all, so it must not travel.
    giftStatus: giftStatus === GIFT_STATUS_ANY ? "" : giftStatus,
    ordering,
    includeDismissed: visibility === "all",
  });

  // Read for the empty-state copy, and as the fallback for `program_enabled`
  // when no row has loaded to carry it.
  const { data: config } = useGetGiftConfigQuery();

  const ships = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  /**
   * `program_enabled` is the master switch echoed onto every row, so any row
   * answers for the whole programme.
   */
  const programEnabled = ships[0]?.program_enabled ?? config?.is_enabled ?? true;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const handleDismissToggle = async (ship: GiftShip) => {
    // Dismiss/undismiss are exempt from the master switch — they change only
    // what one admin sees, so blocking them while the programme is paused would
    // protect nothing.
    const action = ship.is_dismissed ? undismissShip : dismissShip;
    const ok = ship.is_dismissed ? M.TOAST.UNDISMISS_SUCCESS : M.TOAST.DISMISS_SUCCESS;
    const fail = ship.is_dismissed ? M.TOAST.UNDISMISS_ERROR : M.TOAST.DISMISS_ERROR;
    try {
      await action(ship.imo_number).unwrap();
      toast.success(ok);
    } catch (error) {
      toast.error(getApiMessage(error) ?? fail);
    }
  };

  /**
   * Gifting is ship-level: one action per vessel, never per order. Revoking
   * needs a reason on every underlying call, so it is driven from the drawer
   * rather than fired straight off a table row.
   */
  const handleGrant = async (ship: GiftShip) => {
    try {
      toast.success((await grantShip(ship.imo_number)) || M.DETAIL.GRANTED_TOAST);
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.DETAIL.GRANT_ERROR);
    }
  };

  const sailorsInScope = ships.reduce((sum, s) => sum + s.sailor_count, 0);
  const sailorsGifted = ships.reduce((sum, s) => sum + s.gifted_sailor_count, 0);

  // Derived from the loaded page — there is no stats endpoint for this flow, so
  // these describe what's on screen rather than a platform-wide total.
  const statItems = [
    {
      id: "ships",
      label: M.STATS.SHIPS,
      value: data?.count ?? M.DASH,
      icon: <IconShip size={19} />,
      variant: "navy" as const,
    },
    {
      id: "sailors",
      label: M.STATS.SAILORS,
      value: sailorsInScope,
      icon: <IconUsers size={19} />,
      variant: "teal" as const,
    },
    {
      id: "gifted",
      label: M.STATS.GIFTED,
      value: sailorsGifted,
      icon: <IconGift size={19} />,
      variant: "green" as const,
    },
    {
      // The work-queue size: who could still be gifted right now.
      id: "awaiting",
      label: M.STATS.AWAITING,
      value: Math.max(0, sailorsInScope - sailorsGifted),
      icon: <IconAlertTriangle size={19} />,
      variant: "amber" as const,
    },
  ];

  const columns: Column<GiftShip>[] = [
    {
      id: "vessel",
      header: M.COLUMNS.VESSEL,
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="av av-teal shrink-0">
            <IconShip size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="td-p trunc">{s.vessel_name || M.DASH}</span>
              {s.has_gift_history && (
                <Badge
                  variant="neutral"
                  className="h-[18px] px-1.5 text-[9px]"
                  title={M.BADGE_HISTORY_TITLE}
                >
                  {M.BADGE_HISTORY}
                </Badge>
              )}
              {s.is_dismissed && (
                <Badge variant="warning" className="h-[18px] px-1.5 text-[9px]">
                  {M.BADGE_DISMISSED}
                </Badge>
              )}
            </div>
            {/* IMO is the grouping key and the only stable identifier, so it
                sits under the name rather than taking a column of its own. */}
            <div className="td-m trunc">
              {s.imo_number}
              {s.ports.length > 0 ? ` · ${s.ports.map((p) => p.port_name).join(", ")}` : ""}
            </div>
          </div>
        </div>
      ),
      className: "max-w-[280px]",
    },
    {
      // Arrival → departure. `latest_departure` is the deadline the whole
      // decision hangs on: the gift rides an order that must be delivered
      // before the vessel sails.
      id: "port-call",
      header: M.COLUMNS.PORT_CALL,
      cell: (s) => (
        <div>
          <div className="text-[12.5px] font-semibold text-[var(--t2)]">
            {M.PORT_WINDOW(shortDate(s.earliest_arrival), shortDate(s.latest_departure))}
          </div>
          <div className="mt-1">
            <DepartureChip departure={s.latest_departure} />
          </div>
        </div>
      ),
    },
    {
      // Sailors above orders: four orders from one person is not a crew, and
      // that difference is what decides whether the ship is worth gifting.
      id: "crew",
      header: M.COLUMNS.CREW,
      cell: (s) => (
        <div>
          <div className="td-p">{M.CREW_SAILORS(s.sailor_count)}</div>
          <div className="td-m">{M.CREW_ORDERS(s.order_count)}</div>
        </div>
      ),
    },
    {
      id: "gifted",
      header: M.COLUMNS.GIFTED,
      cell: (s) => <GiftProgress gifted={s.gifted_sailor_count} total={s.sailor_count} />,
    },
    textColumn({
      id: "value",
      header: M.COLUMNS.VALUE,
      get: (s) => `$${Number(s.total_value).toFixed(2)}`,
      cellClassName: "td-p",
    }),
    {
      // A labelled button rather than the shared icon catalog: dismiss/restore
      // is a two-way toggle and the catalog has no icon that reads as "restore"
      // — reusing the eye would say "view", which is the wrong verb.
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-[210px] text-right",
      headerClassName: "text-right",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          {s.gifted_sailor_count > 0 ? (
            // Revoking needs a reason, so the row hands off to the drawer where
            // that form lives rather than firing a destructive call inline.
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={!s.program_enabled}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImo(s.imo_number);
              }}
            >
              <IconGiftOff size={14} />
              {M.ACTION_REVOKE}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!s.program_enabled || isGranting}
              onClick={(e) => {
                e.stopPropagation();
                void handleGrant(s);
              }}
            >
              <IconGift size={14} />
              {isGranting ? M.ACTION_GRANTING : M.ACTION_GRANT}
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              void handleDismissToggle(s);
            }}
          >
            {s.is_dismissed ? M.ACTION_UNDISMISS : M.ACTION_DISMISS}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(v) => setParam("search", v)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isLoading}
            filters={[
              {
                id: "gift_status",
                value: giftStatus,
                placeholder: M.FILTERS.GIFT_STATUS_PLACEHOLDER,
                options: GIFT_STATUS_OPTIONS,
                width: "165px",
                onValueChange: (v) => setParam("gift_status", v),
                emptyValue: GIFT_STATUS_ANY,
              },
              {
                id: "ordering",
                value: ordering,
                placeholder: M.FILTERS.ORDERING_PLACEHOLDER,
                options: ORDERING_OPTIONS,
                width: "165px",
                onValueChange: (v) => setParam("ordering", v),
                emptyValue: "arrival",
              },
              {
                id: "visibility",
                value: visibility,
                placeholder: M.FILTERS.VISIBILITY_PLACEHOLDER,
                options: VISIBILITY_OPTIONS,
                width: "165px",
                onValueChange: (v) => setParam("visibility", v),
                emptyValue: "active",
              },
            ]}
            onReset={() =>
              setSearchParams(
                clearParams(searchParams, [
                  "search",
                  "gift_status",
                  "ordering",
                  "visibility",
                  "page",
                ]),
              )
            }
          >
            {/* Icon-only: the header already carries three filter selects, and
                the programme settings are opened rarely. `aria-label` carries
                the name for screen readers, since the tooltip is visual only. */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="btn-icon"
                    aria-label={M.CONFIGURE}
                    onClick={() => setConfigOpen(true)}
                  >
                    <IconSettings size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{M.CONFIGURE}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SearchFilters>
        }
      />

      {!programEnabled && (
        <div className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3">
          <IconAlertTriangle size={17} className="mt-px shrink-0 text-[var(--warning-icon)]" />
          <span className="text-[12.5px] font-semibold text-[var(--warning-text)]">
            {M.PROGRAM_OFF}
          </span>
        </div>
      )}

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={ships}
        rowKey="imo_number"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={(p) => {
          const next = new URLSearchParams(searchParams);
          next.set("page", String(p));
          setSearchParams(next);
        }}
        showPagination
        emptyMessage={`${M.EMPTY} ${M.EMPTY_HINT(config?.min_orders ?? 2)}`}
        onRowClick={(s) => setSelectedImo(s.imo_number)}
      />

      <GiftShipDetailDrawer
        imo={selectedImo}
        isOpen={!!selectedImo}
        onClose={() => setSelectedImo(null)}
      />

      <GiftConfigDrawer isOpen={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
}

export default GiftShipsPage;
