import { IconShieldLock } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { RowActions } from "@/components/common/RowActions";
import { SearchFilters } from "@/components/common/SearchFilters";
import { avatarColumn, badgeColumn, textColumn } from "@/components/common/tableColumns";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { clearParams } from "@/lib/utils";
import { useGetAdminUsersQuery } from "../api/adminUserApi";
import { ADMIN_TIER_ROLES, type AdminUser } from "../types/adminUser.types";
import { AdminUserDetailDrawer } from "./AdminUserDetailDrawer";

const A = MESSAGES.ACCOUNT_MANAGEMENT;
const M = A.ADMIN_USERS;

const LIMIT = 10;

const ROLE_OPTIONS = [
  { value: "all", label: M.ALL_ROLES },
  ...ADMIN_TIER_ROLES.map((role) => ({ value: role, label: A.ROLE_LABELS[role] ?? role })),
];

const STATUS_OPTIONS = [
  { value: "all", label: M.ALL_STATUS },
  { value: "true", label: M.STATUS_FILTER.ACTIVE },
  { value: "false", label: M.STATUS_FILTER.INACTIVE },
];

/**
 * Admin-tier user administration.
 *
 * Flow 31 states admins "cannot be listed or removed at all" and the
 * provisioning tab said so on screen. That is no longer true — the API grew a
 * full CRUD — so this tab is the list that notice promised did not exist.
 *
 * **Scoped to the two admin tiers.** The endpoint is `/admin/users/`, so it is
 * already admin-scoped; the role filter narrows *within* that (admin vs super
 * admin) rather than selecting it. Sailors, sellers and partners have their own
 * screens — a second table pointed at them would give two places to edit one
 * account.
 *
 * **Super-admin only**, matching the tier gate on creation (SEC-1): an operator
 * who cannot create an admin has no business editing or deleting one.
 *
 * The page drops this tab entirely below that tier, so the guard below is a
 * backstop, not the gate — it holds if the component is ever mounted from
 * somewhere that forgets to check. Neither is a security control: the server
 * remains the authority, and a hidden tab is not an access control.
 */
export function AdminUsersTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { isSuperAdmin } = useAdminAccess();

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";

  // Both filters are validated server-side, so anything off the accepted list
  // reads as "all" rather than being forwarded into a 400.
  const roleRaw = searchParams.get("role") ?? "all";
  const roleFilter = ROLE_OPTIONS.some((o) => o.value === roleRaw) ? roleRaw : "all";
  const statusRaw = searchParams.get("active") ?? "all";
  const statusFilter = statusRaw === "true" || statusRaw === "false" ? statusRaw : "all";

  const { data, isLoading, isFetching, isError, refetch } = useGetAdminUsersQuery(
    {
      page,
      limit: LIMIT,
      search,
      // Omitted for "all". The endpoint is `/admin/users/` and its `role` filter
      // takes a single `User.Role` value, so the filter narrows *within* the
      // admin tiers rather than selecting them — sending a comma list would be
      // an invented syntax and a likely 400.
      role: roleFilter !== "all" ? roleFilter : undefined,
      isActive: statusFilter !== "all" ? (statusFilter as "true" | "false") : undefined,
    },
    { skip: !isSuperAdmin },
  );

  const users = data?.users ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const openDetail = (row: AdminUser) => {
    setSelected(row);
    setIsDetailOpen(true);
  };

  // Update one URL param; filter/search changes reset to page 1.
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

  if (!isSuperAdmin) {
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-3.5">
        <IconShieldLock size={18} className="mt-0.5 shrink-0 text-[var(--warning-icon)]" />
        <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--warning-text)]">
          {M.SUPER_ADMIN_ONLY}
        </p>
      </div>
    );
  }

  const columns: Column<AdminUser>[] = [
    avatarColumn({
      id: "user",
      header: M.COLUMNS.USER,
      name: (r) => r.name,
      image: (r) => getFallbackAvatar(r.name),
    }),
    textColumn({ id: "email", header: M.COLUMNS.EMAIL, get: (r) => r.email, className: "td-m" }),
    badgeColumn({
      id: "tier",
      header: M.COLUMNS.TIER,
      get: (r) => r.roleLabel,
      // Super admin is the unrestricted tier — worth reading differently at a
      // glance from an ordinary operator.
      variant: (r) => (r.role === "super_admin" ? "danger" : "info"),
    }),
    textColumn({
      id: "contact",
      header: M.COLUMNS.CONTACT,
      get: (r) => r.contact,
      className: "td-m",
    }),
    textColumn({ id: "joined", header: M.COLUMNS.JOINED, get: (r) => r.joined, className: "td-m" }),
    badgeColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.statusLabel,
      variant: (r) => r.statusVariant,
    }),
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-16 text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <RowActions
          row={r}
          actions={{
            view: (e) => {
              e.stopPropagation();
              openDetail(r);
            },
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <SearchFilters
          searchValue={search}
          onSearchChange={(val) => setParam("search", val)}
          searchPlaceholder={M.SEARCH_PLACEHOLDER}
          searchDebounceMs={300}
          searchLoading={isFetching}
          filters={[
            {
              id: "role",
              value: roleFilter,
              placeholder: M.ALL_ROLES,
              options: ROLE_OPTIONS,
              width: "150px",
              onValueChange: (val) => setParam("role", val),
              emptyValue: "all",
            },
            {
              id: "active",
              value: statusFilter,
              placeholder: M.ALL_STATUS,
              options: STATUS_OPTIONS,
              width: "150px",
              onValueChange: (val) => setParam("active", val),
              emptyValue: "all",
            },
          ]}
          onReset={() =>
            setSearchParams(clearParams(searchParams, ["search", "role", "active", "page"]))
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={users}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.EMPTY}
        hasActiveFilters={!!search || roleFilter !== "all" || statusFilter !== "all"}
        onResetFilters={() => setSearchParams(new URLSearchParams())}
        onRowClick={openDetail}
      />

      <AdminUserDetailDrawer
        user={selected}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}

export default AdminUsersTab;
