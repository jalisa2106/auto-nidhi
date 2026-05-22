import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Public pages
import Home   from './pages/Home'
import Login  from './pages/Login'
import Signup from './pages/Signup'

// Role router + Customer dashboard
import RoleBasedRouter  from './pages/RoleBasedRouter'
import CustomerDashboard from './pages/Dashboard/CustomerDashboard'

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/"       element={<Home />}   />
        <Route path="/login"  element={<Login />}  />
        <Route path="/signup" element={<Signup />} />

        {/* ── Customer portal ── */}
        <Route path="/customer" element={<CustomerDashboard />} />

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
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App