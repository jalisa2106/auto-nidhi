// Staff Insurance Payments page — re-uses the admin InsurancePaymentsPage with delete disabled.
// forceAdmin={false} hides all admin-only controls (delete button).
import AdminInsurancePaymentsPage from '../AdminPages/InsurancePaymentsPage'

export default function InsurancePaymentsPage() {
  return <AdminInsurancePaymentsPage forceAdmin={false} />
}
