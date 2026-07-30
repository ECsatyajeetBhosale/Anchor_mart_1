import { SectionCard } from "@/components/common/SectionCard";
import { StatsGrid } from "@/components/common/StatsGrid";
import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { IconDeviceMobile, IconMessage2, IconStar, IconTruckDelivery } from "@tabler/icons-react";
import { useGetRatingsSummaryQuery } from "../api/ratingApi";
import { NEGATIVE_QUICK_TAGS } from "../types/rating.types";

const M = MESSAGES.RATINGS;

export interface RatingsSummarySectionProps {
  /** Rolling window in days as a string; `""` means all-time. */
  days: string;
}

/** Renders an average, keeping the null case distinct from a genuine 0.00. */
function formatAverage(average: number | null): string {
  return average === null ? M.SUMMARY.NOT_RATED : average.toFixed(2);
}

/** Human label for a quick tag, falling back to the raw token if it's unknown. */
function tagLabel(tag: string): string {
  return M.TAG_LABELS[tag] ?? tag;
}

/**
 * The platform headline for the ratings screen: four counters plus the
 * quick-tag breakdown. Owns its own query so the tab tables can refetch
 * independently of it (the summary is cached ~5 min server-side anyway).
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

  // Highest mention count first — the admin cares which feedback dominates.
  const tagCounts = Object.entries(data?.delivery.tag_counts ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <StatsGrid items={items} />

      <SectionCard
        icon={<IconMessage2 size={18} />}
        title={M.SUMMARY.TAGS_TITLE}
        className="mb-5"
        footer={M.SUMMARY.CACHE_NOTE}
      >
        {tagCounts.length === 0 ? (
          <p className="text-[12.5px] font-medium text-[var(--t4)]">{M.SUMMARY.TAGS_EMPTY}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagCounts.map(([tag, count]) => (
              <Badge
                key={tag}
                variant={NEGATIVE_QUICK_TAGS.has(tag) ? "warning" : "teal"}
                className="text-[11px] h-[26px]"
              >
                {tagLabel(tag)} · {count.toLocaleString("en-US")}
              </Badge>
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

export default RatingsSummarySection;
