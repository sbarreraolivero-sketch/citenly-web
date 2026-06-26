import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

// Cliente público aislado (sin sesión) para la landing de referido
const publicSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

interface RefData {
    referrer_name: string
    clinic_name: string
    clinic_phone: string
    referral_bonus: number
    points_name: string
}

export default function ReferralRedirect() {
    const { code } = useParams<{ code: string }>()
    const [data, setData] = useState<RefData | null>(null)
    const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

    useEffect(() => {
        if (!code) { setStatus('error'); return }
        ;(publicSupabase as any)
            .rpc('get_referral_link_data', { p_code: code.toUpperCase() })
            .then(({ data: rows, error }: any) => {
                if (error || !rows || rows.length === 0) { setStatus('error'); return }
                setData(rows[0] as RefData)
                setStatus('ok')
            })
    }, [code])

    const firstName = (data?.referrer_name || '').trim().split(' ')[0] || 'una clienta'

    const waUrl = () => {
        if (!data) return '#'
        const phone = (data.clinic_phone || '').replace(/\D/g, '')
        const msg = `¡Hola! Vengo de parte de ${data.referrer_name} 💖 Mi código de referido es *${(code || '').toUpperCase()}*. ¡Quiero agendar mi primera cita!`
        return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
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
                    <div style={{ fontSize: 44, marginBottom: 12 }}>💔</div>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>Enlace no válido</h1>
                    <p style={{ color: '#6b7280', margin: '0 0 22px' }}>Este código de referido no existe o ya no está disponible.</p>
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
                    <p style={{ color: '#9ca3af', marginTop: 16, fontWeight: 600 }}>Cargando tu invitación…</p>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
            </div>
        )
    }

    return (
        <div style={wrap}>
            <div style={{
                width: '100%', maxWidth: 420, background: '#fff', borderRadius: 26,
                boxShadow: '0 20px 60px rgba(255,46,136,0.15)', border: '1px solid #FFE0EE',
                padding: '38px 28px', textAlign: 'center',
            }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#FF2E88', marginBottom: 14 }}>✨ Una recomendación para ti</div>

                <div style={{
                    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                    background: 'linear-gradient(135deg,#FF2E88,#9333EA)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 900,
                }}>{firstName.charAt(0).toUpperCase()}</div>

                <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1a1a2e', lineHeight: 1.25, margin: '0 0 6px' }}>
                    {firstName} te recomienda<br /><span style={{ color: '#FF2E88' }}>{data.clinic_name}</span>
                </h1>
                <p style={{ color: '#4b5563', fontSize: 16, lineHeight: 1.6, margin: '12px 0 0' }}>
                    Agenda tu primera cita y, como vienes recomendada, <strong style={{ color: '#1a1a2e' }}>las dos ganan {data.referral_bonus > 0 ? `${data.referral_bonus.toLocaleString('es-CL')} ${data.points_name}` : 'un beneficio de bienvenida'}</strong> 🎁
                </p>

                <a href={waUrl()} target="_blank" rel="noopener" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: '#25D366', color: '#fff', fontWeight: 800, fontSize: 16.5,
                    padding: '15px 22px', borderRadius: 16, textDecoration: 'none', margin: '26px 0 14px',
                    boxShadow: '0 10px 30px rgba(37,211,102,0.35)',
                }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.529 5.259l-.999 3.648 3.74-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.074-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                    Agendar por WhatsApp
                </a>

                <p style={{ color: '#9ca3af', fontSize: 12.5, margin: 0 }}>Te abrimos el chat con tu código ya escrito.</p>

                <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid #f1eef2', color: '#c7c2cb', fontSize: 12, fontWeight: 600 }}>
                    Agenda con <a href="https://citenly.com" style={{ color: '#FF2E88', textDecoration: 'none', fontWeight: 800 }}>Citenly</a>
                </div>
            </div>
        </div>
    )
}
