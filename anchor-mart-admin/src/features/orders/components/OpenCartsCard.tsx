import { IconShoppingCart } from "@tabler/icons-react";
import { useState } from "react";

import { SectionCard } from "@/components/common/SectionCard";
import { textColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetCartsQuery } from "../api/orderApi";
import type { AdminCart } from "../types/order.types";

const M = MESSAGES.CARTS;
const LIMIT = 10;
/** SKUs named in the contents cell before the rest collapse into a "+N". */
const SKU_PREVIEW = 2;

/**
 * Sailor carts that have not converted into an order — a read-only visibility
 * panel beneath the Orders table.
 *
 * The endpoint returns every cart as one bare array with no `count` and no
 * pagination, so paging happens locally. Local state rather than URL params, so
 * it never fights the Orders table for the shared `page` key.
 */
export function OpenCartsCard() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useGetCartsQuery();

  const allCarts = data?.carts ?? [];
  const totalPages = Math.max(1, Math.ceil(allCarts.length / LIMIT));
  const carts = allCarts.slice((page - 1) * LIMIT, page * LIMIT);

  const columns: Column<AdminCart>[] = [
    {
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      // The payload has no name field at any level — `user` is a bare UUID — so
      // the email is the sailor's whole identity here.
      cell: (c) => (
        <div className="flex items-center gap-2">
          <span className="td-p">{c.email || M.DASH}</span>
          {c.isExpress && (
            <Badge variant="amber" className="h-[20px] text-[9.5px]">
              {M.TYPE_EXPRESS}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "items",
      header: M.COLUMNS.ITEMS,
      cell: (c) => {
        if (c.skus.length === 0) return <span className="td-m">{M.DASH}</span>;
        const shown = c.skus.slice(0, SKU_PREVIEW);
        const extra = c.skus.length - shown.length;
        return (
          <span className="td-m" title={c.skus.join(", ")}>
            {shown.join(", ")}
            {extra > 0 ? ` ${M.SKU_OVERFLOW(extra)}` : ""}
          </span>
        );
      },
      className: "max-w-[200px]",
    },
    // Summed units, not distinct lines: the Items column already lists the SKUs,
    // so a line count would restate the cell beside it.
    textColumn({
      id: "quantity",
      header: M.COLUMNS.QUANTITY,
      get: (c) => c.unitCount,
      className: "td-p",
    }),
    textColumn({ id: "value", header: M.COLUMNS.VALUE, get: (c) => c.total, className: "td-p" }),
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      cell: (c) =>
        c.blockedCount > 0 ? (
          <Badge
            variant="warning"
            className="h-[22px] text-[10px]"
            title={M.BLOCKED_TITLE(c.blockedCount)}
          >
            {M.STATUS_BLOCKED(c.blockedCount)}
          </Badge>
        ) : (
          <Badge variant="success" className="h-[22px] text-[10px]">
            {M.STATUS_READY}
          </Badge>
        ),
    },
  ];

  return (
    <SectionCard
      icon={<IconShoppingCart size={18} />}
      title={M.TITLE}
      bodyPadding="none"
      footer={M.SUBTITLE}
    >
      <DataTable
        columns={columns}
        data={carts}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={setPage}
        showPagination
        emptyMessage={M.EMPTY}
        bare
      />
    </SectionCard>
  );
}

export default OpenCartsCard;
