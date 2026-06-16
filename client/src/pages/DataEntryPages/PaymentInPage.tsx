// Staff Payment IN page — re-uses the admin PaymentInPage with delete/edit disabled.
// forceAdmin={false} hides all admin-only controls (delete button, bulk actions).
import AdminPaymentInPage from '../AdminPages/PaymentInPage'

export default function PaymentInPage() {
  return <AdminPaymentInPage forceAdmin={false} />
}