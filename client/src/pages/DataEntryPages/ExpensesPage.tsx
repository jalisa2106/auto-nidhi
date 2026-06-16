// Staff Expenses page — re-uses the admin ExpensesPage with delete/edit disabled.
// forceAdmin={false} hides the Add Expense button and all admin-only controls.
// Staff can VIEW expenses only — creation/deletion is admin-only.
import AdminExpensesPage from '../AdminPages/ExpensesPage'

export default function ExpensesPage() {
  return <AdminExpensesPage forceAdmin={false} />
}
