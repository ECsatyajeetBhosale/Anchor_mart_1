import {
  actionsColumn,
  badgeColumn,
  textColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { MESSAGES } from "@/lib/messages";
import { IconCategory } from "@tabler/icons-react";
import type React from "react";
import type { EmergencyCategory } from "../types/emergencyCategory.types";

const STATUS_FILTER_OPTIONS = [
  { label: MESSAGES.EMERGENCY_CATEGORIES.STATUS_FILTER.ACTIVE, value: "active" },
  { label: MESSAGES.EMERGENCY_CATEGORIES.STATUS_FILTER.INACTIVE, value: "inactive" },
];

/** Category thumbnail, falling back to a category icon when no image is set. */
function getCategoryImage(image: EmergencyCategory["image"]) {
  if (!image) {
    return <IconCategory size={18} />;
  }
  return (
    <img
      src={image}
      alt={MESSAGES.EMERGENCY_CATEGORIES.IMAGE_ALT}
      className="h-8 w-8 rounded object-cover"
    />
  );
}

export interface UseEmergencyCategoryColumnsOptions {
  /** Current status filter value ("", "active", "inactive") for the header dropdown. */
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  onEdit: (e: React.MouseEvent, category: EmergencyCategory) => void;
  /** Takes the whole row — the confirm dialog needs its name and spare count. */
  onDelete: (e: React.MouseEvent, category: EmergencyCategory) => void;
  /** Activates / deactivates. Safe as a row control: it does not cascade. */
  onToggleActive: (category: EmergencyCategory, next: boolean) => void;
  /**
   * Every live category id, or `null` when the complete set isn't known — `null`
   * disables the deleted-parent marking rather than guessing.
   */
  liveCategoryIds?: Set<string> | null;
  /** False for a sub-admin — deletion is super-admin only, so the action is omitted. */
  canDelete?: boolean;
}

/**
 * Column definitions for the emergency categories table. Mirrors the regular
 * categories table so both pages present data identically.
 */
export function useEmergencyCategoryColumns({
  statusFilter,
  onStatusFilter,
  onEdit,
  onDelete,
  onToggleActive,
  liveCategoryIds = null,
  canDelete = true,
}: UseEmergencyCategoryColumnsOptions): Column<EmergencyCategory>[] {
  return [
    {
      id: "image",
      header: "",
      cell: (row) => <div className="prod-thumb">{getCategoryImage(row.image)}</div>,
      className: "w-12",
    },
    twoLineColumn({
      id: "name",
      header: MESSAGES.EMERGENCY_CATEGORIES.COLUMNS.CATEGORY,
      primary: (row) => row.name,
      secondary: (row) => row.description || "—",
    }),
    badgeColumn({
      id: "scope",
      header: MESSAGES.EMERGENCY_CATEGORIES.COLUMNS.SCOPE,
      get: (row) => row.scope || "—",
      variant: "neutral",
    }),
    {
      id: "parent",
      header: MESSAGES.EMERGENCY_CATEGORIES.COLUMNS.PARENT,
      /**
       * The parent's name, flagged when the parent no longer exists.
       *
       * Deleting a parent leaves its children live, listed, and still pointing
       * at it, while `parent_name` keeps rendering the deleted category's name —
       * so the row looks healthy and the tree is broken. Only claimed when the
       * complete live set is known; otherwise the name is shown plain.
       */
      cell: (row) => {
        if (!row.parent_name) return <span className="td-m">—</span>;
        const isMissing = !!liveCategoryIds && !!row.parent && !liveCategoryIds.has(row.parent);
        return (
          <div className="max-w-[160px]">
            <div className="td-m trunc" title={row.parent_name}>
              {row.parent_name}
            </div>
            {isMissing && (
              <Badge variant="warning" className="mt-1 h-[20px] px-1.5 text-[9px]">
                {MESSAGES.EMERGENCY_CATEGORIES.PARENT_DELETED}
              </Badge>
            )}
          </div>
        );
      },
    },
    textColumn({
      id: "products",
      header: MESSAGES.EMERGENCY_CATEGORIES.COLUMNS.PRODUCTS,
      get: (row) => row.product_count ?? 0,
      cellClassName: "td-p",
    }),
    {
      id: "status",
      header: MESSAGES.EMERGENCY_CATEGORIES.COLUMNS.STATUS,
      /**
       * A switch rather than a badge, matching the products and general
       * categories tables. Safe as a one-click control because category
       * deactivation is verified not to cascade — though what it does is
       * narrower than it looks, so the copy says "hidden from browse". See C9.
       */
      cell: (row) => (
        <Switch
          checked={row.is_active !== false}
          onCheckedChange={(next) => onToggleActive(row, next)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      // Server-side status filter via the clickable header (?is_active=True|False).
      filter: {
        value: statusFilter,
        options: STATUS_FILTER_OPTIONS,
        onChange: onStatusFilter,
      },
    },
    actionsColumn({
      header: MESSAGES.EMERGENCY_CATEGORIES.COLUMNS.ACTIONS,
      actions: () => ({
        edit: {
          title: MESSAGES.EMERGENCY_CATEGORIES.ACTION_EDIT,
          onClick: (e, r) => onEdit(e, r),
        },
        ...(canDelete
          ? {
              delete: {
                title: MESSAGES.EMERGENCY_CATEGORIES.ACTION_REMOVE,
                // Behind the overflow menu: it cascades to every spare in the
                // category and the category itself cannot be restored.
                overflow: true,
                onClick: (e: React.MouseEvent, r: EmergencyCategory) => onDelete(e, r),
              },
            }
          : {}),
      }),
    }),
  ];
}
