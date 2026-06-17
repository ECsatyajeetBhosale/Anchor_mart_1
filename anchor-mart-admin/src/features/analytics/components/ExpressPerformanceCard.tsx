import { IconBolt, IconDownload } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";

import { EXPRESS_PERFORMANCE, type ExpressPerformanceRow } from "../data/analyticsData";

const M = MESSAGES.ANALYTICS;

/** Tiny inline sparkline built from the design-system `.spark-bar` class. */
function Sparkline({ values }: { values: number[] }) {
  return (
    <div className="sparkline">
      {values.map((v, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-position bars, values may repeat
          key={i}
          className="spark-bar bg-[var(--teal-400)] opacity-70"
          style={{ height: `${v * 2.5}px` }}
        />
      ))}
    </div>
  );
}

interface RankedRow extends ExpressPerformanceRow {
  rank: number;
}

const ROWS: RankedRow[] = EXPRESS_PERFORMANCE.map((row, i) => ({ ...row, rank: i + 1 }));

const COLUMNS: Column<RankedRow>[] = [
  { id: "rank", header: M.COLUMNS.RANK, accessorKey: "rank", className: "td-m w-10" },
  { id: "product", header: M.COLUMNS.PRODUCT, accessorKey: "name", className: "td-p" },
  {
    id: "category",
    header: M.COLUMNS.CATEGORY,
    cell: (row) => <Badge variant="navy">{row.category}</Badge>,
  },
  { id: "units", header: M.COLUMNS.UNITS, accessorKey: "units", className: "td-p" },
  { id: "revenue", header: M.COLUMNS.REVENUE, accessorKey: "revenue", className: "td-p" },
  {
    id: "growth",
    header: M.COLUMNS.GROWTH,
    cell: (row) => <span className="csuccess w7">{row.growth}</span>,
  },
  { id: "trend", header: M.COLUMNS.TREND, cell: (row) => <Sparkline values={row.spark} /> },
];

/** Express item leaderboard — clickable rows drill through to the Express page. */
export function ExpressPerformanceCard() {
  const navigate = useNavigate();

  return (
    <SectionCard
      bodyPadding="none"
      icon={<IconBolt size={17} className="text-[var(--t4)]" />}
      title={M.EXPRESS_PERFORMANCE}
      actions={
        <Button variant="ghost" size="xs" onClick={() => toast.success(M.EXPORTED)}>
          <IconDownload size={14} />
          {M.EXPORT}
        </Button>
      }
    >
      <DataTable
        bare
        columns={COLUMNS}
        data={ROWS}
        rowKey="name"
        showPagination={false}
        onRowClick={() => navigate(APP_ROUTES.EXPRESS)}
      />
    </SectionCard>
  );
}

export default ExpressPerformanceCard;
