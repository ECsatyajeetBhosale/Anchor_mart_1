import {
  actionsColumn,
  badgeColumn,
  textColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import type { Column } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { mediaSrc } from "@/lib/mediaUrl";
import { MESSAGES } from "@/lib/messages";
import { IconCategory } from "@tabler/icons-react";
import type React from "react";
import type { Category } from "../types/category.types";

const STATUS_FILTER_OPTIONS = [
  { label: MESSAGES.CATEGORIES.STATUS_FILTER.ACTIVE, value: "active" },
  { label: MESSAGES.CATEGORIES.STATUS_FILTER.INACTIVE, value: "inactive" },
];

/** Category thumbnail, falling back to a category icon when no image is set. */
function getCategoryImage(image: Category["image"]) {
  if (!image) {
    return <IconCategory size={18} />;
  }
  return (
    <img
      src={mediaSrc(image)}
      alt={MESSAGES.CATEGORIES.IMAGE_ALT}
      className="h-8 w-8 rounded object-cover"
    />
  );
}

export interface UseCategoryColumnsOptions {
  /** Current status filter value ("", "active", "inactive") for the header dropdown. */
  statusFilter: string;
  onStatusFilter: (value: string) => void;
  onEdit: (e: React.MouseEvent, category: Category) => void;
  /** Takes the whole row — the confirm dialog needs its name and product count. */
  onDelete: (e: React.MouseEvent, category: Category) => void;
  /** Activates / deactivates. Safe as a row control: it does not cascade. */
  onToggleActive: (category: Category, next: boolean) => void;
  /** False for a sub-admin — deletion is super-admin only, so the action is omitted. */
  canDelete?: boolean;
}

/**
 * Column definitions for the categories table. Kept out of the page component so
 * the page stays focused on data/state wiring and the columns stay reusable.
 */
export function useCategoryColumns({
  statusFilter,
  onStatusFilter,
  onEdit,
  onDelete,
  onToggleActive,
  canDelete = true,
}: UseCategoryColumnsOptions): Column<Category>[] {
  return [
    {
      id: "image",
      header: "",
      cell: (row) => <div className="prod-thumb">{getCategoryImage(row.image)}</div>,
      className: "w-12",
    },
    twoLineColumn({
      id: "name",
      header: MESSAGES.CATEGORIES.COLUMNS.CATEGORY,
      primary: (row) => row.name,
      secondary: (row) => row.description || "—",
    }),
    badgeColumn({
      id: "scope",
      header: MESSAGES.CATEGORIES.COLUMNS.SCOPE,
      get: (row) => row.scope || "—",
      variant: "neutral",
    }),
    textColumn({
      id: "products",
      header: MESSAGES.CATEGORIES.COLUMNS.PRODUCTS,
      get: (row) => row.product_count ?? 0,
      cellClassName: "td-p",
    }),
    {
      id: "status",
      header: MESSAGES.CATEGORIES.COLUMNS.STATUS,
      /**
       * A switch rather than a badge, matching the products table.
       *
       * Safe here in a way products' was not obviously going to be: category
       * deactivation is verified **not** to cascade, so one click cannot
       * silently mass-mutate anything. What it does do is narrower than it
       * looks — see the page's handler and C9 — so the surrounding copy says
       * "hidden from browse", never "off sale".
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
      header: MESSAGES.CATEGORIES.COLUMNS.ACTIONS,
      actions: () => ({
        edit: {
          title: MESSAGES.CATEGORIES.ACTION_EDIT,
          onClick: (e, r) => onEdit(e, r),
        },
        ...(canDelete
          ? {
              delete: {
                title: MESSAGES.CATEGORIES.ACTION_REMOVE,
                // Inline trash icon rather than the overflow menu (product
                // decision). Delete still cascades to every product in the
                // category and the category cannot be restored, so the typed
                // "delete" confirm is now the only friction — leave it in place.
                onClick: (e: React.MouseEvent, r: Category) => onDelete(e, r),
              },
            }
          : {}),
      }),
    }),
  ];
}
