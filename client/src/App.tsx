import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, Component, type ReactNode, type ErrorInfo } from 'react'

// ── Public pages (eager — always needed) ──────────────────────────────
import Home           from './pages/Home'
import Login          from './pages/Login'
import Signup         from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'
import RoleBasedRouter from './pages/RoleBasedRouter'

// ── Layouts (eager — shared shell) ───────────────────────────────────
import CustomerLayout from './pages/CustomerPages/CustomerLayout'
import AdminLayout    from './pages/Dashboard/AdminDashboard'
import DataEntryProfilePage from './pages/DataEntryPages/DataEntryProfilePage'
import DataEntrySettingsPage from './pages/DataEntryPages/DataEntrySettingsPage'

// ── Customer portal (lazy) ────────────────────────────────────────────
const CustomerPortalPage     = lazy(() => import('./pages/CustomerPages/CustomerPortalPage'))
const CustomerFilesPage      = lazy(() => import('./pages/CustomerPages/CustomerFilesPage'))
const CustomerFileDetailPage = lazy(() => import('./pages/CustomerPages/CustomerFileDetailPage'))
const CustomerDocumentsPage  = lazy(() => import('./pages/CustomerPages/CustomerDocumentsPage'))
const CustomerPaymentsPage   = lazy(() => import('./pages/CustomerPages/CustomerPaymentsPage'))
const CustomerInsurancePage  = lazy(() => import('./pages/CustomerPages/CustomerInsurancePage'))
const CustomerLoanPage       = lazy(() => import('./pages/CustomerPages/CustomerLoanPage'))
const CustomerProfilePage    = lazy(() => import('./pages/CustomerPages/CustomerProfilePage'))
const CustomerSettingsPage   = lazy(() => import('./pages/CustomerPages/CustomerSettingsPage'))
const CustomerRTOPage        = lazy(() => import('./pages/CustomerPages/CustomerRTOPage'))

// ── Admin / Staff / Accountant pages (lazy) ───────────────────────────
const DashboardPage          = lazy(() => import('./pages/AdminPages/DashboardPage'))
const CustomersPage          = lazy(() => import('./pages/AdminPages/CustomersPage'))
const CustomerDetailPage     = lazy(() => import('./pages/AdminPages/CustomerDetailPage'))
const FilesPage              = lazy(() => import('./pages/AdminPages/FilesPage'))
const PaymentInPage          = lazy(() => import('./pages/AdminPages/PaymentInPage'))
const PaymentOutPage         = lazy(() => import('./pages/AdminPages/PaymentOutPage'))
const CommissionInPage       = lazy(() => import('./pages/AdminPages/CommissionInPage'))
const CommissionOutPage      = lazy(() => import('./pages/AdminPages/CommissionOutPage'))
const RTOPaymentsPage        = lazy(() => import('./pages/AdminPages/RTOPaymentsPage'))
const InsurancePaymentsPage  = lazy(() => import('./pages/AdminPages/InsurancePaymentsPage'))
const ExpensesPage           = lazy(() => import('./pages/AdminPages/ExpensesPage'))
const AdvancesPage           = lazy(() => import('./pages/AdminPages/AdvancesPage'))
const DealersPage            = lazy(() => import('./pages/AdminPages/DealersPage'))
const BrokersPage            = lazy(() => import('./pages/AdminPages/BrokersPage'))
const FinanceBanksPage       = lazy(() => import('./pages/AdminPages/FinanceBanksPage'))
const InsuranceCompaniesPage = lazy(() => import('./pages/AdminPages/InsuranceCompaniesPage'))
const InsuranceTypesPage     = lazy(() => import('./pages/AdminPages/InsuranceTypesPage'))
const ExpenseCategoriesPage  = lazy(() => import('./pages/AdminPages/ExpenseCategoriesPage'))
const CompanySettingsPage    = lazy(() => import('./pages/AdminPages/CompanySettingsPage'))
const BankAccountsPage       = lazy(() => import('./pages/AdminPages/BankAccountsPage'))
const UsersPage              = lazy(() => import('./pages/AdminPages/UsersPage'))
const LoansPage              = lazy(() => import('./pages/AdminPages/LoansPage'))
const AdminProfilePage       = lazy(() => import('./pages/AdminPages/AdminProfilePage'))
const AdminSettingsPage      = lazy(() => import('./pages/AdminPages/AdminSettingsPage'))
const StaffPage              = lazy(() => import('./pages/AdminPages/StaffPage'))
const AccountantsPage        = lazy(() => import('./pages/AdminPages/AccountantsPage'))
const UserDetailPage         = lazy(() => import('./pages/AdminPages/UserDetailPage'))
const RequestsPage           = lazy(() => import('./pages/DataEntryPages/RequestsPage'))
const StaffModificationsPage      = lazy(() => import('./pages/DataEntryPages/StaffModificationsPage'))
const AccountantModificationsPage = lazy(() => import('./pages/AccountantPages/AccountantModificationsPage'))
const AccountantPaymentInPage     = lazy(() => import('./pages/AccountantPages/PaymentInPage'))
const AccountantPaymentOutPage    = lazy(() => import('./pages/AccountantPages/PaymentOutPage'))
const AdminReviewDeskPage    = lazy(() => import('./pages/AdminPages/AdminReviewDeskPage'))
const AnalyticsPage          = lazy(() => import('./pages/AdminPages/AnalyticsPage'))

