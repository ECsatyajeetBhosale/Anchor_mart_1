import { IconShoppingCart } from "@tabler/icons-react";
import { useState } from "react";

import { SectionCard } from "@/components/common/SectionCard";
import { textColumn } from "@/components/common/tableColumns";
import { type Column, DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useGetCartsQuery } from "../api/orderApi";
import type { AdminCart } from "../types/order.types";

const M = MESSAGES.CARTS;
const LIMIT = 10;

/**
 * Sailor carts that have not converted into an order — a read-only visibility
 * panel beneath the Orders table. Local paging state rather than URL params, so
 * it never fights the Orders table for the shared `page` key.
 */
export function OpenCartsCard() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useGetCartsQuery({ page, limit: LIMIT });

  const carts = data?.carts ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const columns: Column<AdminCart>[] = [
    textColumn({ id: "customer", header: M.COLUMNS.CUSTOMER, get: (c) => c.customer }),
    textColumn({ id: "email", header: M.COLUMNS.EMAIL, get: (c) => c.email, className: "td-m" }),
    textColumn({ id: "catalog", header: M.COLUMNS.CATALOG, get: (c) => c.catalogType }),
    textColumn({
      id: "items",
      header: M.COLUMNS.ITEMS,
      get: (c) => c.itemCount,
      className: "td-p",
    }),
    textColumn({ id: "value", header: M.COLUMNS.VALUE, get: (c) => c.total, className: "td-p" }),
    textColumn({
      id: "updated",
      header: M.COLUMNS.UPDATED,
      get: (c) => c.updatedAt,
      className: "td-m",
    }),
  ];

  return (
    <SectionCard
      icon={<IconShoppingCart size={18} />}
      title={M.TITLE}
      bodyPadding="none"
      className="mt-5"
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
