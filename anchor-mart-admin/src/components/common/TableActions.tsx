import { cn } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { IconDots } from "@tabler/icons-react";
import type * as React from "react";

export interface ActionItem<T> {
  icon: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent, row: T) => void;
  variant?: "ghost" | "danger" | "primary" | "secondary";
  /**
   * Move this action off the row and into the overflow menu.
   *
   * For actions that are destructive and rarely the intent — deleting a product
   * when "stop selling it" is what was actually wanted. A one-click icon sitting
   * beside the everyday ones invites the misclick; a menu costs a deliberate
   * second click. Opt-in per call site, so tables that don't set it render
   * exactly as before.
   */
  overflow?: boolean;
}

export interface TableActionsProps<T> {
  row: T;
  actions: ActionItem<T>[];
}

export function TableActions<T>({ row, actions }: TableActionsProps<T>) {
  const inline = actions.filter((act) => !act.overflow);
  const overflow = actions.filter((act) => act.overflow);

  return (
    <div className="td-acts flex items-center gap-1 justify-end">
      {inline.map((act, index) => {
        const btnClass = act.variant === "danger" ? "btn-danger" : "btn-ghost";
        return (
          <button
            key={`${act.title}-${index}`}
            type="button"
            className={`btn ${btnClass} btn-sm btn-icon`}
            title={act.title}
            onClick={(e) => act.onClick(e, row)}
          >
            {act.icon}
          </button>
        );
      })}

      {overflow.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              title="More actions"
              // The row opens a drawer on click; the trigger must not.
              onClick={(e) => e.stopPropagation()}
            >
              <IconDots size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              /**
               * The menu is portalled out of the row in the **DOM**, but React
               * replays events through the **component** tree — so a click in
               * here still bubbles to the `<tr>` and fires `onRowClick`. Every
               * action behind this menu is destructive, and the row opens an
               * edit drawer, so without this the confirm dialog and the drawer
               * both open on one click.
               *
               * Stopping at the content boundary covers every item at once. The
               * items' own handlers have already run by the time it fires.
               */
              onClick={(e) => e.stopPropagation()}
              className="z-50 min-w-[170px] rounded-md border p-1 shadow-md"
              style={{ background: "var(--surface)", borderColor: "var(--border-md)" }}
            >
              {overflow.map((act, index) => (
                <DropdownMenu.Item
                  key={`${act.title}-${index}`}
                  onSelect={(e) => {
                    /**
                     * Radix's `onSelect` carries a CustomEvent, not a mouse
                     * event. The row handlers type their first argument as one
                     * and call `stopPropagation()` on it — harmless here (it is
                     * still a DOM Event) but not what stops the row click; the
                     * content's `onClick` above does that.
                     *
                     * Deliberately **not** `preventDefault()` — on `onSelect`
                     * that is Radix's "keep the menu open" flag, not a
                     * propagation guard. Selecting should close the menu.
                     */
                    act.onClick(e as unknown as React.MouseEvent, row);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded px-2 py-1.5 text-[13px] font-medium outline-none cursor-pointer",
                    "data-[highlighted]:bg-[var(--surface-hover)]",
                  )}
                  style={{ color: act.variant === "danger" ? "var(--danger-text)" : "var(--t3)" }}
                >
                  {act.icon}
                  {act.title}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}

export default TableActions;
