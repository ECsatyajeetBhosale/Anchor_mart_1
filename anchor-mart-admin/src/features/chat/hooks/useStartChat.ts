import { API_MAX_PAGE_SIZE, APP_ROUTES } from "@/lib/constants";
import { MESSAGES } from "@/lib/messages";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useLazyGetDeliveryChatsQuery,
  useLazyGetOrderChatsQuery,
  useLazyGetUserChatsQuery,
} from "../api/chatApi";
import {
  matchesOrderThread,
  matchesSupportThread,
  orderThreadCategory,
  supportInboxFor,
} from "../lib/threadMatch";
import type { ChatCounterparty, ChatSource, ChatThread } from "../types/chat.types";

const M = MESSAGES.CHAT.START;

/**
 * How many pages deep to look before giving up.
 *
 * At {@link API_MAX_PAGE_SIZE} rows a page this covers 500 threads, which is far
 * past any realistic inbox and still bounded — an unbounded loop against a
 * paginated endpoint is a hang waiting for a large enough dataset.
 *
 * A search that runs out of pages reports "no conversation" rather than
 * pretending certainty. The real fix is server-side filtering: §4.3 accepts only
 * `category`, `page` and `page_size`, so there is no way to ask for "the thread
 * on order X" and this has to walk the list. **An `?order_id=` (and a
 * `?user_id=` on §4.1/§4.2) would collapse every search here to one request** —
 * it is the one backend change this screen wants.
 */
const MAX_PAGES = 10;

/** Walks an inbox page by page until `match` hits, the rows run out, or the cap. */
async function findThread(
  fetchPage: (page: number) => Promise<{ count: number; items: ChatThread[] } | undefined>,
  match: (thread: ChatThread) => boolean,
): Promise<ChatThread | null> {
  let seen = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fetchPage(page);
    const items = result?.items ?? [];
    if (items.length === 0) return null;
    const hit = items.find(match);
    if (hit) return hit;
    seen += items.length;
    // `count` is the server's total; stop as soon as this page completed it
    // rather than spending a request to discover an empty page.
    if (result && seen >= result.count) return null;
  }
  return null;
}

export interface StartChatApi {
  /**
   * Opens the user's support thread and navigates to it.
   *
   * `inbox` says which endpoint holds it — a partner's support thread is in the
   * delivery inbox, not the sailor one, and landing on the wrong tab would show
   * an empty list where the thread is not.
   */
  startSupportChat: (userId: string, inbox?: ChatSource) => Promise<void>;
  /**
   * Opens the order thread for one side of an order.
   *
   * `previousPartnerId` reaches a **previous** delivery partner on a reassigned
   * order: an order can hold several `order_delivery` threads, one per partner
   * who has ever held it, so the order id alone is ambiguous there and the owner
   * id disambiguates. Omit it for the current partner.
   *
   * `userId` is the fallback path, not the primary one — see the hook docs.
   */
  startOrderChat: (args: {
    orderId: string;
    side: ChatCounterparty;
    previousPartnerId?: string;
    userId?: string;
  }) => Promise<void>;
  /** True while a search is in flight. */
  isStarting: boolean;
}

/**
 * Opens the conversation with someone the admin is already looking at.
 *
 * ## Why this finds threads instead of creating them
 *
 * It used to POST to `…/chat/support-chats/create/` and
 * `…/chat/order-chats/create/`. Neither route exists. The order one returned a
 * **400 rather than a 404** — `create` was matched as the `<chat_id>` segment of
 * §4.4's detail route and rejected as an unparseable id — which is why it read
 * as a payload problem for so long.
 *
 * They were never going to exist. Flow 23 §1, "Who may open an order thread",
 * gives admins **"cannot open one — there is nothing to say until the other side
 * asks"**, and the Postman collection says the same of the customer-facing
 * create ("staff cannot open a thread on the customer's behalf"). A thread is
 * opened by the sailor or the partner; the admin joins one that exists. So the
 * job here is a lookup and a navigation, using the same list endpoints the
 * inboxes already render and the same `openChatId` route state the inbox already
 * consumes.
 *
 * ## What happens when there is no order thread
 *
 * The order thread is tried first — it is the conversation *about this order*,
 * and the one the admin means. Where none exists yet, the caller may pass
 * `userId` and the search falls back to that person's **support** thread, which
 * is the only other conversation an admin can reach them through. The fallback
 * announces itself: silently landing on a general support thread when the admin
 * asked about an order would misrepresent which conversation they are in.
 *
 * With neither, nothing is opened and the toast says why. That is a real state
 * of this system, not a failure — an order nobody has written about has no
 * thread, and this panel cannot conjure one.
 */
