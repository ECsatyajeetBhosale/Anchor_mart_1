import { StatsGrid } from "@/components/common/StatsGrid";
import { MESSAGES } from "@/lib/messages";
import { IconDeviceMobile, IconStar, IconTruckDelivery } from "@tabler/icons-react";
import { useGetRatingsSummaryQuery } from "../api/ratingApi";

const M = MESSAGES.RATINGS;

export interface RatingsSummarySectionProps {
  /** Rolling window in days as a string; `""` means all-time. */
  days: string;
}

/** Renders an average, keeping the null case distinct from a genuine 0.00. */
function formatAverage(average: number | null): string {
  return average === null ? M.SUMMARY.NOT_RATED : average.toFixed(2);
}

/**
 * The platform headline for the ratings screen: four counters. Owns its own
 * query so the tab tables can refetch independently of it (the summary is
 * cached ~5 min server-side anyway).
 */
export function RatingsSummarySection({ days }: RatingsSummarySectionProps) {
  const { data, isLoading } = useGetRatingsSummaryQuery(days ? { days } : undefined);

  const loading = M.DASH;
  const items = [
    {
      id: "delivery-average",
      label: M.SUMMARY.DELIVERY_AVG,
      value: isLoading || !data ? loading : formatAverage(data.delivery.average),
      icon: <IconStar size={19} />,
      variant: "amber" as const,
    },
    {
      id: "delivery-count",
      label: M.SUMMARY.DELIVERY_COUNT,
      value: isLoading || !data ? loading : data.delivery.count.toLocaleString("en-US"),
      icon: <IconTruckDelivery size={19} />,
      variant: "teal" as const,
    },
    {
      id: "app-average",
      label: M.SUMMARY.APP_AVG,
      value: isLoading || !data ? loading : formatAverage(data.app.average),
      icon: <IconStar size={19} />,
      variant: "navy" as const,
    },
    {
      id: "app-count",
      label: M.SUMMARY.APP_COUNT,
      value: isLoading || !data ? loading : data.app.count.toLocaleString("en-US"),
      icon: <IconDeviceMobile size={19} />,
      variant: "blue" as const,
    },
  ];

  return (
    <>
      <StatsGrid items={items} />
      {/* Kept from the removed tag card: without it, a review submitted moments
          ago looks like it was dropped rather than merely not counted yet. */}
      <p className="mb-5 text-[11.5px] font-medium text-[var(--t4)]">{M.SUMMARY.CACHE_NOTE}</p>
    </>
  );
}

export default RatingsSummarySection;
