import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { Column, ColumnFilter } from "@/components/ui/data-table";
import type { ReactNode } from "react";
import type * as React from "react";
import { RowActions, type RowActionsProps } from "./RowActions";
import { StatusBadge } from "./StatusBadge";

/**
 * Reusable `Column<T>` factories so list pages (Products, Orders, …) describe
 * their tables declaratively instead of repeating cell-render JSX. Each factory
 * returns a `Column<T>` that drops straight into a `DataTable` `columns` array.
 * Add new shared cell shapes here so every table stays consistent.
 */

interface BaseColumn {
  id: string;
  header: string;
  className?: string;
  headerClassName?: string;
}

/** Class string that may be derived per-row. */
type ClassName<T> = string | ((row: T) => string);

function resolveClass<T>(cls: ClassName<T> | undefined, row: T): string | undefined {
  return typeof cls === "function" ? cls(row) : cls;
}

/** Monospace id / code cell (order #, SKU, UUID). */
export function idColumn<T>(opts: BaseColumn & { get: (row: T) => React.ReactNode }): Column<T> {
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    className: opts.className ?? "td-id",
    cell: opts.get,
  };
}

/** Plain text cell. `cellClassName` may be static or per-row (e.g. status colours). */
export function textColumn<T>(
  opts: BaseColumn & {
    get: (row: T) => React.ReactNode;
    cellClassName?: ClassName<T>;
  },
): Column<T> {
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    className: opts.className,
    cell: opts.cellClassName
      ? (row) => <span className={resolveClass(opts.cellClassName, row)}>{opts.get(row)}</span>
      : opts.get,
  };
}

/** Single-line cell that truncates with an ellipsis + native title tooltip. */
export function truncatedColumn<T>(opts: BaseColumn & { get: (row: T) => string }): Column<T> {
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    // Default width matches the design (170px). Pass a literal `max-w-[…]`
    // class to override — keep it literal so Tailwind can see it.
    className: opts.className ?? "max-w-[170px]",
    cell: (row) => {
      const text = opts.get(row);
      return (
        <span
          className="trunc block max-w-full text-[12.5px] font-medium text-[var(--t3)]"
          title={text}
        >
          {text}
        </span>
      );
    },
  };
}

/** Two-line cell: bold primary value over a muted secondary line. */
export function twoLineColumn<T>(
  opts: BaseColumn & {
    primary: (row: T) => string;
    secondary: (row: T) => string;
  },
): Column<T> {
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    className: opts.className,
    cell: (row) => (
      <div className="max-w-[180px]">
        <div className="td-p trunc" title={opts.primary(row)}>
          {opts.primary(row)}
        </div>
        <div className="td-m trunc" title={opts.secondary(row)}>
          {opts.secondary(row)}
        </div>
      </div>
    ),
  };
}

type AvatarVariant = "navy" | "teal" | "amber";

/** Avatar (image when `image` is given, else first initial) + primary name text. */
export function avatarColumn<T>(
  opts: BaseColumn & {
    name: (row: T) => string;
    initial?: (row: T) => string;
    /** When provided, renders this image URL instead of an initial. */
    image?: (row: T) => string;
    /**
     * Rendered when `image` comes back empty. Rows that aren't people — a spare
     * part, a product — should pass a neutral glyph here: falling through to
     * the initial block or a generated person avatar labels a component with a
     * human face, which reads as a user record.
     */
    placeholder?: ReactNode;
    variant?: AvatarVariant;
  },
): Column<T> {
  const variant = opts.variant ?? "navy";
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    className: opts.className,
    cell: (row) => {
      const label = opts.name(row);
      const src = opts.image?.(row);
      return (
        <div className="flex items-center gap-2">
          {src ? (
            <div className="av av-sm av-img">
              <img src={src} alt={label} loading="lazy" />
            </div>
          ) : opts.placeholder ? (
            <div className="av av-sm av-img flex items-center justify-center bg-[var(--surface-alt)] text-[var(--t4)]">
              {opts.placeholder}
            </div>
          ) : (
            <div className={`av av-sm av-${variant}`}>
              {opts.initial ? opts.initial(row) : label.charAt(0)}
            </div>
          )}
          <span className="td-p">{label}</span>
        </div>
      );
    },
  };
}

/** Currency cell formatted to 2 decimals (e.g. `$12.00`). */
export function currencyColumn<T>(
  opts: BaseColumn & { get: (row: T) => number | string; currency?: string },
): Column<T> {
  const currency = opts.currency ?? "$";
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    className: opts.className ?? "td-p w7",
    cell: (row) => `${currency}${Number(opts.get(row)).toFixed(2)}`,
  };
}

/** Generic pill. `variant` may be static or derived per-row. */
export function badgeColumn<T>(
  opts: BaseColumn & {
    get: (row: T) => React.ReactNode;
    variant?: BadgeProps["variant"] | ((row: T) => BadgeProps["variant"]);
    badgeClassName?: string;
    filter?: ColumnFilter;
  },
): Column<T> {
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    className: opts.className,
    filter: opts.filter,
    cell: (row) => (
      <Badge
        variant={typeof opts.variant === "function" ? opts.variant(row) : opts.variant}
        className={opts.badgeClassName ?? "text-[10px] h-[24px]"}
      >
        {opts.get(row)}
      </Badge>
    ),
  };
}

/** Status pill via the shared `StatusBadge` (maps status → colour). */
export function statusColumn<T>(
  opts: BaseColumn & {
    get: (row: T) => string | boolean;
    badgeClassName?: string;
    activeLabel?: string;
    inactiveLabel?: string;
    filter?: ColumnFilter;
  },
): Column<T> {
  return {
    id: opts.id,
    header: opts.header,
    headerClassName: opts.headerClassName,
    className: opts.className,
    filter: opts.filter,
    cell: (row) => (
      <StatusBadge
        status={opts.get(row)}
        activeLabel={opts.activeLabel}
        inactiveLabel={opts.inactiveLabel}
        className={opts.badgeClassName ?? "text-[10px]"}
      />
    ),
  };
}

/** Right-aligned action buttons via the shared `RowActions` catalog. */
export function actionsColumn<T>(opts: {
  id?: string;
  header: string;
  actions: (row: T) => RowActionsProps<T>["actions"];
  className?: string;
  headerClassName?: string;
}): Column<T> {
  return {
    id: opts.id ?? "actions",
    header: opts.header,
    className: opts.className ?? "w-24 text-right",
    headerClassName: opts.headerClassName ?? "text-right",
    cell: (row) => <RowActions row={row} actions={opts.actions(row)} />,
  };
}
