import { PageHeader } from "@/components/common/PageHeader";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { IconChevronRight, IconHelpCircle, IconUsers } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import { useGetFaqTypesQuery, useGetFaqsQuery } from "../api/faqApi";
import { PlatformConfigCard } from "./PlatformConfigCard";

export function SettingsPage() {
  // Counts only — the FAQ list itself lives on its own page.
  const { data: faqData } = useGetFaqsQuery({ page: 1, limit: 1 });
  const { data: typesData } = useGetFaqTypesQuery();

  return (
    <div>
      <PageHeader title={MESSAGES.SETTINGS.TITLE} subtitle={MESSAGES.SETTINGS.SUBTITLE} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PlatformConfigCard />

        <div className="flex flex-col gap-5">
          {/* Users — provisioning lives on its own page (all five roles). */}
          <Link
            to={APP_ROUTES.SETTINGS_USERS}
            className="card group flex items-center gap-4 p-5 transition-colors hover:bg-[var(--surface-alt)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--navy-50)] text-[var(--navy-600)]">
              <IconUsers size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-extrabold text-[var(--t1)]">
                {MESSAGES.SETTINGS.USERS.CARD_TITLE}
              </p>
              <p className="text-[12.5px] font-medium text-[var(--t4)]">
                {MESSAGES.SETTINGS.USERS.CARD_SUBTITLE}
              </p>
            </div>
            <IconChevronRight
              size={20}
              className="shrink-0 text-[var(--t4)] transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {/* Help & FAQ — summary here, management on its own page. */}
          <Link
            to={APP_ROUTES.SETTINGS_FAQS}
            className="card group flex items-center gap-4 p-5 transition-colors hover:bg-[var(--surface-alt)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--teal-50)] text-[var(--teal-600)]">
              <IconHelpCircle size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14.5px] font-extrabold text-[var(--t1)]">
                {MESSAGES.SETTINGS.FAQ.CARD_TITLE}
              </p>
              <p className="text-[12.5px] font-medium text-[var(--t4)]">
                {MESSAGES.SETTINGS.FAQ.CARD_COUNTS(faqData?.count ?? 0, typesData?.count ?? 0)}
              </p>
            </div>
            <IconChevronRight
              size={20}
              className="shrink-0 text-[var(--t4)] transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
