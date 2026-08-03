import { OUTBOUND_MESSAGE_ENDPOINTS } from "@/lib/apiEndpoints";
import { asNumber, asString, unwrapData, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import type {
  GetOutboundMessagesParams,
  OutboundMessage,
  OutboundMessageApi,
  OutboundMessageBadgeVariant,
  OutboundMessageListResult,
} from "../types/outboundMessage.types";

const M = MESSAGES.OUTBOUND_MESSAGES;

const FALLBACK = "-";

function dash(value: unknown): string {
  const s = asString(value).trim();
  return s === "" ? FALLBACK : s;
}

/**
 * Status → badge colour.
 *
 * `sent` is deliberately *not* green: it means the provider accepted the
 * message, not that it arrived. Only `delivered`/`read` are a success.
 */
const STATUS_VARIANT: Record<string, OutboundMessageBadgeVariant> = {
  queued: "neutral",
  sending: "info",
  sent: "info",
  delivered: "success",
  read: "green",
  failed: "danger",
};

export function messageStatusVariant(status: string): OutboundMessageBadgeVariant {
  return STATUS_VARIANT[status.trim().toLowerCase()] ?? "neutral";
}

const CHANNEL_VARIANT: Record<string, OutboundMessageBadgeVariant> = {
  email: "navy",
  whatsapp: "teal",
};

export function messageChannelVariant(channel: string): OutboundMessageBadgeVariant {
  return CHANNEL_VARIANT[channel.trim().toLowerCase()] ?? "neutral";
}

function toOutboundMessage(row: OutboundMessageApi): OutboundMessage {
  const channel = asString(row.channel).trim();
  const status = asString(row.status).trim();
  return {
    id: asString(row.id),
    channel,
    channelLabel: row.channel_display?.trim()
      ? row.channel_display.trim()
      : (M.CHANNEL_LABELS[channel] ?? dash(channel)),
    channelVariant: messageChannelVariant(channel),
    status,
    statusLabel: row.status_display?.trim()
      ? row.status_display.trim()
      : (M.STATUS_LABELS[status] ?? dash(status)),
    statusVariant: messageStatusVariant(status),
    userId: asString(row.user),
    userEmail: dash(row.user_email),
    recipient: dash(row.recipient),
    subject: dash(row.subject),
    template: dash(row.template),
    eventId: dash(row.event_id),
    eventType: dash(row.event_type),
    provider: dash(row.provider),
    providerMessageId: dash(row.provider_message_id),
    error: asString(row.error).trim(),
    attempts: asNumber(row.attempts),
    sentAt: dash(row.sent_at),
    deliveredAt: dash(row.delivered_at),
    readAt: dash(row.read_at),
    failedAt: dash(row.failed_at),
    createdAt: dash(row.created_at),
    updatedAt: dash(row.updated_at),
  };
}

export const outboundMessageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** §3.1 — the ledger, newest first by default. */
    getOutboundMessages: builder.query<OutboundMessageListResult, GetOutboundMessagesParams>({
      query: (params) => ({
        url: OUTBOUND_MESSAGE_ENDPOINTS.GET_MESSAGES,
        method: "GET",
        // Blanks are omitted — every filter is validated and an unknown value
        // (`status=banana`) is a 400, not an empty page.
        params: {
          page: params.page,
          page_size: params.limit,
          channel: params.channel || undefined,
          status: params.status || undefined,
          recipient: params.recipient || undefined,
          event_type: params.eventType || undefined,
          user_id: params.userId || undefined,
          ordering: params.ordering || undefined,
        },
      }),
      transformResponse: (res: unknown): OutboundMessageListResult => {
        const { count, items } = unwrapList<OutboundMessage>(res, (row) =>
          toOutboundMessage(row as OutboundMessageApi),
        );
        return { count, messages: items };
      },
      providesTags: (result) =>
        result?.messages
          ? [
              ...result.messages.map(({ id }) => ({ type: "OutboundMessages" as const, id })),
              { type: "OutboundMessages", id: "PARTIAL-LIST" },
            ]
          : [{ type: "OutboundMessages", id: "PARTIAL-LIST" }],
    }),

    /**
     * §3.2 — one delivery record. Same shape as a list row, so the drawer can
     * render the selected row immediately and swap in the fresh copy when it
     * lands. A non-UUID doesn't match the route and returns a plain 404.
     */
    getOutboundMessage: builder.query<OutboundMessage, string>({
      query: (id) => ({ url: OUTBOUND_MESSAGE_ENDPOINTS.GET_MESSAGE(id), method: "GET" }),
      transformResponse: (res: unknown): OutboundMessage =>
        toOutboundMessage(unwrapData<OutboundMessageApi>(res)),
      providesTags: (_r, _e, id) => [{ type: "OutboundMessages", id }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetOutboundMessagesQuery, useGetOutboundMessageQuery } = outboundMessageApi;
