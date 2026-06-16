// Staff RTO Payments page — re-uses the admin RTOPaymentsPage with delete disabled.
// forceAdmin={false} hides all admin-only controls (delete button).
import AdminRTOPaymentsPage from '../AdminPages/RTOPaymentsPage'

export default function RTOPaymentsPage() {
  return <AdminRTOPaymentsPage forceAdmin={false} />
}
