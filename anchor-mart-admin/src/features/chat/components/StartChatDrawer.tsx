import { SegmentedToggle } from "@/components/common/SegmentedToggle";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useGetOrderAssignmentsQuery } from "@/features/assignments/api/assignmentApi";
import { useGetOrdersQuery } from "@/features/orders/api/orderApi";
import { API_MAX_PAGE_SIZE } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { IconSearch } from "@tabler/icons-react";
import { useState } from "react";
import { useStartChat } from "../hooks/useStartChat";
import type { ChatCounterparty } from "../types/chat.types";
import { ChatUserPicker, type PickedUser } from "./ChatUserPicker";

const M = MESSAGES.CHAT.START;

/** Which endpoint the drawer will call. */
export type StartChatMode = "support" | "order";

const SIDE_OPTIONS: { value: ChatCounterparty; label: string }[] = [
  { value: "customer", label: M.SIDE_SAILOR },
  { value: "delivery_partner", label: M.SIDE_PARTNER },
];

export interface StartChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: StartChatMode;
}

/**
 * Start a conversation from the inbox (Flow 23 §8.3).
 *
 * §8.3's two entry points both begin from something the admin is already
 * looking at — an order, or a user — and those remain the primary routes. This
 * is the same two endpoints reached from the inbox, for the case where the
 * conversation *is* the errand rather than an afterthought on another screen.
 *
 * **`side` is chosen, never guessed.** A sailor's thread and a partner's thread
 * on one order are separate conversations that cannot see each other, so the
 * drawer makes the admin say which — there is no sensible default to pick.
 */
