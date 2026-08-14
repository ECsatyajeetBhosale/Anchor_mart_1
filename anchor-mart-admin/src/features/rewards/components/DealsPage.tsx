import { PageHeader } from "@/components/common/PageHeader";
import { MESSAGES } from "@/lib/messages";
import { DealsTab } from "./DealsTab";

/**
 * Deal of the Day, on its own route.
 *
 * Was a tab of Rewards & Coupons. It is a promotion in its own right — daily
 * offers scheduled and priced independently of the loyalty programme and the
 * coupon book — so it sits beside Surprise Gifts in Marketing rather than behind
 * a tab on a screen about points and discount codes.
 */
export function DealsPage() {
  return (
    <div className="page-enter">
      <PageHeader title={MESSAGES.PROMOTION.TABS.DEALS} />
      <DealsTab />
    </div>
  );
}

export default DealsPage;
