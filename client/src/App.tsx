import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'

// Import your new Router and the new Applications page
import RoleBasedRouter from './pages/RoleBasedRouter' // Make sure path is correct!
import Applications from './pages/Applications'
import Loans        from './pages/Loans'
import CustomerDashboard from './pages/Dashboard/CustomerDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Home />} />
        <Route path="/login"     element={<Login />} />
        <Route path="/signup"    element={<Signup />} />
        
        {/* Use the Role Router so Admins, Accountants, etc. see their own dashboard */}
        <Route path="/dashboard" element={<RoleBasedRouter />} />
        <Route path="/customer"   element={<CustomerDashboard />} />
        
        {/* --- NEW ROUTE --- */}
        {/* When the user clicks Applications in the sidebar, it opens this page */}
        <Route path="/files"     element={<Applications />} />
        <Route path="/loans"     element={<Loans />} />
        
      </Routes>
    </BrowserRouter>
  )
}

export default App