export function StartChatDrawer({ isOpen, onClose, mode }: StartChatDrawerProps) {
  const { startSupportChat, startOrderChat, isStarting } = useStartChat();

  const [side, setSide] = useState<ChatCounterparty>("customer");
  const [orderSearch, setOrderSearch] = useState("");
  const [selected, setSelected] = useState<PickedUser | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  // Which previous partner to reach, if any. Null means "the partner currently
  // holding the delivery" — which is what omitting `user_id` resolves to, and
  // the right default in almost every case.
  const [previousPartnerId, setPreviousPartnerId] = useState<string | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  // Reset on open so a cancelled attempt doesn't prefill the next one. Adjusted
  // during render rather than in an effect, so the first paint is already clean
  // instead of flashing the previous draft.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setOrderSearch("");
      setSelected(null);
      setSelectedOrderId(null);
      setPreviousPartnerId(null);
      setShowPrevious(false);
    }
  }

  // Searched server-side, so the box reaches the whole table rather than
  // filtering the page that happens to be loaded.
  const orders = useGetOrdersQuery(
    { page: 1, limit: API_MAX_PAGE_SIZE, search: orderSearch.trim() },
    { skip: !isOpen || mode !== "order" },
  );

  /**
   * Past holders of this order, offered only when messaging the partner side.
   *
   * Fetched lazily — opening the list is a deliberate act, and a reassigned
   * order is the uncommon case. Rows without a resolvable user id are dropped:
   * the endpoint keys on the user UUID and the partner code cannot substitute.
   */
  const assignments = useGetOrderAssignmentsQuery(selectedOrderId ?? "", {
    skip: !showPrevious || !selectedOrderId || side !== "delivery_partner",
  });
  const previousPartners = (assignments.data ?? []).filter(
    (row) => !row.isActive && row.partnerUserId,
  );

  const canSubmit = mode === "support" ? Boolean(selected) : Boolean(selectedOrderId);

  const submit = async () => {
    if (mode === "support") {
      if (!selected) return;
      // A partner's support thread lives in the delivery inbox, so the
      // navigation has to name it — landing on the sailor tab would show an
      // empty list where the thread just created is not.
      await startSupportChat(selected.id, selected.audience === "partner" ? "delivery" : "support");
    } else {
      if (!selectedOrderId) return;
      await startOrderChat({
        orderId: selectedOrderId,
        side,
        // Omitted unless a past holder was explicitly chosen. Left out, the
        // backend resolves whoever currently holds the delivery — guessing
        // between past holders is exactly what this parameter exists to avoid.
        ...(previousPartnerId ? { previousPartnerId } : {}),
      });
    }
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" adjustable defaultWidth={440}>
        <SheetHeader>
          <SheetTitle>{mode === "support" ? M.NEW_SUPPORT : M.NEW_ORDER}</SheetTitle>
          <SheetDescription>
            {mode === "support" ? M.NEW_SUPPORT_HINT : M.NEW_ORDER_HINT}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 p-6">
          {mode === "support" ? (
            // Both directories come from their own list endpoints — the only way
            // to turn a person into the user UUID the endpoint takes.
            <ChatUserPicker
              enabled={isOpen}
              selectedIds={selected ? [selected.id] : []}
              onToggle={(user) => setSelected((prev) => (prev?.id === user.id ? null : user))}
            />
          ) : (
            <>
              {/* Which side of the order. The two threads are not
                  interchangeable, so there is no default worth guessing. */}
              <SegmentedToggle value={side} options={SIDE_OPTIONS} onChange={setSide} fill />

              <div className="relative">
                <IconSearch
                  size={15}
                  className="-translate-y-1/2 absolute top-1/2 left-3 text-[var(--t4)]"
                />
                <Input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder={M.SEARCH_ORDERS}
                  className="pl-9"
                />
              </div>

              <div className="flex max-h-[42vh] flex-col gap-1 overflow-y-auto">
                {orders.isFetching && (
                  <p className="xs c4 w6 px-3 py-2">{MESSAGES.COMMON.LOADING}</p>
                )}
                {!orders.isFetching && (orders.data?.results.length ?? 0) === 0 && (
                  <p className="xs c4 w6 px-3 py-2">{M.NO_ORDERS}</p>
                )}
                {!orders.isFetching &&
                  (orders.data?.results ?? []).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedOrderId(row.id)}
                      className={`flex w-full flex-col items-start gap-[2px] rounded-[var(--radius-sm)] border-[1.5px] px-3 py-2 text-left transition-colors ${
                        selectedOrderId === row.id
                          ? "border-[var(--teal-500)] bg-[var(--teal-50)]"
                          : "border-transparent hover:bg-[var(--surface-alt)]"
                      }`}
                    >
                      <span className="w7 c1 text-[13px]">{row.order_number}</span>
                      <span className="xs c4 w6">
                        {`${row.customer_name ?? M.NO_NAME} · ${row.status_display || row.status}`}
                      </span>
                    </button>
                  ))}
              </div>
              {/* Only for the partner side, and only once an order is chosen —
                  there is no assignment history to ask about before that. */}
              {side === "delivery_partner" && selectedOrderId && (
                <div className="border-[var(--border-xs)] border-t pt-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setShowPrevious((prev) => !prev);
                      // Collapsing returns to the default: the current holder.
                      if (showPrevious) setPreviousPartnerId(null);
                    }}
                  >
                    {showPrevious ? M.PREVIOUS_HIDE : M.PREVIOUS_SHOW}
                  </button>

                  {showPrevious && (
                    <div className="mt-2 flex flex-col gap-1">
                      {assignments.isFetching && (
                        <p className="xs c4 w6 px-3 py-2">{MESSAGES.COMMON.LOADING}</p>
                      )}
                      {!assignments.isFetching && previousPartners.length === 0 && (
                        <p className="xs c4 w6 px-3 py-2">{M.NO_PREVIOUS}</p>
                      )}
                      {!assignments.isFetching &&
                        previousPartners.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() =>
                              setPreviousPartnerId((prev) =>
                                prev === row.partnerUserId ? null : row.partnerUserId,
                              )
                            }
                            className={`flex w-full flex-col items-start gap-[2px] rounded-[var(--radius-sm)] border-[1.5px] px-3 py-2 text-left transition-colors ${
                              previousPartnerId === row.partnerUserId
                                ? "border-[var(--teal-500)] bg-[var(--teal-50)]"
                                : "border-transparent hover:bg-[var(--surface-alt)]"
                            }`}
                          >
                            <span className="w7 c1 text-[13px]">{row.partnerName}</span>
                            <span className="xs c4 w6">
                              {`${row.partnerCode || M.NO_NAME} · ${row.statusDisplay}`}
                            </span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <SheetFooter className="border-[var(--border-md)] border-t bg-[var(--surface)] p-6">
          <div className="flex w-full items-center gap-3">
            <button type="button" className="btn btn-ghost btn-cancel mr-auto" onClick={onClose}>
              {MESSAGES.COMMON.CANCEL}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canSubmit || isStarting}
              onClick={submit}
            >
              {isStarting ? M.OPENING : M.OPEN}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default StartChatDrawer;
