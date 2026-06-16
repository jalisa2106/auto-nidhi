// Staff Payment OUT page — re-uses the admin PaymentOutPage with delete/edit disabled.
// forceAdmin={false} hides all admin-only controls (delete button, bulk actions).
import AdminPaymentOutPage from '../AdminPages/PaymentOutPage'

export default function PaymentOutPage() {
  return <AdminPaymentOutPage forceAdmin={false} />
}