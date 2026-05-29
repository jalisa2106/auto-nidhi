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
import CustomerProfilePage        from './pages/CustomerPages/CustomerProfilePage'
import CustomerSettingsPage       from './pages/CustomerPages/CustomerSettingsPage'

// ── Data Entry pages ─────────────────────────────────────────────────
import DataEntryLayout             from './pages/DataEntryPages/DataEntryLayout'
import DataEntryDashboard          from './pages/DataEntryPages/DashboardPage'
import DataEntryCustomers          from './pages/DataEntryPages/CustomersPage'
import DataEntryFiles              from './pages/DataEntryPages/FilesPage'
import DataEntryRTOPayments        from './pages/DataEntryPages/RTOPaymentsPage'
import DataEntryInsurancePayments  from './pages/DataEntryPages/InsurancePaymentsPage'
import DataEntryExpenses           from './pages/DataEntryPages/ExpensesPage'
import DataEntryPaymentInPage from './pages/DataEntryPages/PaymentInPage'
import DataEntryPaymentOutPage from './pages/DataEntryPages/PaymentOutPage'

// ── Accountant pages ─────────────────────────────────────────────────
import AccountantLayout         from './pages/AccountantPages/AccountantLayout'
import AccountantDashboard      from './pages/AccountantPages/DashboardPage'
import AccountantFiles          from './pages/AccountantPages/FilesPage'
import AccountantPaymentIn      from './pages/AccountantPages/PaymentInPage'
import AccountantPaymentOut     from './pages/AccountantPages/PaymentOutPage'
import AccountantExpenses       from './pages/AccountantPages/ExpensesPage'
import AccountantAdvances       from './pages/AccountantPages/AdvancesPage'
import AccountantRTOPayments    from './pages/AccountantPages/RTOPaymentsPage'
import AccountantInsurancePayments from './pages/AccountantPages/InsurancePaymentsPage'

// Admin layout (sidebar + topbar + Outlet)
import AdminLayout from './pages/Dashboard/AdminDashboard'

// ── Admin pages ─────────────────────────────────────────────────────
import DashboardPage          from './pages/AdminPages/DashboardPage'
import CustomersPage          from './pages/AdminPages/CustomersPage'
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/"                 element={<Home />}           />
        <Route path="/login"            element={<Login />}          />
        <Route path="/signup"           element={<Signup />}         />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />}  />

        {/* ── Customer portal (sidebar layout) ── */}
        <Route element={<CustomerLayout />}>
          <Route path="/portal"               element={<CustomerPortalPage />}        />
          <Route path="/portal/files"          element={<CustomerFilesPage />}         />
          <Route path="/portal/files/:id"      element={<CustomerFileDetailPage />}    />
          <Route path="/portal/documents"      element={<CustomerDocumentsPage />}     />
          <Route path="/portal/payments"       element={<CustomerPaymentsPage />}      />
          <Route path="/portal/insurance"      element={<CustomerInsurancePage />}     />
          <Route path="/portal/profile"        element={<CustomerProfilePage />}       />
          <Route path="/portal/settings"       element={<CustomerSettingsPage />}      />
        </Route>

        {/* ── Data Entry portal ── */}
        <Route element={<DataEntryLayout />}>
          <Route path="/data-entry/dashboard"            element={<DataEntryDashboard />} />
          <Route path="/data-entry/customers"            element={<DataEntryCustomers />} />
          <Route path="/data-entry/files"                element={<DataEntryFiles />} />
          <Route path="/data-entry/rto-payments"         element={<DataEntryRTOPayments />} />
          <Route path="/data-entry/insurance-payments"   element={<DataEntryInsurancePayments />} />
          <Route path="/data-entry/expenses"             element={<DataEntryExpenses />} />
          <Route path="/data-entry/payments/in"      element={<DataEntryPaymentInPage />} />
          <Route path="/data-entry/payments/out"      element={<DataEntryPaymentOutPage />} />
        </Route>

        {/* ── Accountant portal ── */}
        <Route element={<AccountantLayout />}>
          <Route path="/accountant/dashboard"          element={<AccountantDashboard />} />
          <Route path="/accountant/files"              element={<AccountantFiles />} />
          <Route path="/accountant/payments/in"        element={<AccountantPaymentIn />} />
          <Route path="/accountant/payments/out"       element={<AccountantPaymentOut />} />
          <Route path="/accountant/rto-payments"       element={<AccountantRTOPayments />} />
          <Route path="/accountant/insurance-payments" element={<AccountantInsurancePayments />} />
          <Route path="/accountant/expenses"           element={<AccountantExpenses />} />
          <Route path="/accountant/advances"           element={<AccountantAdvances />} />
        </Route>

        {/* ── Role-based redirect on /dashboard ── */}
        <Route path="/dashboard-redirect" element={<RoleBasedRouter />} />

        {/* ── Admin / Staff app (all share the AdminLayout sidebar) ── */}
        <Route element={<AdminLayout />}>
          <Route path="/dashboard"                    element={<DashboardPage />}         />
          <Route path="/customers"                    element={<CustomersPage />}          />
          <Route path="/files"                        element={<FilesPage />}              />
          {/* Finance */}
          <Route path="/payments/in"                  element={<PaymentInPage />}          />
          <Route path="/payments/out"                 element={<PaymentOutPage />}         />
          <Route path="/commissions/in"               element={<CommissionInPage />}       />
          <Route path="/commissions/out"              element={<CommissionOutPage />}      />
          <Route path="/rto-payments"                 element={<RTOPaymentsPage />}        />
          <Route path="/insurance-payments"           element={<InsurancePaymentsPage />}  />
          <Route path="/expenses"                     element={<ExpensesPage />}           />
          <Route path="/advances"                     element={<AdvancesPage />}           />
          <Route path="/loans"                        element={<LoansPage />}              />
          {/* Masters */}
          <Route path="/masters/dealers"              element={<DealersPage />}            />
          <Route path="/masters/brokers"              element={<BrokersPage />}            />
          <Route path="/masters/finance-banks"        element={<FinanceBanksPage />}       />
          <Route path="/masters/insurance-companies"  element={<InsuranceCompaniesPage />} />
          <Route path="/masters/insurance-types"      element={<InsuranceTypesPage />}     />
          <Route path="/masters/expense-categories"   element={<ExpenseCategoriesPage />}  />
          {/* Settings */}
          <Route path="/settings/company"             element={<CompanySettingsPage />}    />
          <Route path="/settings/banks"               element={<BankAccountsPage />}       />
          <Route path="/settings/users"               element={<UsersPage />}              />
          {/* Profile & Account */}
          <Route path="/admin/profile"                element={<AdminProfilePage />}       />
          <Route path="/admin/settings"               element={<AdminSettingsPage />}      />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