export function useStartChat(): StartChatApi {
  const navigate = useNavigate();
  const [fetchUserChats] = useLazyGetUserChatsQuery();
  const [fetchDeliveryChats] = useLazyGetDeliveryChatsQuery();
  const [fetchOrderChats] = useLazyGetOrderChatsQuery();
  // Not RTK Query's own flags: one click can span several requests across two
  // endpoints, and any single hook's `isFetching` goes quiet between them.
  const [isStarting, setIsStarting] = useState(false);

  /** Finds a user's support thread in whichever inbox holds it. */
  const findSupportThread = useCallback(
    async (userId: string, inbox: ChatSource) => {
      const fetchPage = inbox === "delivery" ? fetchDeliveryChats : fetchUserChats;
      return findThread(
        (page) =>
          fetchPage({ page, limit: API_MAX_PAGE_SIZE }, true)
            .unwrap()
            .catch(() => undefined),
        (thread) => matchesSupportThread(thread, userId),
      );
    },
    [fetchDeliveryChats, fetchUserChats],
  );

  const startSupportChat = useCallback(
    async (userId: string, inbox: ChatSource = "support") => {
      if (!userId) {
        toast.error(M.NO_PARTICIPANT);
        return;
      }
      setIsStarting(true);
      try {
        const thread = await findSupportThread(userId, inbox);
        if (!thread) {
          toast.info(M.NO_SUPPORT_THREAD);
          return;
        }
        navigate(APP_ROUTES.SUPPORT, { state: { openChatId: thread.id, source: inbox } });
      } finally {
        setIsStarting(false);
      }
    },
    [findSupportThread, navigate],
  );

  const startOrderChat = useCallback(
    async ({
      orderId,
      side,
      previousPartnerId,
      userId,
    }: {
      orderId: string;
      side: ChatCounterparty;
      previousPartnerId?: string;
      userId?: string;
    }) => {
      if (!orderId) {
        toast.error(M.NO_PARTICIPANT);
        return;
      }
      setIsStarting(true);
      try {
        const category = orderThreadCategory(side);
        const thread = await findThread(
          (page) =>
            fetchOrderChats({ category, page, limit: API_MAX_PAGE_SIZE }, true)
              .unwrap()
              .catch(() => undefined),
          (t) => matchesOrderThread(t, orderId, previousPartnerId),
        );
        if (thread) {
          navigate(APP_ROUTES.ORDER_CHATS, { state: { openChatId: thread.id } });
          return;
        }

        // No order thread. Their support thread is the only other way to reach
        // them, and it is a different conversation — so it is offered, not
        // substituted silently.
        if (userId) {
          const support = await findSupportThread(userId, supportInboxFor(side));
          if (support) {
            toast.info(side === "customer" ? M.FELL_BACK_SAILOR : M.FELL_BACK_PARTNER);
            navigate(APP_ROUTES.SUPPORT, {
              state: { openChatId: support.id, source: supportInboxFor(side) },
            });
            return;
          }
        }
        toast.info(side === "customer" ? M.NO_ORDER_THREAD_SAILOR : M.NO_ORDER_THREAD_PARTNER);
      } finally {
        setIsStarting(false);
      }
    },
    [fetchOrderChats, findSupportThread, navigate],
  );

  return { startSupportChat, startOrderChat, isStarting };
}

export default useStartChat;
