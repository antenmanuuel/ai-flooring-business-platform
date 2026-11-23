import { Route, Routes, useLocation } from 'react-router'
import { useAuth } from './auth/AuthContext'
import AssistantChat from './components/AssistantChat'
import AdminLayout from './components/admin/AdminLayout'
import ClientDetail from './pages/admin/ClientDetail'
import Clients from './pages/admin/Clients'
import Products from './pages/admin/Products'
import Quotes from './pages/admin/Quotes'
import Requests from './pages/admin/Requests'
import ComingSoon from './pages/admin/ComingSoon'
import ClientAccount from './pages/ClientAccount'
import ClientDashboard from './pages/ClientDashboard'
import ClientProject from './pages/ClientProject'
import Overview from './pages/admin/Overview'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import RequestQuote from './pages/RequestQuote'

const adminSections = ['Orders', 'Bills', 'Reports']

// Pages without the website chat: the login and sign-up forms, and Anna's dashboard (which has its own).
const noChat = (pathname) => pathname === '/login' || pathname === '/register' || pathname.startsWith('/admin')

function App() {
  const { pathname } = useLocation()
  const { client } = useAuth()
  // A logged-in client gets the assistant that also knows their own projects.
  const chatVariant = client?.role === 'client' ? 'client' : 'public'
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/client/request" element={<RequestQuote />} />
        <Route path="/client/requests/:id" element={<ClientProject />} />
        <Route path="/client/account" element={<ClientAccount />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="clients" element={<Clients />} />
          <Route path="products" element={<Products />} />
          <Route path="requests" element={<Requests />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          {adminSections.map((title) => (
            <Route key={title} path={title.toLowerCase()} element={<ComingSoon title={title} />} />
          ))}
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* The AI assistant. The key starts a new conversation when someone logs in or out. */}
      {!noChat(pathname) && <AssistantChat key={chatVariant} variant={chatVariant} />}
    </>
  )
}

export default App
