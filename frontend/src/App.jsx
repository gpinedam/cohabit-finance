import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import { AuthProvider, useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import History from './pages/History'
import Home from './pages/Home'
import Personal from './pages/Personal'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Recurring from './pages/Recurring'
import SetupPin from './pages/SetupPin'
import Splits from './pages/Splits'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

function AppShell({ children }) {
  return (
    <div className="relative min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        <span className="text-4xl animate-pulse">💰</span>
      </div>
    )
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/setup-pin"
        element={
          <ProtectedRoute>
            <SetupPin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell><Home /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell><Dashboard /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <AppShell><Expenses /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses/:id"
        element={
          <ProtectedRoute>
            <AppShell><Splits /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppShell><History /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell><Profile /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recurring"
        element={
          <ProtectedRoute>
            <AppShell><Recurring /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/personal"
        element={
          <ProtectedRoute>
            <AppShell><Personal /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
