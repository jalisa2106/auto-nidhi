import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Public pages
import Home           from './pages/Home'
import Login          from './pages/Login'
import Signup         from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'

// Role router
import RoleBasedRouter  from './pages/RoleBasedRouter'

// ── Customer portal ─────────────────────────────────────────────────
import CustomerLayout             from './pages/CustomerPages/CustomerLayout'
import CustomerPortalPage         from './pages/CustomerPages/CustomerPortalPage'
import CustomerFilesPage          from './pages/CustomerPages/CustomerFilesPage'
import CustomerFileDetailPage     from './pages/CustomerPages/CustomerFileDetailPage'
import CustomerDocumentsPage      from './pages/CustomerPages/CustomerDocumentsPage'
import CustomerPaymentsPage       from './pages/CustomerPages/CustomerPaymentsPage'
import CustomerInsurancePage      from './pages/CustomerPages/CustomerInsurancePage'
import CustomerLoanPage           from './pages/CustomerPages/CustomerLoanPage'
import CustomerProfilePage        from './pages/CustomerPages/CustomerProfilePage'
import CustomerSettingsPage       from './pages/CustomerPages/CustomerSettingsPage'
import CustomerRTOPage            from './pages/CustomerPages/CustomerRTOPage'

// Admin layout (sidebar + topbar + Outlet) — Shared across Admin, Staff, and Accountants
import AdminLayout from './pages/Dashboard/AdminDashboard'

// ── Admin / Shared Staff pages ──────────────────────────────────────
import DashboardPage          from './pages/AdminPages/DashboardPage'
import CustomersPage          from './pages/AdminPages/CustomersPage'
import CustomerDetailPage     from './pages/AdminPages/CustomerDetailPage'
import FilesPage              from './pages/AdminPages/FilesPage'
import PaymentInPage          from './pages/AdminPages/PaymentInPage'
import PaymentOutPage         from './pages/AdminPages/PaymentOutPage'
import CommissionInPage       from './pages/AdminPages/CommissionInPage'
import CommissionOutPage      from './pages/AdminPages/CommissionOutPage'
import RTOPaymentsPage        from './pages/AdminPages/RTOPaymentsPage'
import InsurancePaymentsPage  from './pages/AdminPages/InsurancePaymentsPage'
import ExpensesPage           from './pages/AdminPages/ExpensesPage'
import AdvancesPage           from './pages/AdminPages/AdvancesPage'
import DealersPage            from './pages/AdminPages/DealersPage'
import BrokersPage            from './pages/AdminPages/BrokersPage'
import FinanceBanksPage       from './pages/AdminPages/FinanceBanksPage'
import InsuranceCompaniesPage from './pages/AdminPages/InsuranceCompaniesPage'
import InsuranceTypesPage     from './pages/AdminPages/InsuranceTypesPage'
import ExpenseCategoriesPage  from './pages/AdminPages/ExpenseCategoriesPage'
import CompanySettingsPage    from './pages/AdminPages/CompanySettingsPage'
import BankAccountsPage       from './pages/AdminPages/BankAccountsPage'
import UsersPage              from './pages/AdminPages/UsersPage'
import LoansPage              from './pages/AdminPages/LoansPage'
import AdminProfilePage       from './pages/AdminPages/AdminProfilePage'
import AdminSettingsPage      from './pages/AdminPages/AdminSettingsPage'
import StaffPage              from './pages/AdminPages/StaffPage'
import AccountantsPage        from './pages/AdminPages/AccountantsPage'
import UserDetailPage         from './pages/AdminPages/UserDetailPage'
import RequestsPage           from './pages/DataEntryPages/RequestsPage'

// ── ⚡ NEW INJECTIONS: Operational Override Pages ────────────────────
import StaffModificationsPage      from './pages/DataEntryPages/StaffModificationsPage'
import AccountantModificationsPage from './pages/AccountantPages/AccountantModificationsPage'
import AdminReviewDeskPage         from './pages/AdminPages/AdminReviewDeskPage'

function App() {
  return (
    <BrowserRouter>
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
          <Route path="/staff/dashboard"          element={<DashboardPage />}         />
          <Route path="/staff/customers"          element={<CustomersPage />}         />
          <Route path="/staff/files"              element={<FilesPage />}             />
          <Route path="/staff/payments/in"        element={<PaymentInPage />}         />
          <Route path="/staff/payments/out"       element={<PaymentOutPage />}        />
          <Route path="/staff/rto-payments"       element={<RTOPaymentsPage />}       />
          <Route path="/staff/insurance-payments" element={<InsurancePaymentsPage />} />
          <Route path="/staff/expenses"           element={<ExpensesPage />}           />
          <Route path="/staff/requests"           element={<RequestsPage />}           />
          {/* ⚡ NEW: Staff Data Entry Modification Route */}
          <Route path="/staff/modifications"      element={<StaffModificationsPage />} />
          <Route path="/staff/profile"            element={<AdminProfilePage />}      />
          <Route path="/staff/settings"           element={<AdminSettingsPage />}     />
        </Route>

        {/* ── Accountant portal ── */}
        <Route element={<AdminLayout />}>
          <Route path="/accountant/dashboard"          element={<DashboardPage />}              />
          <Route path="/accountant/files"              element={<FilesPage />}                  />
          <Route path="/accountant/payments/in"        element={<PaymentInPage />}              />
          <Route path="/accountant/payments/out"       element={<PaymentOutPage />}             />
          <Route path="/accountant/rto-payments"       element={<RTOPaymentsPage />}            />
          <Route path="/accountant/insurance-payments" element={<InsurancePaymentsPage />}      />
          <Route path="/accountant/expenses"           element={<ExpensesPage />}               />
          <Route path="/accountant/advances"           element={<AdvancesPage />}               />
          {/* ⚡ NEW: Accountant Ledger Override Correction Route */}
          <Route path="/accountant/modifications"      element={<AccountantModificationsPage />} />
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
          {/* ⚡ NEW: Centralized Admin Review Check Desk Route */}
          <Route path="/admin/review-desk"           element={<AdminReviewDeskPage />}    />
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
          <Route path="/admin/settings"              element={<AdminSettingsPage />}     />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App