const DataEntryDashboardPage = lazy(() => import('./pages/DataEntryPages/DataEntryDashboardPage'))
const DataEntryCustomersPage = lazy(() => import('./pages/DataEntryPages/CustomersPage'))
const DataEntryFilesPage     = lazy(() => import('./pages/DataEntryPages/FilesPage'))
const DataEntryCommissionInPage  = lazy(() => import('./pages/DataEntryPages/CommissionInPage'))
const DataEntryCommissionOutPage = lazy(() => import('./pages/DataEntryPages/CommissionOutPage'))


// ── Loading fallback ──────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: 'var(--gray-400)', fontSize: '0.9rem', gap: 10,
    }}>
      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
      Loading…
    </div>
  )
}

// ── Global Error Boundary — prevents one bad page crashing the app ────
interface EBState { hasError: boolean; error?: Error }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false }
  static getDerivedStateFromError(error: Error): EBState { return { hasError: true, error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '60px 24px', textAlign: 'center',
          color: 'var(--gray-600)', maxWidth: 500, margin: '0 auto',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ marginBottom: 24, fontSize: '0.9rem' }}>
            {this.state.error?.message || 'An unexpected error occurred on this page.'}
          </p>
          <button
            style={{
              padding: '10px 22px', background: 'var(--brand-600)', color: '#fff',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
            }}
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
          >
            Go to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/"                element={<Home />}           />
            <Route path="/login"           element={<Login />}          />
            <Route path="/signup"          element={<Signup />}         />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />}  />

            {/* ── Customer portal ── */}
            <Route element={<CustomerLayout />}>
              <Route path="/portal"            element={<CustomerPortalPage />}     />
              <Route path="/portal/files"      element={<CustomerFilesPage />}      />
              <Route path="/portal/files/:id"  element={<CustomerFileDetailPage />} />
              <Route path="/portal/documents"  element={<CustomerDocumentsPage />}  />
              <Route path="/portal/payments"   element={<CustomerPaymentsPage />}   />
              <Route path="/portal/insurance"  element={<CustomerInsurancePage />}  />
              <Route path="/portal/loans"      element={<CustomerLoanPage />}       />
              <Route path="/portal/rto"        element={<CustomerRTOPage />}        />
              <Route path="/portal/profile"    element={<CustomerProfilePage />}    />
              <Route path="/portal/settings"   element={<CustomerSettingsPage />}   />
            </Route>

            {/* ── Staff portal ── */}
            <Route element={<AdminLayout />}>
              <Route path="/staff/dashboard"          element={<DataEntryDashboardPage />}         />
              <Route path="/staff/customers"          element={<DataEntryCustomersPage />}         />
              <Route path="/staff/customers/:id"      element={<CustomerDetailPage />}             />
              <Route path="/staff/files"              element={<DataEntryFilesPage />}             />
              <Route path="/staff/payments/in"        element={<PaymentInPage />}         />
              <Route path="/staff/payments/out"       element={<PaymentOutPage />}        />
              <Route path="/staff/commission/in"      element={<DataEntryCommissionInPage />}      />
              <Route path="/staff/commission/out"     element={<DataEntryCommissionOutPage />}     />
              <Route path="/staff/rto-payments"       element={<RTOPaymentsPage />}       />
              <Route path="/staff/insurance-payments" element={<InsurancePaymentsPage />} />
              <Route path="/staff/expenses"           element={<ExpensesPage />}          />
              <Route path="/staff/requests"           element={<RequestsPage />}          />
              <Route path="/staff/modifications"      element={<StaffModificationsPage />}/>
              <Route path="/staff/profile"            element={<DataEntryProfilePage />}  />
              <Route path="/staff/settings"           element={<DataEntrySettingsPage />} />
            </Route>

            {/* ── Accountant portal ── */}
            <Route element={<AdminLayout />}>
              <Route path="/accountant/dashboard"          element={<DashboardPage />}              />
              <Route path="/accountant/files"              element={<FilesPage />}                  />
              <Route path="/accountant/payments/in"        element={<AccountantPaymentInPage />}    />
              <Route path="/accountant/payments/out"       element={<AccountantPaymentOutPage />}   />
              <Route path="/accountant/rto-payments"       element={<RTOPaymentsPage />}            />
              <Route path="/accountant/insurance-payments" element={<InsurancePaymentsPage />}      />
              <Route path="/accountant/expenses"           element={<ExpensesPage />}               />
              <Route path="/accountant/advances"           element={<AdvancesPage />}               />
              <Route path="/accountant/modifications"      element={<AccountantModificationsPage />}/>
              <Route path="/accountant/profile"            element={<AdminProfilePage />}           />
              <Route path="/accountant/settings"           element={<AdminSettingsPage />}          />
            </Route>

            {/* ── Role-based redirect ── */}
            <Route path="/dashboard-redirect" element={<RoleBasedRouter />} />

            {/* ── Admin ── */}
            <Route element={<AdminLayout />}>
              <Route path="/dashboard"                   element={<DashboardPage />}          />
              <Route path="/customers"                   element={<CustomersPage />}          />
              <Route path="/customers/:id"               element={<CustomerDetailPage />}     />
              <Route path="/files"                       element={<FilesPage />}              />
              <Route path="/payments/in"                 element={<PaymentInPage />}          />
              <Route path="/payments/out"                element={<PaymentOutPage />}         />
              <Route path="/commissions/in"              element={<CommissionInPage />}       />
              <Route path="/commissions/out"             element={<CommissionOutPage />}      />
              <Route path="/rto-payments"                element={<RTOPaymentsPage />}        />
              <Route path="/insurance-payments"          element={<InsurancePaymentsPage />}  />
              <Route path="/expenses"                    element={<ExpensesPage />}           />
              <Route path="/advances"                    element={<AdvancesPage />}           />
              <Route path="/loans"                       element={<LoansPage />}              />
              <Route path="/admin/review-desk"           element={<AdminReviewDeskPage />}    />
              <Route path="/analytics"                   element={<AnalyticsPage />}          />
              <Route path="/masters/dealers"             element={<DealersPage />}            />
              <Route path="/masters/brokers"             element={<BrokersPage />}            />
              <Route path="/masters/finance-banks"       element={<FinanceBanksPage />}       />
              <Route path="/masters/insurance-companies" element={<InsuranceCompaniesPage />} />
              <Route path="/masters/insurance-types"     element={<InsuranceTypesPage />}     />
              <Route path="/masters/expense-categories"  element={<ExpenseCategoriesPage />}  />
              <Route path="/settings/company"            element={<CompanySettingsPage />}    />
              <Route path="/settings/banks"              element={<BankAccountsPage />}       />
              <Route path="/settings/users"              element={<UsersPage />}              />
              <Route path="/settings/staff"              element={<StaffPage />}              />
              <Route path="/settings/staff/:id"          element={<UserDetailPage />}         />
              <Route path="/settings/accountants"        element={<AccountantsPage />}        />
              <Route path="/settings/accountants/:id"    element={<UserDetailPage />}         />
              <Route path="/admin/profile"               element={<AdminProfilePage />}       />
              <Route path="/admin/settings"              element={<AdminSettingsPage />}      />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App