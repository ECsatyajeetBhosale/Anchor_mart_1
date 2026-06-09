import type * as React from "react";

export interface ActionItem<T> {
  icon: React.ReactNode;
  title: string;
  onClick: (e: React.MouseEvent, row: T) => void;
  variant?: "ghost" | "danger" | "primary" | "secondary";
}

export interface TableActionsProps<T> {
  row: T;
  actions: ActionItem<T>[];
}

export function TableActions<T>({ row, actions }: TableActionsProps<T>) {
  return (
    <div className="td-acts flex items-center gap-1 justify-end">
      {actions.map((act, index) => {
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
    </div>
  );
}

export default TableActions;
