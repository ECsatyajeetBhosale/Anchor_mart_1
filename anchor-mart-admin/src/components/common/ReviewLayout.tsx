import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  IconCopy,
  IconInfoCircle,
  IconLock,
  IconMail,
  IconPhone,
  IconUser,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

/**
 * The review-drawer layout, shared by the Intents and Orders review surfaces.
 *
 * Extracted from `IntentReviewDrawer`, which is the reference design: identity
 * header → summary strip (status · headline value · lifecycle rail · key facts)
 * → a single "what to do next" line → tabbed body. The Orders drawer previously
 * had none of that above the tab bar and rendered its Overview as a flat
 * key-value list, so the two screens read as different products.
 *
 * Everything here is **presentational**. No feature imports, no data fetching,
 * no message-catalogue lookups — every label arrives as a prop, because the two
 * drawers word the same slot differently ("Created Intent on" vs "Order Date")
 * and hard-coding either one here would make the component lie on the other
 * screen.
 */

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** One label/value pair in the summary strip. */
export function Fact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-extrabold uppercase tracking-[1px] text-[var(--t4)]">
        {label}
      </div>
      <div
        className="trunc mt-0.5 flex items-center gap-1.5 text-[13px] font-bold text-[var(--t1)]"
        title={value}
      >
        {icon}
        {value || "—"}
      </div>
    </div>
  );
}

/** Key-value row used in the detail sections. */
export function KV({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="detail-kv">
      <div className="detail-k">{label}</div>
      <div className={`detail-v ${className ?? ""}`}>{value || "—"}</div>
    </div>
  );
}

/** Section wrapper — `.sec-label` heading plus its content block. */
export function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("mb-6 last:mb-0", className)}>
      <div className="sec-label">{title}</div>
      {children}
    </section>
  );
}

