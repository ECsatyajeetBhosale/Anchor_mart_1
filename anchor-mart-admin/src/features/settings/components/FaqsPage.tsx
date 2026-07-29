import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { Pagination } from "@/components/ui/pagination";
import { getApiMessage } from "@/lib/apiError";
import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import {
  IconArrowLeft,
  IconCategory,
  IconHelpCircle,
  IconMoodEmpty,
  IconPlus,
} from "@tabler/icons-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDeleteFaqMutation, useGetFaqTypesQuery, useGetFaqsQuery } from "../api/faqApi";
import type { Faq } from "../types/settings.types";
import { FaqAccordionItem } from "./FaqAccordionItem";
import { FaqFormModal } from "./FaqFormModal";
import { FaqTypesCard } from "./FaqTypesCard";

const PAGE_SIZE = 10;

/**
 * Help & FAQ management.
 *
 * Presented as a disclosure list rather than a table: a FAQ's answer is long
 * prose, which a table cell can only truncate into uselessness. Grouping by
 * category mirrors how the help centre reads on the customer side.
 */
export function FaqsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") ?? "";
  const faqType = searchParams.get("faq_type") ?? "";

  const [openId, setOpenId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useGetFaqsQuery({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    faqType: faqType || undefined,
  });
  const { data: typesData } = useGetFaqTypesQuery();
  const [deleteFaq, { isLoading: isDeleting }] = useDeleteFaqMutation();

  const faqs = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const types = typesData?.results ?? [];

  /** Group the current page by category so the list reads like the help centre. */
  const grouped = faqs.reduce<Record<string, Faq[]>>((acc, faq) => {
    const key = faq.faq_type || "Uncategorised";
    if (!acc[key]) acc[key] = [];
    acc[key].push(faq);
    return acc;
  }, {});
  const groupNames = Object.keys(grouped).sort();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setSearchParams(next);
  };

  const handlePageChange = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
    setOpenId(null);
  };

  const handleDelete = async () => {
    if (pendingDelete === null) return;
    try {
      await deleteFaq(pendingDelete).unwrap();
      setPendingDelete(null);
      toast.success(MESSAGES.SETTINGS.FAQ.TOAST.DELETE_SUCCESS);
    } catch (error) {
      setPendingDelete(null);
      toast.error(getApiMessage(error) ?? MESSAGES.SETTINGS.FAQ.TOAST.DELETE_ERROR);
    }
  };

  const statItems = [
    {
      id: "total-faqs",
      label: MESSAGES.SETTINGS.FAQ.STATS.TOTAL,
      value: total,
      icon: <IconHelpCircle size={19} />,
      variant: "navy" as const,
    },
    {
      id: "total-categories",
      label: MESSAGES.SETTINGS.FAQ.STATS.CATEGORIES,
      value: types.length,
      icon: <IconCategory size={19} />,
      variant: "teal" as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title={MESSAGES.SETTINGS.FAQ.PAGE_TITLE}
        subtitle={MESSAGES.SETTINGS.FAQ.PAGE_SUBTITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(value) => setParam("search", value)}
            searchPlaceholder={MESSAGES.SETTINGS.FAQ.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "faq_type",
                value: faqType,
                onValueChange: (value) => setParam("faq_type", value),
                placeholder: MESSAGES.SETTINGS.FAQ.ALL_CATEGORIES,
                options: types.map((t) => ({ value: t.name, label: t.name })),
              },
            ]}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingFaq(null);
                setIsFormOpen(true);
              }}
            >
              <IconPlus size={16} />
              {MESSAGES.SETTINGS.FAQ.ADD_BUTTON}
            </button>
          </SearchFilters>
        }
      />

      <Link
        to={APP_ROUTES.SETTINGS}
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--teal-600)] hover:text-[var(--teal-700)]"
      >
        <IconArrowLeft size={15} />
        {MESSAGES.SETTINGS.FAQ.BACK_TO_SETTINGS}
      </Link>

      <StatsGrid items={statItems} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="card p-5">
          {isLoading && (
            <p className="py-10 text-center text-[13px] text-[var(--t4)]">
              {MESSAGES.COMMON.LOADING}
            </p>
          )}

          {isError && (
            <div className="py-10 text-center">
              <p className="mb-3 text-[13px] text-[var(--danger-text)]">
                {MESSAGES.SETTINGS.FAQ.FETCH_ERROR}
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={refetch}>
                {MESSAGES.COMMON.RETRY}
              </button>
            </div>
          )}

          {!isLoading && !isError && faqs.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <IconMoodEmpty size={30} className="text-[var(--t5)]" />
              <p className="text-[13px] font-semibold text-[var(--t4)]">
                {MESSAGES.SETTINGS.FAQ.EMPTY}
              </p>
            </div>
          )}

          {!isLoading &&
            !isError &&
            groupNames.map((groupName) => (
              <section key={groupName} className="mb-5 last:mb-0">
                <div className="sec-label">{groupName}</div>
                <div className="flex flex-col gap-2">
                  {grouped[groupName].map((faq) => (
                    <FaqAccordionItem
                      key={faq.id}
                      faq={faq}
                      isOpen={openId === faq.id}
                      onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
                      onEdit={() => {
                        setEditingFaq(faq);
                        setIsFormOpen(true);
                      }}
                      onDelete={() => setPendingDelete(faq.id)}
                    />
                  ))}
                </div>
              </section>
            ))}

          {!isLoading && !isError && totalPages > 1 && (
            <div className="mt-5 flex justify-end border-t border-[var(--border-xs)] pt-4">
              <Pagination
                page={page}
                pages={totalPages}
                total={total}
                limit={PAGE_SIZE}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

        <FaqTypesCard />
      </div>

      <FaqFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} faq={editingFaq} />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title={MESSAGES.SETTINGS.FAQ.CONFIRM.TITLE}
        description={MESSAGES.SETTINGS.FAQ.CONFIRM.DESCRIPTION}
        confirmText={MESSAGES.COMMON.DELETE}
        isLoading={isDeleting}
      />
    </div>
  );
}
