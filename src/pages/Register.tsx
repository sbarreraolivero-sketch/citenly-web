import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Sparkles, Mail, Lock, User, Building2, ArrowRight, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

const plans = [
    { id: 'essence', name: 'Essence', price: 79, popular: false },
    { id: 'radiance', name: 'Radiance', price: 159, popular: true },
    { id: 'prestige', name: 'Prestige', price: 299, popular: false },
]

export default function Register() {
    const [searchParams] = useSearchParams()
    const isJoinMode = searchParams.get('mode') === 'join'
    const inviteEmail = searchParams.get('email')
    const joinClinicId = searchParams.get('clinic')

    const [step, setStep] = useState(1)
    const [email, setEmail] = useState(inviteEmail || '')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [clinicName, setClinicName] = useState('')
    const [selectedPlan, setSelectedPlan] = useState('radiance')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const [jobTitle, setJobTitle] = useState('')

    const { signUp } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (step === 1) {
            // Validate step 1
            if (!fullName || !email || !password) {
                setError('Completa todos los campos')
                return
            }
            if (isJoinMode && !jobTitle) {
                setError('Por favor indica tu cargo en la clínica (ej: Odontóloga, Asistente)')
                return
            }

            if (password.length < 6) {
                setError('La contraseña debe tener al menos 6 caracteres')
                return
            }

            // Check if invite exists if in join mode
            if (isJoinMode) {
                if (!email) {
                    setError('Por favor ingresa tu correo electrónico.')
                    return
                }
                setLoading(true)
                // Use new RPC that returns clinic details
                const { data } = await supabase.rpc('check_pending_invite_details', {
                    p_email: email,
                    p_clinic_id: joinClinicId || null
                })
                setLoading(false)

                // The RPC returns { valid, clinic_name }
                const result = data && data.length > 0 ? data[0] : null; // Handle if it returns array

                if (!result || !result.valid) {
                    setError('No encontramos una invitación pendiente para este correo.')
                    return
                }

                // Confirm join with clinic name
                if (confirm(`Te estás uniendo a  "${result.clinic_name}". ¿Es correcto?`)) {
                    handleJoin()
                }
                return
            }

            setError('')
            setStep(2)
            return
        }

        if (step === 2) {
            // Validate step 2
            if (!clinicName) {
                setError('Ingresa el nombre de tu clínica')
                return
            }
            setError('')
            setStep(3)
            return
        }

        // Step 3 - Create account
        handleCreate()
    }

    const handleJoin = async () => {
        setError('')
        setLoading(true)

        // Metadata for trigger to pick up
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    job_title: jobTitle, // Trigger will use this
                    ...(joinClinicId ? { join_clinic_id: joinClinicId } : {})
                }
            }
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        if (data.session) {
            navigate('/app/dashboard?welcome=joined')
        } else {
            navigate('/login?message=check_email')
        }
    }

    const handleCreate = async () => {
        setError('')
        setLoading(true)

        const { error } = await signUp(email, password, fullName, clinicName, selectedPlan)

        if (error) {
            setError('Error al crear la cuenta. Intenta con otro email.')
            setLoading(false)
            return
        }

        // Success - redirect to dashboard
        navigate('/app/dashboard?welcome=true')
    }

    return (
        <div className="min-h-screen bg-subtle-gradient flex">
            {/* Left Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-hero-gradient rounded-soft flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-semibold text-charcoal">Citenly AI</span>
                    </div>

                    {/* Progress Indicator (Hidden in Join Mode) */}
                    {!isJoinMode && (
                        <div className="flex items-center gap-2 mb-8">
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${s < step
                                            ? 'bg-primary-500 text-white'
                                            : s === step
                                                ? 'bg-primary-500 text-white'
                                                : 'bg-silk-beige text-charcoal/40'
                                            }`}
                                    >
                                        {s < step ? <Check className="w-4 h-4" /> : s}
                                    </div>
                                    {s < 3 && (
                                        <div className={`w-12 h-0.5 mx-1 ${s < step ? 'bg-primary-500' : 'bg-silk-beige'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Header */}
                    <h1 className="text-h2 text-charcoal mb-2">
                        {isJoinMode ? 'Únete a tu equipo' : (
                            step === 1 ? 'Crea tu cuenta' :
                                step === 2 ? 'Sobre tu clínica' :
                                    'Elige tu plan'
                        )}
                    </h1>
                    <p className="text-charcoal/60 mb-8">
                        {isJoinMode ? 'Ingresa tus datos para aceptar la invitación' : (
                            step === 1 ? 'Comienza tu prueba gratuita de 14 días' :
                                step === 2 ? 'Configura los datos básicos de tu negocio' :
                                    'Selecciona el plan que mejor se adapte a ti'
                        )}
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 rounded-soft p-4 mb-6">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Step 1: Personal Info */}
                        {step === 1 && (
                            <>
                                <div>
                                    <label htmlFor="fullName" className="block text-sm font-medium text-charcoal mb-2">
                                        Nombre completo
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="input-soft pl-12 w-full"
                                            placeholder="María García"
                                            required
                                        />
                                    </div>
                                </div>

                                {isJoinMode && (
                                    <div>
                                        <label htmlFor="jobTitle" className="block text-sm font-medium text-charcoal mb-2">
                                            Cargo / Rol
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                                            <input
                                                id="jobTitle"
                                                type="text"
                                                value={jobTitle}
                                                onChange={(e) => setJobTitle(e.target.value)}
                                                className="input-soft pl-12 w-full"
                                                placeholder="Ej: Odontóloga General"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-2">
                                        Correo electrónico
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-soft pl-12 w-full"
                                            placeholder="maria@clinica.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-2">
                                        Contraseña
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                                        <input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="input-soft pl-12 w-full"
                                            placeholder="Mínimo 6 caracteres"
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Step 2: Clinic Info */}
                        {step === 2 && (
                            <div>
                                <label htmlFor="clinicName" className="block text-sm font-medium text-charcoal mb-2">
                                    Nombre de tu clínica
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal/40" />
                                    <input
                                        id="clinicName"
                                        type="text"
                                        value={clinicName}
                                        onChange={(e) => setClinicName(e.target.value)}
                                        className="input-soft pl-12 w-full"
                                        placeholder="Clínica Estética Bella"
                                        required
                                    />
                                </div>
                                <p className="text-sm text-charcoal/50 mt-2">
                                    Este nombre aparecerá en los mensajes de WhatsApp
                                </p>
                            </div>
                        )}

                        {/* Step 3: Plan Selection */}
                        {step === 3 && (
                            <div className="space-y-3">
                                {plans.map((plan) => (
                                    <label
                                        key={plan.id}
                                        className={`block p-4 rounded-soft border-2 cursor-pointer transition-all ${selectedPlan === plan.id
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-silk-beige hover:border-primary-200'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name="plan"
                                                    value={plan.id}
                                                    checked={selectedPlan === plan.id}
                                                    onChange={(e) => setSelectedPlan(e.target.value)}
                                                    className="sr-only"
                                                />
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id
                                                    ? 'border-primary-500 bg-primary-500'
                                                    : 'border-charcoal/30'
                                                    }`}>
                                                    {selectedPlan === plan.id && (
                                                        <Check className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-charcoal">{plan.name}</span>
                                                    {plan.popular && (
                                                        <span className="ml-2 text-xs bg-accent-500 text-charcoal px-2 py-0.5 rounded-full">
                                                            Popular
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="font-semibold text-charcoal">
                                                ${plan.price}<span className="text-sm text-charcoal/50">/mes</span>
                                            </span>
                                        </div>
                                    </label>
                                ))}
                                <p className="text-sm text-charcoal/50 text-center mt-4">
                                    Prueba gratis por 14 días. Cancela cuando quieras.
                                </p>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-3">
                            {step > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setStep(step - 1)}
                                    className="btn-ghost flex-1 py-3"
                                >
                                    Atrás
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creando cuenta...
                                    </>
                                ) : step < 3 ? (
                                    <>
                                        Continuar
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                ) : (
                                    <>
                                        Comenzar Prueba Gratis
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Login Link */}
                    <p className="mt-8 text-center text-charcoal/60">
                        ¿Ya tienes cuenta?{' '}
                        <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right Panel - Hero */}
            <div className="hidden lg:flex flex-1 bg-hero-gradient items-center justify-center p-12">
                <div className="max-w-lg text-white">
                    <h2 className="text-3xl font-semibold mb-4">
                        Únete a +500 clínicas que ya automatizan sus citas
                    </h2>
                    <p className="text-white/80 text-lg mb-8">
                        En menos de 5 minutos tendrás tu asistente de IA configurado
                        y listo para atender pacientes por WhatsApp.
                    </p>

                    {/* Testimonial */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-softer p-6">
                        <p className="text-white/90 italic mb-4">
                            "Antes pasaba 3 horas diarias respondiendo mensajes.
                            Ahora mi asistente de Citenly lo hace todo mientras
                            yo me enfoco en mis pacientes."
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full" />
                            <div>
                                <p className="font-medium">Dra. Carolina Méndez</p>
                                <p className="text-sm text-white/60">Clínica Derma Bella</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
