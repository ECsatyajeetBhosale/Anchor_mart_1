// Central opener hook: pages call ui.addSailor(), ui.orderDetail(o), etc. — decoupled from
// each modal's internals. Each opener mounts the real ported component via the modal/drawer context.
import { useToast } from '../../context/ToastContext'
import { useModal } from '../../context/ModalContext'
import { useDrawer } from '../../context/DrawerContext'

import { AddSailorModal } from './AddSailorModal'
import { AddProductModal } from './AddProductModal'
import { AddSpareModal } from './AddSpareModal'
import { AssignPartnerModal } from './AssignPartnerModal'
import { AddPartnerModal } from './AddPartnerModal'
import { AddCouponModal } from './AddCouponModal'
import { ConfigurePointsModal } from './ConfigurePointsModal'
import { SendNotifModal } from './SendNotifModal'
import { AddNotificationModal } from './AddNotificationModal'
import { ReviewIntentModal } from './ReviewIntentModal'
import { SubstituteModal } from './SubstituteModal'
import { SellerReviewModal } from './SellerReviewModal'
import { SellerDetailModal } from './SellerDetailModal'
import { ItemDetailModal } from './ItemDetailModal'
import { NotifySailorModal } from './NotifySailorModal'
import { NewTicketModal } from './NewTicketModal'
import { OrderDetailDrawer } from '../drawers/OrderDetailDrawer'
import { ProfileDrawer } from '../drawers/ProfileDrawer'
import { TicketDrawer } from '../drawers/TicketDrawer'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any

export function useUi() {
  const toast = useToast()
  const modal = useModal()
  const drawer = useDrawer()

  return {
    // primitives
    toast,
    confirm: modal.confirm,
    closeModal: modal.close,
    closeDrawer: drawer.close,

    // modal openers
    addSailor: (data?: Any) => modal.open(<AddSailorModal data={data} />),
    addProduct: (opts?: Any) => modal.open(<AddProductModal opts={opts} />),
    addSpare: (data?: Any) => modal.open(<AddSpareModal data={data} />),
    assignPartner: (orderId?: string) => modal.open(<AssignPartnerModal orderId={orderId} />),
    addPartner: (data?: Any) => modal.open(<AddPartnerModal data={data} />),
    addCoupon: (data?: Any) => modal.open(<AddCouponModal data={data} />),
    configurePoints: () => modal.open(<ConfigurePointsModal />),
    sendNotif: (prefill?: Any) => modal.open(<SendNotifModal prefill={prefill} />),
    addNotification: () => modal.open(<AddNotificationModal />),
    reviewIntent: (intent?: Any) => modal.open(<ReviewIntentModal intent={intent} />),
    substitute: (item?: Any) => modal.open(<SubstituteModal item={item} />),
    sellerReview: (seller?: Any, approve?: boolean) => modal.open(<SellerReviewModal seller={seller} approve={approve} />),
    sellerDetail: (s?: Any) => modal.open(<SellerDetailModal s={s} />),
    itemDetail: (enq?: Any) => modal.open(<ItemDetailModal enq={enq} />),
    notifySailor: (ref?: string) => modal.open(<NotifySailorModal refId={ref} />),
    newTicket: () => modal.open(<NewTicketModal />),

    // drawer openers
    orderDetail: (order?: Any) => drawer.openNode(<OrderDetailDrawer order={order} />),
    profile: (name?: string, role?: string) => drawer.openNode(<ProfileDrawer name={name} role={role} />),
    ticket: (ticket?: Any) => drawer.openNode(<TicketDrawer ticket={ticket} />),
  }
}
