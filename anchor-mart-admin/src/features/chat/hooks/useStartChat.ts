import { APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCreateOrderChatMutation, useCreateSupportChatMutation } from "../api/chatApi";
import type { ChatCounterparty } from "../types/chat.types";

const M = MESSAGES.CHAT.START;

/** Reads the HTTP status off an RTK Query error without asserting a shape. */
function statusOf(error: unknown): number | null {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return null;
}

/**
 * Turns a create-chat failure into something an admin can act on (§8.3).
 *
 * 403 and 409 come from the same ownership gate as every other admin action on
 * an order, so they get the panel's existing vocabulary. Both are **terminal for
 * this admin** — the fix is claiming the order or asking whoever owns it, never
 * pressing the button again — so neither is offered a retry.
 */
function errorMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 403) return M.NOT_OWNER;
  if (status === 409) return M.UNASSIGNED;

  // 400 carries a real explanation — a blocked account, an admin as the target,
  // no assignment on the order. The server's prose beats anything generic here.
  const data = (error as { data?: unknown })?.data;
  const detail =
    typeof data === "object" && data !== null && "detail" in data
      ? (data as { detail: unknown }).detail
      : null;
  if (typeof detail === "string" && detail) return detail;

  return M.FAILED;
}

export interface StartChatApi {
  /**
   * Opens (or reuses) the support thread with a user, then navigates to it.
   *
   * `inbox` says which tab the thread will appear on. A partner's support thread
   * is in the delivery inbox, not the sailor one, so landing on the default
   * would show an empty list where the new thread is not.
   */
  startSupportChat: (userId: string, inbox?: "support" | "delivery") => Promise<void>;
  /**
   * Opens (or reuses) an order thread with one side of an order.
   *
   * `previousPartnerId` reaches a **previous** delivery partner on a reassigned
   * order; omit it for the current one. It is rejected with a 400 alongside
   * `side: "customer"`, since an order has exactly one sailor.
   */
  startOrderChat: (args: {
    orderId: string;
    side: ChatCounterparty;
    previousPartnerId?: string;
  }) => Promise<void>;
  /** True while either create is in flight. */
  isStarting: boolean;
}

/**
 * Admin-initiated conversations (Flow 23 §8.3).
 *
 * Both entry points start from something the admin is already looking at — an
 * order, or a user — which is why this is a hook rather than a "new message"
 * screen with a recipient picker: the recipient is never in question.
 *
 * **201 and 200 are the same outcome.** A thread that already existed is not a
 * conflict and must never be reported as one; the admin asked to talk to
 * someone, and both answers mean they now can.
 */
export function useStartChat(): StartChatApi {
  const navigate = useNavigate();
  const [createSupport, supportState] = useCreateSupportChatMutation();
  const [createOrder, orderState] = useCreateOrderChatMutation();

  const startSupportChat = useCallback(
    async (userId: string, inbox: "support" | "delivery" = "support") => {
      try {
        // `message` is deliberately omitted: an admin may open a thread now and
        // write later, and pre-sending anything would put words in their mouth.
        const result = await createSupport({ user_id: userId }).unwrap();
        navigate(APP_ROUTES.SUPPORT, {
          state: { openChatId: result.chatId, source: inbox },
        });
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    [createSupport, navigate],
  );

  const startOrderChat = useCallback(
    async ({
      orderId,
      side,
      previousPartnerId,
    }: { orderId: string; side: ChatCounterparty; previousPartnerId?: string }) => {
      try {
        const result = await createOrder({
          order_id: orderId,
          side,
          // Only ever sent for a previous partner. Paired with `side: "customer"`
          // it is a 400, so it is never attached on the sailor path.
          ...(previousPartnerId && side === "delivery_partner"
            ? { user_id: previousPartnerId }
            : {}),
        }).unwrap();
        navigate(APP_ROUTES.ORDER_CHATS, { state: { openChatId: result.chatId } });
      } catch (error) {
        toast.error(errorMessage(error));
      }
    },
    [createOrder, navigate],
  );

  return {
    startSupportChat,
    startOrderChat,
    isStarting: supportState.isLoading || orderState.isLoading,
  };
}

export default useStartChat;
