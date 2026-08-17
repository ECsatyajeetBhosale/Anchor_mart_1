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
    <img src={image} alt={MESSAGES.CATEGORIES.IMAGE_ALT} className="h-8 w-8 rounded object-cover" />
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
  /**
   * Every live category id, or `null` when the complete set isn't known.
   *
   * Used only to mark a parent that no longer exists. `null` disables the
   * marking entirely rather than guessing — see the Parent column.
   */
  liveCategoryIds?: Set<string> | null;
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
  liveCategoryIds = null,
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
    {
      id: "parent",
      header: MESSAGES.CATEGORIES.COLUMNS.PARENT,
      /**
       * The parent's name, flagged when the parent no longer exists.
       *
       * Deleting a parent leaves its children untouched — live, listed, and
       * still pointing at it — while `parent_name` goes on rendering the deleted
       * category's name. Nothing about the row looks wrong, which is exactly the
       * problem: the tree is broken and the table says it is fine.
       *
       * Only claimed when the complete live set is known (`liveCategoryIds`);
       * otherwise the name is shown plain, because "not in the set I happen to
       * hold" is not evidence of deletion.
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
                {MESSAGES.CATEGORIES.PARENT_DELETED}
              </Badge>
            )}
          </div>
        );
      },
    },
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
                // Behind the overflow menu, as on products: it cascades to every
                // product in the category and the category itself cannot be
                // restored. The Active switch is the everyday action.
                overflow: true,
                onClick: (e: React.MouseEvent, r: Category) => onDelete(e, r),
              },
            }
          : {}),
      }),
    }),
  ];
}
