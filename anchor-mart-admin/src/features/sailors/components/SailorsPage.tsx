import {
  IconCheck,
  IconEdit,
  IconEye,
  IconGift,
  IconMessage,
  IconPlus,
  IconShare,
  IconTrash,
  IconUser,
  IconUserCheck,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { FormField } from "@/components/common/FormField";
import { FormRow } from "@/components/common/FormRow";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TableActions } from "@/components/common/TableActions";
import { textColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { getApiMessage } from "@/lib/apiError";

import {
  useCreateSailorMutation,
  useDeleteSailorMutation,
  useGetSailorQuery,
  useGetSailorStatsQuery,
  useGetSailorsQuery,
  useToggleSailorStatusMutation,
  useUpdateSailorMutation,
} from "../api/sailorApi";
import type { SailorData } from "../types/sailor.types";
import { SailorDetailDrawer } from "./SailorDetailDrawer";

const LIMIT = 6;

const SAILOR_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "New Signups", value: "new" },
  { label: "Blocked", value: "blocked" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "New", value: "new" },
  { label: "Blocked", value: "blocked" },
];

/** Splits "First Middle Last" into first_name + last_name for the API. */
function splitFullName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] ?? "",
    last_name: parts.slice(1).join(" "),
  };
}

/**
 * Splits the single contact string into a digits-only country code + WhatsApp
 * number. Handles "+91 8790091840", "91 8790091840", and a bare "8790091840"
 * (defaults the code to "91"). The update API expects the code without a "+".
 */
function splitPhone(value: string): { country_code: string; whatsapp_number: string } {
  const trimmed = value.trim();
  const match = trimmed.match(/^\+?(\d{1,4})[\s-]+(.*)$/);
  if (match) {
    return { country_code: match[1], whatsapp_number: match[2].replace(/[\s-]/g, "") };
  }
  return { country_code: "91", whatsapp_number: trimmed.replace(/^\+/, "").replace(/[\s-]/g, "") };
}

/** A non-placeholder text value. */
const isReal = (v: string) => !!v && v !== "—";

/**
 * Merges the detail response onto the clicked row. The row is authoritative
 * (it always has every displayed field); each detail field is used only when it
 * carries a real value, so an unmapped/partial detail payload can never blank
 * out the drawer.
 */
function mergeSailorDetail(row: SailorData | null, detail?: SailorData): SailorData | null {
  if (!row) return null;
  if (!detail) return row;
  return {
    id: row.id || detail.id,
    n: isReal(detail.n) ? detail.n : row.n,
    e: isReal(detail.e) ? detail.e : row.e,
    w: isReal(detail.w) ? detail.w : row.w,
    j: isReal(detail.j) ? detail.j : row.j,
    sh: isReal(detail.sh) ? detail.sh : row.sh,
    o: detail.o || row.o,
    p: detail.p || row.p,
    ca: detail.ca || row.ca,
    wi: detail.wi || row.wi,
    st: isReal(detail.st) ? detail.st : row.st,
    sc: isReal(detail.st) ? detail.sc : row.sc,
  };
}

