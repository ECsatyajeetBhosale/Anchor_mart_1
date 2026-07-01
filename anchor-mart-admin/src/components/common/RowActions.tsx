import { IconEdit, IconEye, IconMessage, IconTrash, IconUserOff, IconX } from "@tabler/icons-react";
import type * as React from "react";
import { type ActionItem, TableActions } from "./TableActions";

/**
 * Every row action the app supports lives here. Add new ones to the catalog so
 * all tables share one set of icons/variants. A page renders only the actions it
 * passes in `actions` — the rest are omitted.
 */
export type RowActionKey = "view" | "edit" | "message" | "cancel" | "deactivate" | "delete";

interface CatalogEntry {
  icon: React.ReactNode;
  title: string;
  variant?: ActionItem<unknown>["variant"];
}

/** Icon + default title + variant for each supported action. */
const ACTION_CATALOG: Record<RowActionKey, CatalogEntry> = {
  view: { icon: <IconEye size={16} />, title: "View" },
  edit: { icon: <IconEdit size={16} />, title: "Edit" },
  message: { icon: <IconMessage size={16} />, title: "Message" },
  cancel: { icon: <IconX size={16} />, title: "Cancel", variant: "danger" },
  deactivate: { icon: <IconUserOff size={16} />, title: "Deactivate", variant: "danger" },
  delete: { icon: <IconTrash size={16} />, title: "Delete", variant: "danger" },
};

/** Canonical left-to-right render order, independent of prop key order. */
const ACTION_ORDER: RowActionKey[] = ["view", "edit", "message", "cancel", "deactivate", "delete"];

/** Per-page config for one action: a bare handler, or a handler + title override. */
export type RowActionConfig<T> =
  | ((e: React.MouseEvent, row: T) => void)
  | { onClick: (e: React.MouseEvent, row: T) => void; title?: string };

export interface RowActionsProps<T> {
  row: T;
  /** Only the actions present here are rendered (in canonical order). */
  actions: Partial<Record<RowActionKey, RowActionConfig<T>>>;
}

export function RowActions<T>({ row, actions }: RowActionsProps<T>) {
  const items: ActionItem<T>[] = ACTION_ORDER.filter((key) => actions[key]).map((key) => {
    const cfg = actions[key] as RowActionConfig<T>;
    const isFn = typeof cfg === "function";
    return {
      icon: ACTION_CATALOG[key].icon,
      title: (isFn ? undefined : cfg.title) ?? ACTION_CATALOG[key].title,
      variant: ACTION_CATALOG[key].variant,
      onClick: isFn ? cfg : cfg.onClick,
    };
  });

  return <TableActions row={row} actions={items} />;
}

export default RowActions;
