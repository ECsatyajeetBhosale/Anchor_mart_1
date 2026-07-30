import { useState } from "react";
import { giftApi, useGrantShipGiftsMutation, useRevokeOrderGiftMutation } from "../api/giftApi";

/** Outcome of a ship-wide revoke, so a partial failure can be reported honestly. */
export interface RevokeShipResult {
  revoked: number;
  failed: number;
}

/**
 * Ship-level gift actions.
 *
 * Granting is a single call — `POST /gifts/ships/<imo>/grant/` is already
 * ship-scoped.
 *
 * Revoking is **not**. The API exposes revoke only per carrier order
 * (`POST /gifts/orders/<order_id>/revoke/`, Flow 20 §7); there is no ship-level
 * equivalent. So a ship-wide revoke is assembled here: read the vessel's
 * sailors, collect the carrier order behind each live gift, and revoke them one
 * by one.
 *
 * Two consequences the caller has to live with, both inherent to composing a
 * bulk action out of single-item calls rather than flaws in this code:
 *
 *  - **It is not atomic.** A failure partway leaves some gifts revoked and
 *    others standing, so the result reports both counts instead of a boolean.
 *  - **It is sequential.** Each revoke writes an audit row and frees a slot in
 *    `uniq_gift_per_sailor_per_group`; firing them in parallel would race that
 *    constraint for no real speed gain at crew scale.
 *
 * A real `POST /gifts/ships/<imo>/revoke/` would make both go away.
 */
export function useShipGiftActions() {
  const [fetchShip] = giftApi.endpoints.getGiftShip.useLazyQuery();
  const [grantShipGifts] = useGrantShipGiftsMutation();
  const [revokeOrderGift] = useRevokeOrderGiftMutation();

  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  /** Grants one gift per not-yet-gifted sailor. Returns the API's own message. */
  const grantShip = async (imo: string): Promise<string> => {
    setIsGranting(true);
    try {
      const result = await grantShipGifts(imo).unwrap();
      return result.message;
    } finally {
      setIsGranting(false);
    }
  };

  /** Revokes every live gift on the vessel, one carrier order at a time. */
  const revokeShip = async (imo: string, reason: string): Promise<RevokeShipResult> => {
    setIsRevoking(true);
    try {
      // Always re-read rather than trusting a cached list count: the carrier
      // order ids only exist on the detail payload, and another admin may have
      // changed the picture since it was last fetched.
      const detail = await fetchShip(imo).unwrap();
      const carriers = detail.sailors
        .map((sailor) => sailor.gift?.carrier_order_id)
        .filter((id): id is string => Boolean(id));

      let revoked = 0;
      let failed = 0;
      for (const orderId of carriers) {
        try {
          await revokeOrderGift({ orderId, imo, reason }).unwrap();
          revoked += 1;
        } catch {
          // Keep going: one order past `items_collected` shouldn't strand the
          // rest of the crew's gifts in a half-revoked state.
          failed += 1;
        }
      }
      return { revoked, failed };
    } finally {
      setIsRevoking(false);
    }
  };

  return { grantShip, revokeShip, isGranting, isRevoking };
}
