import { SectionCard } from "@/components/common/SectionCard";
import { Badge } from "@/components/ui/badge";
import { MESSAGES } from "@/lib/messages";
import { IconBellRinging, IconUsersGroup } from "@tabler/icons-react";
import { useGetRecipientSummaryQuery } from "../api/notificationApi";
import { NOTIFICATION_TYPE_TRAITS, type NotificationType } from "../types/notification.types";

const M = MESSAGES.NOTIFICATIONS;

export interface RecipientReachCardProps {
  type: NotificationType;
  /** When set, that role's bucket is highlighted as the one being addressed. */
  highlightRole?: string;
}

function roleLabel(role: string): string {
  return M.ROLE_LABELS[role] ?? role;
}

/**
 * Pre-send audience preview: how many users each role holds for the chosen
 * notification type, plus the two delivery facts that decide whether a message
 * will actually be seen (does it push, and is it muteable as marketing).
 */
export function RecipientReachCard({ type, highlightRole }: RecipientReachCardProps) {
  const { data, isLoading, isError } = useGetRecipientSummaryQuery({ type });
  const traits = NOTIFICATION_TYPE_TRAITS[type];

  return (
    <SectionCard icon={<IconUsersGroup size={18} />} title={M.REACH.TITLE} footer={M.REACH.CAVEAT}>
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={traits.pushes ? "teal" : "neutral"} className="text-[10px] h-[24px]">
          <IconBellRinging size={12} />
          {traits.pushes ? M.TRAITS.PUSH_ON : M.TRAITS.PUSH_OFF}
        </Badge>
        <Badge variant={traits.promotional ? "amber" : "info"} className="text-[10px] h-[24px]">
          {traits.promotional ? M.TRAITS.PROMOTIONAL : M.TRAITS.TRANSACTIONAL}
        </Badge>
      </div>

      {isError ? (
        <p className="text-[12.5px] font-semibold text-[var(--danger-text)]">{M.REACH.ERROR}</p>
      ) : isLoading ? (
        <p className="text-[12.5px] font-medium text-[var(--t4)]">{MESSAGES.COMMON.LOADING}</p>
      ) : !data || data.buckets.length === 0 ? (
        <p className="text-[12.5px] font-medium text-[var(--t4)]">{M.REACH.EMPTY}</p>
      ) : (
        <>
          <div className="text-[22px] font-extrabold text-[var(--teal-600)] mb-3">
            {M.REACH.TOTAL(data.total)}
          </div>
          <div className="flex flex-col gap-1.5">
            {data.buckets.map((bucket) => {
              const isTarget = bucket.role === highlightRole;
              return (
                <div
                  key={bucket.role}
                  className={`flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-[13px] ${
                    isTarget
                      ? "bg-[var(--teal-50)] border border-[var(--teal-100)]"
                      : "border border-transparent"
                  }`}
                >
                  <span
                    className={
                      isTarget
                        ? "font-extrabold text-[var(--teal-700)]"
                        : "font-semibold text-[var(--t3)]"
                    }
                  >
                    {roleLabel(bucket.role)}
                  </span>
                  <span className="font-extrabold text-[var(--t1)]">
                    {bucket.count.toLocaleString("en-US")}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </SectionCard>
  );
}

export default RecipientReachCard;
