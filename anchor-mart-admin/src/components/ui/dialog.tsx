import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Built on Radix's dialog primitive — the same one `Sheet` uses.
 *
 * It used to be hand-rolled: a context plus a `fixed inset-0 z-[100]` div
 * rendered inline. That worked standalone and failed in exactly one place, the
 * one that matters most — **a dialog opened from inside a drawer**:
 *
 * 1. Inline, its `z-[100]` was scoped to whatever stacking context an ancestor
 *    created, so it painted *underneath* the drawer.
 * 2. Portalled to `body` to fix that, it then landed under the drawer's modal
 *    lock: Radix sets `pointer-events: none` on `body` and traps focus inside
 *    the open sheet, so the dialog rendered correctly and was **completely
 *    inert** — visible, unclickable, its inputs unfocusable, until the drawer
 *    behind it was dismissed.
 *
 * Neither is fixable from outside Radix's layer stack, because the lock is the
 * point of a modal. Joining the stack is: Radix nests dialogs properly,
 * handing pointer-events and focus to the topmost layer and restoring them on
 * close. The exported API is unchanged, so all 17 call sites are untouched.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

export { Dialog, DialogTrigger };

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-[100] grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-[var(--border-md)] bg-[var(--surface)] p-6 shadow-xl duration-200 sm:rounded-xl",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // `gap-3` rather than `sm:space-x-3`: the latter only spaces horizontal
        // siblings, so the stacked mobile layout had no gap at all and a footer
        // that wrapped would have none between rows either.
        // `flex-wrap` because three actions with real labels exceed the dialog's
        // 512px at `sm`, and buttons running off the edge is worse than two rows.
        "flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-bold leading-none tracking-tight text-[var(--t1)]", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[var(--t3)]", className)} {...props} />;
}