/** Contact line (mail/phone) with a graceful "nothing on file" fallback. */
export function Contact({
  icon,
  value,
  href,
  fallback,
}: {
  icon: ReactNode;
  value: string;
  href: string;
  fallback: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-[var(--t2)]">
      <span className="shrink-0 text-[var(--t4)]">{icon}</span>
      {value ? (
        <a href={href} className="trunc hover:text-[var(--teal-700)]" title={value}>
          {value}
        </a>
      ) : (
        <span className="font-medium text-[var(--t4)]">{fallback}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composed blocks                                                     */
/* ------------------------------------------------------------------ */

/** Identity header: icon · title · copyable reference · right-hand slot. */
export function ReviewHeader({
  icon,
  title,
  reference,
  copyLabel,
  onCopy,
  right,
}: {
  icon: ReactNode;
  title: string;
  reference: string;
  copyLabel: string;
  onCopy: () => void;
  /** Ownership badge, status chip — whatever the screen puts on the right. */
  right?: ReactNode;
}) {
  return (
    <SheetHeader className="border-b border-[var(--border-md)] p-6 pb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--navy-50)] text-[var(--navy-600)]">
          {icon}
        </div>
        <div className="min-w-0">
          <SheetTitle className="text-[17px] font-extrabold text-[var(--t1)]">{title}</SheetTitle>
          <SheetDescription className="flex items-center gap-1.5 text-[12.5px] text-[var(--t3)]">
            <span className="mono">{reference}</span>
            <button
              type="button"
              onClick={onCopy}
              title={copyLabel}
              aria-label={copyLabel}
              className="text-[var(--t4)] transition-colors hover:text-[var(--teal-600)]"
            >
              <IconCopy size={13} />
            </button>
          </SheetDescription>
        </div>
        {right && <div className="ml-auto shrink-0">{right}</div>}
      </div>
    </SheetHeader>
  );
}

/** One entry in the summary strip's fact grid. */
export interface SummaryFact {
  label: string;
  value: string;
  icon?: ReactNode;
}

/**
 * Summary strip: status badges, the headline money figure, the lifecycle rail
 * and up to four key facts.
 *
 * `value` is a node rather than a string so a screen can substitute prose for a
 * figure — the intents drawer shows "Not priced yet" before a bill exists, where
 * rendering the backend's real `0.00` would read as "this order is free".
 */
export function ReviewSummaryStrip({
  badges,
  valueLabel,
  value,
  rail,
  facts,
}: {
  badges: ReactNode;
  valueLabel: string;
  value: ReactNode;
  rail?: ReactNode;
  facts: SummaryFact[];
}) {
  return (
    <div className="border-b border-[var(--border-md)] bg-[var(--surface-alt)] px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">{badges}</div>
        <div className="text-right">
          <div className="text-[10px] font-extrabold uppercase tracking-[1px] text-[var(--t4)]">
            {valueLabel}
          </div>
          {value}
        </div>
      </div>

      {rail && <div className="mt-4">{rail}</div>}

      {facts.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {facts.map((f) => (
            <Fact key={f.label} label={f.label} value={f.value} icon={f.icon} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The single "what happens next / why you can't" line under the summary strip.
 *
 * `tone` is the whole point: `info` states the next action, `blocked` explains a
 * gate the operator has to clear first. One line, never both.
 */
export function ReviewGateBanner({
  tone,
  label,
  message,
}: {
  tone: "info" | "blocked";
  label: string;
  message: string;
}) {
  const isInfo = tone === "info";
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b px-6 py-2.5",
        isInfo
          ? "border-[var(--info-border)] bg-[var(--info-bg)]"
          : "border-[var(--warning-border)] bg-[var(--warning-bg)]",
      )}
    >
      {isInfo ? (
        <IconInfoCircle size={15} className="shrink-0 text-[var(--info-icon)]" />
      ) : (
        <IconLock size={15} className="shrink-0 text-[var(--warning-icon)]" />
      )}
      <span
        className={cn(
          "text-[10px] font-extrabold uppercase tracking-[1.2px]",
          isInfo ? "text-[var(--info-text)]" : "text-[var(--warning-text)]",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "trunc text-[12.5px] font-semibold",
          isInfo ? "text-[var(--info-text)]" : "text-[var(--warning-text)]",
        )}
        title={message}
      >
        {message}
      </span>
    </div>
  );
}

/** Customer card: avatar, name, role caption, and the two contact channels. */
export function ReviewCustomerCard({
  name,
  roleLabel,
  email,
  phone,
  noEmailLabel,
  noPhoneLabel,
}: {
  name: string;
  roleLabel: string;
  email: string;
  phone: string;
  noEmailLabel: string;
  noPhoneLabel: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-sm)] bg-[var(--navy-25)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--navy-100)] text-[var(--navy-600)]">
          <IconUser size={18} />
        </div>
        <div className="min-w-0">
          <div className="trunc text-[14px] font-bold text-[var(--t1)]">{name || "—"}</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.6px] text-[var(--t4)]">
            {roleLabel}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 border-t border-[var(--border-xs)] pt-3 sm:grid-cols-2">
        <Contact
          icon={<IconMail size={13} />}
          value={email}
          href={`mailto:${email}`}
          fallback={noEmailLabel}
        />
        <Contact
          icon={<IconPhone size={13} />}
          value={phone}
          href={`tel:${phone}`}
          fallback={noPhoneLabel}
        />
      </div>
    </div>
  );
}

/** One tile in the vessel/shipping grid. */
export interface ReviewTile {
  label: string;
  value: string;
  icon?: ReactNode;
  /** Renders the value in the mono/teal treatment used for IMO numbers. */
  mono?: boolean;
}

/** Three-across grid of vessel & shipping facts. */
export function ReviewTiles({ tiles }: { tiles: ReviewTile[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="mini-stat">
          <div
            className={cn(
              "mini-stat-val trunc !text-[14px]",
              t.mono ? "mono cteal" : "flex items-center gap-1.5",
            )}
          >
            {!t.mono && t.icon}
            {t.value || "—"}
          </div>
          <div className="mini-stat-lbl">{t.label}</div>
        </div>
      ))}
    </div>
  );
}
