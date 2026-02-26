import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Messages from './pages/Messages'
import Appointments from './pages/Appointments'
import Patients from './pages/Patients'
import Settings from './pages/Settings'
import KnowledgeBase from './pages/KnowledgeBase'
import CRM from './pages/CRM'
import Campaigns from './pages/Campaigns'
import Finance from './pages/Finance'
import RetentionEngine from './pages/RetentionEngine'
import Templates from './pages/Templates'
import Pricing from './pages/Pricing'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import ForgotPassword from './pages/ForgotPassword'
import UpdatePassword from './pages/UpdatePassword'
import { PendingActivation } from './pages/PendingActivation'
import AdminDashboard from './pages/hq/AdminDashboard'
import AdminClinics from './pages/hq/AdminClinics'
import AdminSettings from './pages/hq/AdminSettings'
import AdminLogin from './pages/hq/AdminLogin'
import AdminCalendar from './pages/hq/AdminCalendar'
import AdminLayout from './components/layout/AdminLayout'
import { AuthProvider } from './contexts/AuthContext'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { SubscriptionGuard } from './components/auth/SubscriptionGuard'
import { AdminProtectedRoute } from './components/auth/AdminProtectedRoute'
import { RoleGuard } from './components/auth/RoleGuard'

// HQ routes use ONLY AdminAuthProvider (no AuthProvider interference)
function HQRoutes() {
    return (
        <AdminAuthProvider>
            <Routes>
                <Route path="login" element={<AdminLogin />} />
                <Route element={<AdminProtectedRoute />}>
                    <Route element={<AdminLayout />}>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="calendar" element={<AdminCalendar />} />
                        <Route path="clinics" element={<AdminClinics />} />
                        <Route path="settings" element={<AdminSettings />} />
                    </Route>
                </Route>
            </Routes>
        </AdminAuthProvider>
    )
}

// Main app routes use AuthProvider for clinic users
function MainRoutes() {
    return (
        <AuthProvider>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/update-password" element={<UpdatePassword />} />
                <Route
                    path="/login"
                    element={
                        <ProtectedRoute requireAuth={false}>
                            <Login />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <ProtectedRoute requireAuth={false}>
                            <Register />
                        </ProtectedRoute>
                    }
                />

                {/* Pending Activation Route */}
                <Route
                    path="/pending-activation"
                    element={
                        <ProtectedRoute requireAuth={true}>
                            <PendingActivation />
                        </ProtectedRoute>
                    }
                />

                {/* Protected Routes */}
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={
                        <SubscriptionGuard>
                            <Dashboard />
                        </SubscriptionGuard>
                    } />
                    <Route path="messages" element={
                        <SubscriptionGuard>
                            <Messages />
                        </SubscriptionGuard>
                    } />
                    <Route path="appointments" element={
                        <SubscriptionGuard>
                            <Appointments />
                        </SubscriptionGuard>
                    } />
                    <Route path="patients" element={
                        <SubscriptionGuard>
                            <Patients />
                        </SubscriptionGuard>
                    } />
                    <Route path="knowledge-base" element={
                        <SubscriptionGuard>
                            <KnowledgeBase />
                        </SubscriptionGuard>
                    } />
                    <Route path="crm" element={
                        <SubscriptionGuard>
                            <RoleGuard allowedRoles={['owner']}>
                                <CRM />
                            </RoleGuard>
                        </SubscriptionGuard>
                    } />
                    <Route path="campaigns" element={
                        <SubscriptionGuard>
                            <RoleGuard allowedRoles={['owner']}>
                                <Campaigns />
                            </RoleGuard>
                        </SubscriptionGuard>
                    } />
                    <Route path="finance" element={
                        <SubscriptionGuard>
                            <RoleGuard allowedRoles={['owner']}>
                                <Finance />
                            </RoleGuard>
                        </SubscriptionGuard>
                    } />
                    <Route path="retention" element={
                        <SubscriptionGuard>
                            <RoleGuard allowedRoles={['owner']}>
                                <RetentionEngine />
                            </RoleGuard>
                        </SubscriptionGuard>
                    } />
                    <Route path="templates" element={
                        <SubscriptionGuard>
                            <RoleGuard allowedRoles={['owner', 'admin']}>
                                <Templates />
                            </RoleGuard>
                        </SubscriptionGuard>
                    } />
                    <Route path="settings" element={<Settings />} />
                </Route>

                {/* Legacy redirects */}
                <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />
                <Route path="/messages" element={<Navigate to="/app/messages" replace />} />
                <Route path="/appointments" element={<Navigate to="/app/appointments" replace />} />
                <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    )
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* HQ routes — completely isolated from AuthProvider */}
                <Route path="/hq/*" element={<HQRoutes />} />

                {/* Everything else — uses AuthProvider */}
                <Route path="/*" element={<MainRoutes />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
