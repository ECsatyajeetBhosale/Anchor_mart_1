import { DropdownSelect } from "@/components/common/DropdownSelect";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { AppRatingsTab } from "./AppRatingsTab";
import { DeliveryRatingsTab } from "./DeliveryRatingsTab";
import { RatingsSummarySection } from "./RatingsSummarySection";

const M = MESSAGES.RATINGS;

const TAB_DELIVERY = "delivery";

/**
 * `""` means "omit `days`", which the backend reads as all-time. Anything less
 * than 1 (or non-integer) is a 400, so only these fixed windows are offered.
 */
const WINDOW_OPTIONS = [
  { value: "", label: M.WINDOW.ALL_TIME },
  { value: "7", label: M.WINDOW.DAYS_7 },
  { value: "30", label: M.WINDOW.DAYS_30 },
  { value: "90", label: M.WINDOW.DAYS_90 },
];

/**
 * Flow 16 — Ratings & Reviews. Read-only: the admin sees every review plus the
 * platform-wide averages tile, and can never author or edit one.
 *
 * The per-partner delivery leaderboard is deliberately **not** here — it lives
 * in the partner-KPI reads (Flow 28), which are Build-2.
 */
export function RatingsPage() {
  const [activeTab, setActiveTab] = useState(TAB_DELIVERY);
  // Scopes only the summary tile; the lists below are always unbounded so a
  // filtered search can still find an older review.
  const [days, setDays] = useState("");

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <DropdownSelect
            value={days}
            placeholder={M.WINDOW.PLACEHOLDER}
            options={WINDOW_OPTIONS}
            onValueChange={setDays}
            width="170px"
          />
        }
      />

      <RatingsSummarySection days={days} />

      <DynamicTabs
        value={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { value: TAB_DELIVERY, label: M.TABS.DELIVERY, content: <DeliveryRatingsTab /> },
          { value: "app", label: M.TABS.APP, content: <AppRatingsTab /> },
        ]}
      />
    </div>
  );
}

export default RatingsPage;
