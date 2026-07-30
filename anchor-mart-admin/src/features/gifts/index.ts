// Public API for the surprise-gift feature (Flow 20) — import only from here.
export { GiftShipsPage } from "./components/GiftShipsPage";
export { GiftShipDetailDrawer } from "./components/GiftShipDetailDrawer";
export { GiftConfigDrawer } from "./components/GiftConfigDrawer";
export {
  useGetGiftConfigQuery,
  useUpdateGiftConfigMutation,
  useGetGiftShipsQuery,
  useGetGiftShipQuery,
  useGrantShipGiftsMutation,
  useDismissShipMutation,
  useUndismissShipMutation,
  useGrantOrderGiftMutation,
  useRevokeOrderGiftMutation,
} from "./api/giftApi";
export type {
  GiftConfig,
  GiftShip,
  GiftShipDetail,
  GiftShipSailor,
  SailorGift,
} from "./types/gift.types";
