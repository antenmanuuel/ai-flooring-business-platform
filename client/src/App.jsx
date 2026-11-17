import { Route, Routes } from 'react-router'
import AdminLayout from './components/admin/AdminLayout'
import ComingSoon from './pages/admin/ComingSoon'
import Overview from './pages/admin/Overview'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'

const adminSections = ['Requests', 'Quotes', 'Orders', 'Bills', 'Products', 'Clients', 'Reports']

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Overview />} />
        {adminSections.map((title) => (
          <Route key={title} path={title.toLowerCase()} element={<ComingSoon title={title} />} />
        ))}
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
