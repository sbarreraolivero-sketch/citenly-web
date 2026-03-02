
import { useEffect, ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface SubscriptionGuardProps {
    children: ReactNode
    fallback?: ReactNode
}

export function SubscriptionGuard({ children, fallback }: SubscriptionGuardProps) {
    const { subscription, loading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        if (!loading) {
            const isTrial = subscription?.status === 'trial'
            const isActive = subscription?.status === 'active' || (subscription?.status as string) === 'converted'

            // Check if trial expired based on date
            const trialExpired = isTrial && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < new Date()

            if (!subscription || (!isActive && !isTrial) || trialExpired) {
                // If fallback provided, don't redirect, just let parent decide (or render fallback)
                if (!fallback && location.pathname !== '/app/settings') {
                    navigate('/app/settings?tab=subscription', {
                        state: {
                            from: location.pathname,
                            message: 'Tu suscripción ha expirado. Por favor actualiza tu plan para continuar.'
                        }
                    })
                }
            }
        }
    }, [subscription, loading, navigate, location, fallback])

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><LoadingSpinner /></div>
    }

    const isTrial = subscription?.status === 'trial'
    const isActive = subscription?.status === 'active' || (subscription?.status as string) === 'converted'
    const trialExpired = isTrial && subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) < new Date() : false

    if (!subscription || (!isActive && !isTrial) || trialExpired) {
        if (fallback) return <>{fallback}</>
        if (location.pathname === '/app/settings') return <>{children}</> // allow settings route
        return null // Will redirect in useEffect
    }

    return <>{children}</>
}
