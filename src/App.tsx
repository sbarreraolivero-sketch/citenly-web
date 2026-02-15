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
import Pricing from './pages/Pricing'
import Login from './pages/Login'
import Register from './pages/Register'
import Landing from './pages/Landing'
import ForgotPassword from './pages/ForgotPassword'
import UpdatePassword from './pages/UpdatePassword'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import { SubscriptionGuard } from './components/auth/SubscriptionGuard'

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
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
                                <CRM />
                            </SubscriptionGuard>
                        } />
                        <Route path="campaigns" element={
                            <SubscriptionGuard>
                                <Campaigns />
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
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App
