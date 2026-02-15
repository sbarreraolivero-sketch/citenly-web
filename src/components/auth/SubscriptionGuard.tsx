
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
            const isActive = subscription?.status === 'active'

            // Check if trial expired based on date
            const trialExpired = isTrial && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) < new Date()

            // Period expired check (optional, usually handled by status update)
            // const periodExpired = isActive && subscription?.current_period_end && new Date(subscription.current_period_end) < new Date()

            if (!subscription || (!isActive && !isTrial) || trialExpired) {
                // If fallback provided, don't redirect, just let parent decide (or render fallback)
                if (!fallback) {
                    navigate('/settings?tab=subscription', {
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
    const isActive = subscription?.status === 'active'
    const trialExpired = isTrial && subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) < new Date() : false

    if (!subscription || (!isActive && !isTrial) || trialExpired) {
        if (fallback) return <>{fallback}</>
        return null // Will redirect in useEffect
    }

    return <>{children}</>
}