export function SailorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedSailor, setSelectedSailor] = useState<SailorData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSailor, setEditSailor] = useState<SailorData | null>(null);
  const [sailorToDelete, setSailorToDelete] = useState<SailorData | null>(null);

  // Form state for the add/edit drawer — one field per create/update payload key.
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formCountryCode, setFormCountryCode] = useState("91");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // URL-driven filter state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const activeTab = searchParams.get("tab") ?? "all";

  // Both the tab row and the dropdown drive the single server-side `status`
  // filter; an active tab takes precedence over the dropdown.
  const statusParam =
    activeTab !== "all" ? activeTab : statusFilter !== "all" ? statusFilter : undefined;

  // --- Queries ---
  const { data, isLoading, isFetching, isError, refetch } = useGetSailorsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    status: statusParam,
  });
  const { data: stats, isLoading: statsLoading } = useGetSailorStatsQuery();

  // Detail fetch on drawer open — enriches the instantly-shown row data.
  const { data: sailorDetail, isFetching: detailFetching } = useGetSailorQuery(
    selectedSailor?.id ?? "",
    { skip: !selectedSailor },
  );
  // The clicked row already has every field the drawer shows, so it stays
  // authoritative; the detail response only fills in fields where it has a real
  // value (guards against an unmapped detail shape blanking the drawer).
  const drawerSailor = mergeSailorDetail(selectedSailor, sailorDetail);

  const sailors = data?.sailors ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // --- Mutations ---
  const [createSailor, { isLoading: isCreating }] = useCreateSailorMutation();
  const [updateSailor, { isLoading: isUpdating }] = useUpdateSailorMutation();
  const [deleteSailor, { isLoading: isDeleting }] = useDeleteSailorMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleSailorStatusMutation();

  // Update one URL param; filter changes reset to page 1. "all"/empty clears it.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "page") next.set("page", "1");
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  const openAddModal = (sailor?: SailorData) => {
    if (sailor) {
      setEditSailor(sailor);
      // The row carries a combined name + contact, so split them back into the
      // discrete fields for editing.
      const { first_name, last_name } = splitFullName(sailor.n === "—" ? "" : sailor.n);
      const { country_code, whatsapp_number } = splitPhone(sailor.w === "—" ? "" : sailor.w);
      setFormFirstName(first_name);
      setFormLastName(last_name);
      setFormCountryCode(country_code || "91");
      setFormWhatsapp(whatsapp_number);
      setFormEmail(sailor.e === "—" ? "" : sailor.e);
      setFormIsActive(sailor.st === "Active");
    } else {
      setEditSailor(null);
      setFormFirstName("");
      setFormLastName("");
      setFormCountryCode("91");
      setFormWhatsapp("");
      setFormEmail("");
      setFormIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSaveSailor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFirstName.trim() || !formEmail.trim()) {
      toast.error("First name and email are required");
      return;
    }

    const first_name = formFirstName.trim();
    const last_name = formLastName.trim();
    const whatsapp_number = formWhatsapp.trim();
    const email = formEmail.trim();
    const code = formCountryCode.trim();

    try {
      if (editSailor) {
        await updateSailor({
          id: editSailor.id,
          // Update expects the country code without a "+".
          body: {
            first_name,
            last_name,
            country_code: code.replace(/^\+/, ""),
            whatsapp_number,
            email,
          },
        }).unwrap();

        // is_active isn't part of the profile update — push it through the
        // dedicated status endpoint when the toggle changed.
        if (formIsActive !== (editSailor.st === "Active")) {
          await toggleStatus({
            id: editSailor.id,
            body: { is_active: formIsActive },
          }).unwrap();
        }

        setIsModalOpen(false);
        toast.success("Sailor profile updated successfully");
      } else {
        const response = await createSailor({
          email,
          role: "customer",
          first_name,
          last_name,
          // create-user's doc shows the code prefixed with "+".
          country_code: code.startsWith("+") ? code : `+${code}`,
          whatsapp_number,
        }).unwrap();
        setIsModalOpen(false);
        toast.success(getApiMessage(response) ?? "New sailor registered successfully");
      }
    } catch (error) {
      // Keep the drawer open (entered data preserved) and surface the reason.
      toast.error(getApiMessage(error) ?? "Could not save the sailor. Please try again.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!sailorToDelete) return;
    try {
      await deleteSailor(sailorToDelete.id).unwrap();
      toast.success(`${sailorToDelete.n} has been deleted`);
      setSailorToDelete(null);
    } catch (error) {
      toast.error(getApiMessage(error) ?? "Could not delete this sailor. Please try again.");
    }
  };

  const showSailorProfile = (s: SailorData) => {
    setSelectedSailor(s);
  };

  const closeProfile = () => {
    setSelectedSailor(null);
  };

  const statItems = [
    {
      id: "total",
      label: "Total Sailors",
      value: statsLoading ? "—" : (stats?.total_sailors ?? 0).toLocaleString(),
      icon: <IconUsers size={20} />,
      variant: "navy" as const,
    },
    {
      id: "active",
      label: "Active This Month",
      value: statsLoading ? "—" : (stats?.active ?? 0).toLocaleString(),
      icon: <IconUserCheck size={20} />,
      variant: "green" as const,
    },
    {
      id: "loyalty",
      label: "Loyalty Pts Issued",
      value: statsLoading ? "—" : (stats?.loyalty_points_issued ?? 0).toLocaleString(),
      icon: <IconGift size={20} />,
      variant: "amber" as const,
    },
    {
      id: "referrals",
      label: "Referrals (Month)",
      value: statsLoading ? "—" : (stats?.referrals ?? 0).toLocaleString(),
      icon: <IconShare size={20} />,
      variant: "teal" as const,
    },
  ];

  const columns: Column<SailorData>[] = [
    {
      id: "sailor",
      header: "Sailor",
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="av av-navy">{s.n[0]}</div>
          <div>
            <div className="td-p">{s.n}</div>
            <div className="td-m">{s.e}</div>
          </div>
        </div>
      ),
    },
    textColumn({ id: "contact", header: "Contact", get: (s) => s.w, className: "td-m" }),
    textColumn({ id: "joined", header: "Joined", get: (s) => s.j, className: "td-m" }),
    textColumn({ id: "ship", header: "Ship", get: (s) => s.sh, className: "td-m" }),
    textColumn({ id: "orders", header: "Orders", get: (s) => s.o, className: "td-p w7" }),
    {
      id: "loyalty",
      header: "Loyalty Pts",
      cell: (s) => (
        <>
          <span className="camber w7">{s.p.toLocaleString()}</span>
          <span className="td-m"> pts</span>
        </>
      ),
    },
    textColumn({
      id: "cartwish",
      header: "Cart/Wish",
      get: (s) => `${s.ca} · ${s.wi}`,
      className: "td-m",
    }),
    {
      id: "status",
      header: "Status",
      cell: (s) => (
        <Badge variant={s.sc} className="text-[10px]">
          {s.st}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      className: "w-32 text-right",
      headerClassName: "text-right",
      cell: (s) => (
        <TableActions
          row={s}
          actions={[
            {
              icon: <IconEye size={16} />,
              title: "View",
              onClick: (e) => {
                e.stopPropagation();
                showSailorProfile(s);
              },
            },
            {
              icon: <IconEdit size={16} />,
              title: "Edit",
              onClick: (e) => {
                e.stopPropagation();
                openAddModal(s);
              },
            },
            {
              icon: <IconMessage size={16} />,
              title: "Message",
              onClick: (e) => {
                e.stopPropagation();
                toast.success(`Opening WhatsApp chat to ${s.w}`);
              },
            },
            {
              icon: <IconTrash size={16} />,
              title: "Delete",
              variant: "danger",
              onClick: (e) => {
                e.stopPropagation();
                setSailorToDelete(s);
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sailors Management"
        subtitle={
          <p className="pg-sub">
            <span>2,847 registered</span>
            <span className="sep">·</span>
            <span>1,204 active this month</span>
          </p>
        }
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder="Search sailors..."
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "status",
                value: statusFilter,
                placeholder: "All Status",
                options: STATUS_OPTIONS,
                width: "150px",
                onValueChange: (val) => setParam("status", val),
              },
            ]}
          >
            <button type="button" className="btn btn-primary" onClick={() => openAddModal()}>
              <IconPlus size={16} />
              Add Sailor
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      <DynamicTabs
        tabs={SAILOR_TABS}
        value={activeTab}
        onTabChange={(val) => setParam("tab", val)}
      />

      <DataTable
        columns={columns}
        data={sailors}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? "Failed to load sailors." : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage="No sailors match the current filters."
        onRowClick={showSailorProfile}
      />

      <SailorDetailDrawer
        isOpen={!!selectedSailor}
        sailor={drawerSailor}
        isLoading={detailFetching}
        onClose={closeProfile}
        onEdit={(s) => {
          closeProfile();
          openAddModal(s);
        }}
      />

      <Sheet open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <SheetContent
          side="right"
          adjustable
          defaultWidth={560}
          className="flex flex-col gap-0 p-0 sm:max-w-none overflow-hidden bg-[var(--surface)]"
        >
          <SheetHeader className="p-6 pb-4 border-b border-[var(--border-md)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
                <IconUser size={22} />
              </div>
              <div>
                <SheetTitle className="text-xl">
                  {editSailor ? "Edit Sailor" : "Add New Sailor"}
                </SheetTitle>
                <SheetDescription>
                  {editSailor
                    ? "Update sailor account details"
                    : "Register a new sailor to the platform"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSaveSailor} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <FormRow>
                <FormField label="First Name">
                  <Input
                    placeholder="e.g. Abhishek"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                  />
                </FormField>
                <FormField label="Last Name">
                  <Input
                    placeholder="e.g. Nadurbar"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Country Code">
                  <Input
                    placeholder="91"
                    value={formCountryCode}
                    onChange={(e) => setFormCountryCode(e.target.value)}
                  />
                </FormField>
                <FormField label="WhatsApp Number">
                  <Input
                    placeholder="8790091840"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                  />
                </FormField>
              </FormRow>

              <FormRow columns={1}>
                <FormField label="Email Address">
                  <Input
                    type="email"
                    placeholder="sailor@email.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </FormField>
              </FormRow>

              <FormRow columns={1}>
                <FormField label="Account Status">
                  <div className="flex items-center gap-2 h-[38px]">
                    <Switch
                      id="sailor-active"
                      checked={formIsActive}
                      onCheckedChange={setFormIsActive}
                    />
                    <label
                      htmlFor="sailor-active"
                      className="text-[13px] font-semibold text-[var(--t2)]"
                    >
                      {formIsActive ? "Active" : "Inactive"}
                    </label>
                  </div>
                </FormField>
              </FormRow>
            </div>

            <SheetFooter className="p-6 border-t border-[var(--border-md)] bg-[var(--surface)]">
              <div className="flex justify-end gap-3 w-full">
                <button
                  type="button"
                  className="btn btn-ghost btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating || isUpdating || isToggling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating || isUpdating || isToggling}
                >
                  <IconCheck size={16} />
                  {editSailor
                    ? isUpdating || isToggling
                      ? "Saving…"
                      : "Save Changes"
                    : isCreating
                      ? "Adding…"
                      : "Add Sailor"}
                </button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        isOpen={!!sailorToDelete}
        onClose={() => setSailorToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Sailor"
        description={
          sailorToDelete
            ? `Delete ${sailorToDelete.n}? This permanently removes the sailor and cannot be undone.`
            : ""
        }
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </>
  );
}
