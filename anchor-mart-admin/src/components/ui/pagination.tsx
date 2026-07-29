import { IconChevronLeft, IconChevronRight, IconDots } from "@tabler/icons-react";
import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn("", className)} {...props} />,
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"button">;

const PaginationLink = ({ className, isActive, size = "sm", ...props }: PaginationLinkProps) => (
  <Button
    aria-current={isActive ? "page" : undefined}
    variant={isActive ? "primary" : "ghost"}
    size={size}
    className={className}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="sm"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <IconChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="sm"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <IconChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <IconDots className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};

export interface PaginationProps {
  page: number;
  pages: number;
  total?: number;
  limit?: number;
  onPageChange: (page: number) => void;
}

/**
 * Build a windowed page range with ellipsis markers so the control stays compact
 * for large page counts: always shows first/last + a window around the current page.
 * Returns page numbers and "ellipsis" sentinels, e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 20].
 */
function getPageRange(current: number, total: number, siblings = 1): (number | "ellipsis")[] {
  const totalShown = siblings * 2 + 5; // first, last, current, 2 ellipses, 2*siblings
  if (total <= totalShown) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;

  const range: (number | "ellipsis")[] = [1];
  if (showLeftEllipsis) range.push("ellipsis");
  for (let i = showLeftEllipsis ? left : 2; i <= (showRightEllipsis ? right : total - 1); i++) {
    range.push(i);
  }
  if (showRightEllipsis) range.push("ellipsis");
  range.push(total);
  return range;
}

export default function ReusablePagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  const items = getPageRange(page, pages);

  return (
    <Pagination className="justify-end px-5 py-3.5 border-t border-[var(--border-xs)]">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => page > 1 && onPageChange(page - 1)}
            aria-disabled={page === 1}
            className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis position is stable for a given range
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                isActive={page === item}
                onClick={() => onPageChange(item)}
                className="cursor-pointer"
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            onClick={() => page < pages && onPageChange(page + 1)}
            aria-disabled={page === pages}
            className={page === pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
