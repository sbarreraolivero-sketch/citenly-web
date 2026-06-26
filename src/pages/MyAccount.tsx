import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const publicSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

interface Reward { name: string; cost: number }
interface AccountData {
    name: string
    points: number
    points_name: string
    currency_symbol: string
    clinic_name: string
    clinic_phone: string
    referral_code: string
    referral_count: number
    referral_bonus: number
    rewards: Reward[]
}

export default function MyAccount() {
    const { code } = useParams<{ code: string }>()
    const [data, setData] = useState<AccountData | null>(null)
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!code) { setStatus('error'); return }
        ;(publicSupabase as any)
            .rpc('get_my_account_data', { p_code: code.toUpperCase() })
            .then(({ data: d, error }: any) => {
                if (error || !d) { setStatus('error'); return }
                setData(d as AccountData)
                setStatus('ok')
            })
    }, [code])

    const firstName = (data?.name || '').trim().split(' ')[0] || 'clienta'
    const shareUrl = data ? `${window.location.origin}/r/${data.referral_code}` : ''

    const onShare = async () => {
        if (!shareUrl) return
        const text = `Te recomiendo ${data?.clinic_name} 💖 Agenda con mi link y las dos ganamos:`
        if ((navigator as any).share) {
            try { await (navigator as any).share({ title: data?.clinic_name, text, url: shareUrl }) } catch { /* cancelado */ }
        } else {
            navigator.clipboard.writeText(shareUrl)
            setCopied(true); setTimeout(() => setCopied(false), 2000)
        }
    }

    const wrap: React.CSSProperties = {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: "'Outfit', system-ui, sans-serif",
        background: 'radial-gradient(1200px 600px at 50% -10%, #FFE6F1, #fff 60%)',
    }

    if (status === 'error') {
        return (
            <div style={wrap}>
                <div style={{ textAlign: 'center', maxWidth: 380 }}>
                    <div style={{ fontSize: 44, marginBottom: 12 }}>🔍</div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>Cuenta no encontrada</h1>
                    <p style={{ color: '#6b7280', margin: '0 0 22px' }}>Este enlace no es válido o ya no está disponible.</p>
                    <a href="https://citenly.com" style={{ color: '#FF2E88', fontWeight: 700, textDecoration: 'none' }}>Ir a Citenly →</a>
                </div>
            </div>
        )
    }

    if (status === 'loading' || !data) {
        return (
            <div style={wrap}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, border: '4px solid #FFC2DC', borderTopColor: '#FF2E88', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ color: '#9ca3af', marginTop: 16, fontWeight: 600 }}>Cargando tu cuenta…</p>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
            </div>
        )
    }

    const unit = data.currency_symbol || data.points_name
    const affordable = data.rewards.filter(r => data.points >= r.cost)

    return (
        <div style={{ ...wrap, alignItems: 'flex-start', padding: '32px 18px' }}>
            <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>

                {/* Encabezado clínica */}
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#FF2E88', margin: 0 }}>{data.clinic_name}</p>
                    <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1a1a2e', margin: '4px 0 0' }}>Hola {firstName} 💖</h1>
                </div>

                {/* Card de puntos */}
                <div style={{ background: 'linear-gradient(135deg,#FF2E88,#9333EA)', color: '#fff', borderRadius: 24, padding: '28px 24px', textAlign: 'center', boxShadow: '0 16px 44px rgba(255,46,136,0.30)' }}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.85, margin: 0 }}>Tu saldo acumulado</p>
                    <p style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, margin: '8px 0 2px' }}>{data.points.toLocaleString('es-CL')} <span style={{ fontSize: 22, fontWeight: 800 }}>{unit}</span></p>
                    <p style={{ fontSize: 13.5, opacity: 0.9, margin: 0 }}>Sigue agendando y suma más en cada visita ✨</p>
                </div>

                {/* Recompensas */}
                {data.rewards.length > 0 && (
                    <div style={{ background: '#fff', border: '1px solid #FFE0EE', borderRadius: 20, padding: '20px 22px', marginTop: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.04)' }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e', margin: '0 0 12px' }}>🎁 Lo que puedes canjear</p>
                        {data.rewards.map((r, i) => {
                            const can = data.points >= r.cost
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i ? '1px solid #f5eef2' : 'none' }}>
                                    <span style={{ fontSize: 15, color: can ? '#1a1a2e' : '#9ca3af', fontWeight: can ? 700 : 500 }}>{r.name}</span>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: can ? '#16a34a' : '#c7c2cb', whiteSpace: 'nowrap' }}>{can ? '✓ Disponible' : `${r.cost.toLocaleString('es-CL')} ${unit}`}</span>
                                </div>
                            )
                        })}
                        {affordable.length > 0 && <p style={{ fontSize: 12.5, color: '#16a34a', fontWeight: 700, margin: '12px 0 0' }}>Tienes saldo para canjear ahora — pídelo en tu próxima visita 💕</p>}
                    </div>
                )}

                {/* Referidos */}
                <div style={{ background: '#0A0A0F', color: '#fff', borderRadius: 20, padding: '24px 22px', marginTop: 16, textAlign: 'center' }}>
                    <p style={{ fontSize: 17, fontWeight: 900, margin: '0 0 6px' }}>Gana más trayendo a una amiga</p>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', lineHeight: 1.5 }}>
                        Comparte tu link. Cuando tu amiga agende, <strong style={{ color: '#fff' }}>las dos ganan {data.referral_bonus > 0 ? `${data.referral_bonus.toLocaleString('es-CL')} ${unit}` : 'puntos'}</strong> 💖
                    </p>
                    <button onClick={onShare} style={{ width: '100%', background: '#FF2E88', color: '#fff', border: 'none', fontWeight: 800, fontSize: 16, padding: '14px', borderRadius: 14, cursor: 'pointer', boxShadow: '0 8px 26px rgba(255,46,136,0.4)' }}>
                        {copied ? '¡Link copiado! ✓' : 'Compartir mi link 💌'}
                    </button>
                    <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', margin: '12px 0 0' }}>
                        {data.referral_count > 0 ? `Ya has referido a ${data.referral_count} ${data.referral_count === 1 ? 'amiga' : 'amigas'} 🌟` : 'Tu código: ' + data.referral_code}
                    </p>
                </div>

                <div style={{ textAlign: 'center', marginTop: 22, color: '#c7c2cb', fontSize: 12, fontWeight: 600 }}>
                    Con <a href="https://citenly.com" style={{ color: '#FF2E88', textDecoration: 'none', fontWeight: 800 }}>Citenly</a>
                </div>
            </div>
        </div>
    )
}
