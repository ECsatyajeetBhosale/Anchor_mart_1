import { SearchFilters } from "@/components/common/SearchFilters";
import {
  idColumn,
  textColumn,
  truncatedColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetDeliveryRatingsQuery } from "../api/ratingApi";
import { type DeliveryRating, NEGATIVE_QUICK_TAGS } from "../types/rating.types";
import { RatingStars } from "./RatingStars";
import { ReviewDetailDrawer } from "./ReviewDetailDrawer";

const M = MESSAGES.RATINGS;
const LIMIT = 10;

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: M.FILTERS.RATING_OPTION(n),
}));

/** Human label for a quick tag, falling back to the raw token if it's unknown. */
function tagLabel(tag: string): string {
  return M.TAG_LABELS[tag] ?? tag;
}

/**
 * Every delivery review. Filters live in the URL so a filtered view is
 * shareable and survives a refresh, matching the other list screens.
 *
 * Prefixed URL params (`d_*`) keep this tab's state from colliding with the app
 * tab's, since both render under the same route.
 */
export function DeliveryRatingsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  // The list rows carry every field the drawer shows, so the selected row is
  // held directly — there is no per-rating detail endpoint to fetch.
  const [selected, setSelected] = useState<DeliveryRating | null>(null);

  const page = Number.parseInt(searchParams.get("d_page") ?? "1", 10);
  const search = searchParams.get("d_search") ?? "";
  const rating = searchParams.get("d_rating") ?? "";

  const { data, isLoading, isError, refetch } = useGetDeliveryRatingsQuery({
    page,
    limit: LIMIT,
    search,
    rating,
  });

  const rows = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("d_page", "1");
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("d_page", String(newPage));
    setSearchParams(next);
  };

  const columns: Column<DeliveryRating>[] = [
    idColumn({
      id: "order",
      header: M.DELIVERY.COLUMNS.ORDER,
      get: (r) => r.order_number || M.DASH,
    }),
    twoLineColumn({
      id: "sailor",
      header: M.DELIVERY.COLUMNS.SAILOR,
      primary: (r) => r.sailor_name || M.DASH,
      secondary: (r) => r.sailor_email || M.DASH,
    }),
    // All three partner fields are null when the rating never resolved a
    // partner, so the fallback is a sentence rather than a blank cell.
    twoLineColumn({
      id: "partner",
      header: M.DELIVERY.COLUMNS.PARTNER,
      primary: (r) => r.partner_name || M.DELIVERY.NO_PARTNER,
      secondary: (r) => r.partner_email || M.DASH,
    }),
    {
      id: "rating",
      header: M.DELIVERY.COLUMNS.RATING,
      cell: (r) => <RatingStars value={r.rating} />,
      className: "w-[150px]",
    },
    {
      id: "tags",
      header: M.DELIVERY.COLUMNS.TAGS,
      cell: (r) =>
        r.tags.length === 0 ? (
          <span className="td-m">{M.DASH}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {r.tags.map((tag) => (
              <Badge
                key={tag}
                variant={NEGATIVE_QUICK_TAGS.has(tag) ? "warning" : "teal"}
                className="text-[10px] h-[22px]"
              >
                {tagLabel(tag)}
              </Badge>
            ))}
          </div>
        ),
      className: "max-w-[220px]",
    },
    truncatedColumn({
      id: "comment",
      header: M.DELIVERY.COLUMNS.COMMENT,
      get: (r) => r.comment || M.DASH,
      className: "max-w-[220px]",
    }),
    textColumn({
      id: "created",
      header: M.DELIVERY.COLUMNS.DATE,
      get: (r) => r.created_at || M.DASH,
      cellClassName: "td-m",
    }),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <SearchFilters
          searchValue={search}
          onSearchChange={(v) => setParam("d_search", v)}
          searchPlaceholder={M.DELIVERY.SEARCH_PLACEHOLDER}
          searchDebounceMs={300}
          searchLoading={isLoading}
          filters={[
            {
              id: "rating",
              value: rating,
              placeholder: M.FILTERS.RATING_PLACEHOLDER,
              options: RATING_OPTIONS,
              onValueChange: (v) => setParam("d_rating", v),
            },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.DELIVERY.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.DELIVERY.EMPTY}
        hasActiveFilters={Boolean(search || rating)}
        onResetFilters={() => setSearchParams(new URLSearchParams())}
        onRowClick={setSelected}
      />

      <ReviewDetailDrawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        review={selected ? { kind: "delivery", data: selected } : null}
      />
    </>
  );
}

export default DeliveryRatingsTab;
