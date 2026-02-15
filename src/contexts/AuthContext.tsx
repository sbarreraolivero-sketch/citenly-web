import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { teamService, type ClinicMember } from '@/services/teamService'

interface UserProfile {
    id: string
    email: string
    full_name: string
    clinic_id: string
    role: 'admin' | 'staff' | 'super_admin'
    avatar_url?: string
}

type Subscription = Database['public']['Tables']['subscriptions']['Row']

interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    member: ClinicMember | null
    subscription: Subscription | null
    session: Session | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>
    signUp: (email: string, password: string, fullName: string, clinicName: string, selectedPlan: string) => Promise<{ error: Error | null }>
    signOut: () => Promise<void>
    connectGoogleCalendar: () => Promise<{ error: Error | null }>
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [member, setMember] = useState<ClinicMember | null>(null)
    const [subscription, setSubscription] = useState<Subscription | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    // Constants
    const PROFILE_STORAGE_KEY = 'citenly_user_profile'
    const SUBSCRIPTION_STORAGE_KEY = 'citenly_user_subscription'

    // Fetch user profile from database with retry logic
    const fetchProfile = async (userId: string, retries = 3, delay = 500) => {
        try {
            for (let i = 0; i < retries; i++) {
                try {
                    const fetchPromise = supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', userId)
                        .single()

                    // Reduced timeout to 3s per attempt (fast failure is better than hanging)
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
                    )

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

                    if (!error && data) {
                        // Cache successful profile
                        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data))
                        return data as UserProfile
                    }

                    // If error is not a connection error (e.g. Row not found), don't retry
                    if (error && error.code === 'PGRST116') {
                        console.error('Profile not found for user:', userId)
                        return null
                    }

                    console.warn(`Attempt ${i + 1} failed to fetch profile. Retrying in ${delay}ms...`)
                } catch (err) {
                    console.warn(`Attempt ${i + 1} exception:`, err)
                }

                // Wait before next retry
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay))
                    // Exponential backoff
                    delay *= 2
                }
            }

            console.error('All retry attempts failed to fetch profile')
            return null
        } catch (error) {
            console.error('Fetch profile exception:', error)
            return null
        }
    }

    // Fetch subscription status
    const fetchSubscription = async (clinicId: string) => {
        try {
            const fetchPromise = supabase
                .from('subscriptions')
                .select('*')
                .eq('clinic_id', clinicId)
                .single()

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Subscription fetch timeout')), 5000)
            )

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

            if (error) {
                console.error('Error fetching subscription:', error)
                return null
            }

            if (!error && data) {
                localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(data))
                return data as Subscription
            }
            return null
        } catch (error) {
            console.error('Fetch subscription exception:', error)
            return null
        }
    }

    // Listen for auth changes
    // Listen for auth changes
    useEffect(() => {
        let mounted = true

        // Failsafe: Force loading to false after 6 seconds
        const loadingTimeout = setTimeout(() => {
            console.warn('Auth initialization timeout - forcing loading to false')
            setLoading(false)
        }, 6000)

        // Initial session check
        const initializeAuth = async () => {
            try {
                // 1. Try to load from cache FIRST for instant UI
                const cachedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
                let hasCachedProfile = false

                if (cachedProfile) {
                    try {
                        const parsed = JSON.parse(cachedProfile)
                        if (mounted) {
                            setProfile(parsed)
                            hasCachedProfile = true
                        }
                    } catch (e) {
                        console.error('Error parsing cached profile', e)
                        localStorage.removeItem(PROFILE_STORAGE_KEY)
                    }
                }

                // 2. Load cached subscription
                const cachedSub = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY)
                let hasCachedSub = false

                if (cachedSub) {
                    try {
                        const parsed = JSON.parse(cachedSub)
                        if (mounted) {
                            setSubscription(parsed)
                            hasCachedSub = true
                        }
                    } catch (e) {
                        console.error('Error parsing cached subscription', e)
                        localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY)
                    }
                }

                // 3. Check actual Supabase session (Fast, local)
                const { data: { session }, error } = await supabase.auth.getSession()
                if (!mounted) return

                if (error) {
                    console.error('Error getting session:', error)
                }

                if (session?.user) {
                    setSession(session)
                    setUser(session.user)

                    if (session?.provider_token) {
                        supabase.functions.invoke('store-google-tokens', {
                            body: {
                                access_token: session.provider_token,
                                refresh_token: session.provider_refresh_token || null,
                                expires_in: 3600,
                            },
                        }).catch(err => console.error('Error storing tokens:', err))
                    }

                    if (hasCachedProfile && hasCachedSub && mounted) {
                        setLoading(false)
                        clearTimeout(loadingTimeout)
                    }

                    const profilePromise = fetchProfile(session.user.id)

                    if (!hasCachedProfile) {
                        try {
                            const data = await profilePromise
                            if (mounted && data) {
                                setProfile(data)
                                if (data.clinic_id) {
                                    const [sub, mem] = await Promise.all([
                                        fetchSubscription(data.clinic_id),
                                        teamService.getCurrentMember()
                                    ])
                                    if (mounted) {
                                        setSubscription(sub)
                                        setMember(mem)
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Error fetching profile during init:', e)
                        }
                    } else {
                        profilePromise.then(async (data) => {
                            if (mounted && data) {
                                setProfile(data)
                                if (data?.clinic_id) {
                                    const [sub, mem] = await Promise.all([
                                        fetchSubscription(data.clinic_id),
                                        teamService.getCurrentMember()
                                    ])
                                    if (mounted) {
                                        setSubscription(sub)
                                        setMember(mem)
                                    }
                                }
                            }
                        }).catch(err => console.error('Background profile refresh failed', err))
                    }
                } else {
                    localStorage.removeItem(PROFILE_STORAGE_KEY)
                    localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY)
                }
            } catch (error) {
                console.error('Auth initialization exception:', error)
            } finally {
                if (mounted) {
                    setLoading(false)
                    clearTimeout(loadingTimeout)
                }
            }
        }

        initializeAuth()

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return

                console.log('🔐 Auth state change:', _event)
                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user) {
                    try {
                        const data = await fetchProfile(session.user.id)
                        if (mounted && data) {
                            setProfile(data)
                            if (data?.clinic_id) {
                                const [sub, mem] = await Promise.all([
                                    fetchSubscription(data.clinic_id),
                                    teamService.getCurrentMember()
                                ])
                                if (mounted) {
                                    setSubscription(sub)
                                    setMember(mem)
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching profile:', err)
                    }
                } else {
                    setProfile(null)
                    setMember(null)
                    setSubscription(null)
                    localStorage.removeItem(PROFILE_STORAGE_KEY)
                    localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY)
                }

                if (mounted) {
                    setLoading(false)
                    clearTimeout(loadingTimeout)
                }
            }
        )

        return () => {
            clearTimeout(loadingTimeout)
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

    // Sign in with email and password
    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) return { error: error as Error | null }

        if (data.user) {
            // Verify profile exists before declaring success
            // This prevents "stuck on loading" state if user exists but profile is missing
            const userProfile = await fetchProfile(data.user.id)

            if (!userProfile) {
                // If no profile, sign out immediately to prevent partial auth state
                await signOut()
                return { error: new Error('No se encontró el perfil de usuario. Contacta a soporte.') }
            }

            // Manually update state to ensure instant UI feedback and avoid race conditions
            // This bridges the gap while onAuthStateChange fires
            setUser(data.user)
            setSession(data.session)
            setProfile(userProfile) // storage already triggered in fetchProfile

            if (userProfile.clinic_id) {
                const sub = await fetchSubscription(userProfile.clinic_id)
                setSubscription(sub)
            }
        }

        return { error: null }
    }

    // Sign up - uses Edge Function to create user, clinic, and profile
    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        clinicName: string,
        selectedPlan: string
    ) => {
        try {
            // Call the signup handler Edge Function
            const { data, error: functionError } = await supabase.functions.invoke('signup-handler', {
                body: {
                    email,
                    password,
                    full_name: fullName,
                    clinic_name: clinicName,
                    selected_plan: selectedPlan,
                }
            })

            if (functionError) {
                console.error('Signup function error:', functionError)
                return { error: new Error(functionError.message || 'Error al crear la cuenta') }
            }

            if (data?.error) {
                return { error: new Error(data.error) }
            }

            // Account created successfully, now sign in
            const { error: signInError } = await signIn(email, password)

            if (signInError) {
                console.error('Auto sign-in error:', signInError)
                // Account was created but auto-login failed
                // User can still log in manually
                return { error: null }
            }

            return { error: null }
        } catch (err) {
            console.error('Signup error:', err)
            return { error: err as Error }
        }
    }

    // Sign out
    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setSubscription(null)
        setSession(null)
        localStorage.removeItem(PROFILE_STORAGE_KEY)
        localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY)
    }

    // Connect Google Calendar
    const connectGoogleCalendar = async () => {
        console.log('Initiating signInWithOAuth for Google Calendar...')
        // We use signInWithOAuth instead of linkIdentity because it handles redirects better
        // and Supabase automatically links accounts with the same email.
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/calendar',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                redirectTo: `${window.location.origin}/app/appointments?provider_token=true`
            },
        })

        if (error) console.error('signInWithOAuth error:', error)
        if (data) console.log('signInWithOAuth data:', data)

        return { error: error as Error | null }
    }

    const value: AuthContextType = {
        user,
        profile,
        member,
        subscription,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        connectGoogleCalendar,
        isAuthenticated: !!user && !!profile,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
