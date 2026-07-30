import { SearchFilters } from "@/components/common/SearchFilters";
import {
  badgeColumn,
  textColumn,
  truncatedColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGetAppRatingsQuery } from "../api/ratingApi";
import type { AppRating } from "../types/rating.types";
import { RatingStars } from "./RatingStars";
import { ReviewDetailDrawer } from "./ReviewDetailDrawer";

const M = MESSAGES.RATINGS;
const LIMIT = 10;

const RATING_OPTIONS = [5, 4, 3, 2, 1].map((n) => ({
  value: String(n),
  label: M.FILTERS.RATING_OPTION(n),
}));

/**
 * Platform values are free text on the backend (whatever the client sent), so
 * the filter offers the three surfaces we ship rather than a server-provided
 * enum. The match is case-insensitive and exact.
 */
const PLATFORM_OPTIONS = [
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "web", label: "Web" },
];

/**
 * Every app review. One row per user — `AppRating` is a OneToOne, so a
 * re-submission revises the existing row rather than appending a new one.
 */
export function AppRatingsTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  // The list rows carry every field the drawer shows, so the selected row is
  // held directly — there is no per-rating detail endpoint to fetch.
  const [selected, setSelected] = useState<AppRating | null>(null);

  const page = Number.parseInt(searchParams.get("a_page") ?? "1", 10);
  const search = searchParams.get("a_search") ?? "";
  const rating = searchParams.get("a_rating") ?? "";
  const platform = searchParams.get("a_platform") ?? "";
  const appVersion = searchParams.get("a_version") ?? "";

  const { data, isLoading, isError, refetch } = useGetAppRatingsQuery({
    page,
    limit: LIMIT,
    search,
    rating,
    platform,
    appVersion,
  });

  const rows = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("a_page", "1");
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("a_page", String(newPage));
    setSearchParams(next);
  };

  const columns: Column<AppRating>[] = [
    twoLineColumn({
      id: "user",
      header: M.APP.COLUMNS.USER,
      primary: (r) => r.user_name || M.DASH,
      secondary: (r) => r.user_email || M.DASH,
    }),
    {
      id: "rating",
      header: M.APP.COLUMNS.RATING,
      cell: (r) => <RatingStars value={r.rating} />,
      className: "w-[150px]",
    },
    truncatedColumn({
      id: "feedback",
      header: M.APP.COLUMNS.FEEDBACK,
      get: (r) => r.feedback || M.DASH,
      className: "max-w-[300px]",
    }),
    badgeColumn({
      id: "platform",
      header: M.APP.COLUMNS.PLATFORM,
      get: (r) => r.platform || M.DASH,
      variant: "info",
    }),
    textColumn({
      id: "version",
      header: M.APP.COLUMNS.VERSION,
      get: (r) => r.app_version || M.DASH,
      cellClassName: "td-m",
    }),
    textColumn({
      id: "created",
      header: M.APP.COLUMNS.DATE,
      get: (r) => r.created_at || M.DASH,
      cellClassName: "td-m",
    }),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <SearchFilters
          searchValue={search}
          onSearchChange={(v) => setParam("a_search", v)}
          searchPlaceholder={M.APP.SEARCH_PLACEHOLDER}
          searchDebounceMs={300}
          searchLoading={isLoading}
          filters={[
            {
              id: "rating",
              value: rating,
              placeholder: M.FILTERS.RATING_PLACEHOLDER,
              options: RATING_OPTIONS,
              onValueChange: (v) => setParam("a_rating", v),
            },
            {
              id: "platform",
              value: platform,
              placeholder: M.FILTERS.PLATFORM_PLACEHOLDER,
              options: PLATFORM_OPTIONS,
              onValueChange: (v) => setParam("a_platform", v),
            },
          ]}
        >
          {/* Version is an exact match on a free-text field, so it takes a text
              box rather than a dropdown — there is no endpoint listing versions. */}
          <Input
            className="w-[150px]"
            placeholder={M.FILTERS.VERSION_PLACEHOLDER}
            defaultValue={appVersion}
            onBlur={(e) => setParam("a_version", e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("a_version", e.currentTarget.value.trim());
            }}
          />
        </SearchFilters>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.APP.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.APP.EMPTY}
        hasActiveFilters={Boolean(search || rating || platform || appVersion)}
        onResetFilters={() => setSearchParams(new URLSearchParams())}
        onRowClick={setSelected}
      />

      <ReviewDetailDrawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        review={selected ? { kind: "app", data: selected } : null}
      />
    </>
  );
}

export default AppRatingsTab;
