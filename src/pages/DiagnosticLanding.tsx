import { useEffect, useState } from 'react';
import { 
    Sparkles, 
    ArrowRight, 
    MessageCircle, 
    TrendingUp, 
    CheckCircle2, 
    Zap,
    Users,
    Facebook,
    Instagram,
    Briefcase
} from 'lucide-react';

export default function DiagnosticLanding() {
    const whatsappLink = "https://wa.me/56996600259?text=Hola!%20Vengo%20de%20la%20página%20de%20Diagnóstico.%20Quiero%20una%20reunión%20para%20escalar%20mi%20clínica.";

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <style>{`
                @keyframes pulse-soft {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                }
                .animate-pulse-soft { animation: pulse-soft 4s ease-in-out infinite; }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }

                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    border: 1px border rgba(255, 255, 255, 0.08);
                }

                .glow-indigo {
                    box-shadow: 0 0 50px -12px rgba(99, 102, 241, 0.3);
                }

                .gradient-text {
                    background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .flow-dot {
                    width: 12px;
                    height: 12px;
                    background: #6366f1;
                    border-radius: 50%;
                    position: relative;
                }
                .flow-dot::after {
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: inherit;
                    border-radius: inherit;
                    animation: flow-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
                @keyframes flow-ping {
                    75%, 100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center glow-indigo">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tighter text-white">Citenly<span className="text-indigo-500">HQ</span></span>
                    </div>
                    <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-indigo-50 transition-all active:scale-95"
                    >
                        Agendar Diagnóstico
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-44 pb-32 px-6 overflow-hidden">
                {/* Background Blurs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full -z-10 animate-pulse-soft"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full -z-10"></div>

                <div className="max-w-5xl mx-auto text-center">
                    <div className={`transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-8 border border-indigo-500/20">
                            <Zap className="w-3.5 h-3.5" />
                            Growth Partner & AI Automation
                        </div>

                        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-10 leading-[0.9] gradient-text">
                            No venda software. <br />
                            <span className="text-white/40">Escale su clínica.</span>
                        </h1>

                        <p className="text-lg md:text-2xl text-white/50 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
                            Deje de ser el esclavo de su recepción. Creamos el sistema que captura, cierra y fideliza pacientes de alto valor mientras usted opera.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <a 
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)] active:scale-95"
                            >
                                Agendar Diagnóstico Gratuito
                                <ArrowRight className="w-5 h-5" />
                            </a>
                            <p className="text-sm text-white/30 font-medium">
                                Análisis profundo de su funnel actual <br className="hidden sm:block" /> sin compromiso.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visual Flow Section */}
            <section className="py-32 px-6 bg-white/[0.01]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">El "Motor de Crecimiento" Citenly</h2>
                        <p className="text-white/40 text-lg md:text-xl font-medium">Desde el clic en redes sociales hasta el paciente recurrente.</p>
                    </div>

                    <div className="grid lg:grid-cols-4 gap-8 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent -translate-y-1/2 -z-10"></div>

                        {/* Step 1: Ads */}
                        <div className="glass-card p-10 rounded-3xl border border-white/5 flex flex-col items-center text-center relative hover:border-indigo-500/30 transition-all group">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 transition-transform">
                                <div className="flex gap-1">
                                    <Facebook className="w-6 h-6 text-[#1877F2]" />
                                    <Instagram className="w-6 h-6 text-[#E4405F]" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold mb-4">Captación de Elite</h3>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Diseñamos campañas en Meta enfocadas en sus tratamientos más rentables. No buscamos "likes", buscamos pacientes interesados.
                            </p>
                            <div className="mt-8 flow-dot"></div>
                        </div>

                        {/* Step 2: IA Agent */}
                        <div className="glass-card p-10 rounded-3xl border border-white/5 flex flex-col items-center text-center relative hover:border-indigo-500/30 transition-all group">
                            <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-8 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                                <MessageCircle className="w-8 h-8 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Cierre con Agente IA</h3>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Su agente Citenly responde en segundos por WhatsApp. No sufre cansancio, no olvida seguimientos y agenda 24/7 en su calendario.
                            </p>
                            <div className="mt-8 flow-dot"></div>
                        </div>

                        {/* Step 3: Consultoría */}
                        <div className="glass-card p-10 rounded-3xl border border-white/5 flex flex-col items-center text-center relative hover:border-indigo-500/30 transition-all group">
                            <div className="w-16 h-16 bg-emerald-600/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <Briefcase className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Consultoría Estratégica</h3>
                            <p className="text-white/40 text-sm leading-relaxed">
                                No lo dejamos solo. Un consultor humano optimiza sus procesos, guiones de venta y rentabilidad mensualmente.
                            </p>
                            <div className="mt-8 flow-dot"></div>
                        </div>

                        {/* Step 4: Loyalty */}
                        <div className="glass-card p-10 rounded-3xl border border-white/5 flex flex-col items-center text-center relative hover:border-indigo-500/30 transition-all group">
                            <div className="w-16 h-16 bg-violet-600/10 rounded-2xl flex items-center justify-center mb-8 border border-violet-500/20 group-hover:scale-110 transition-transform">
                                <Users className="w-8 h-8 text-violet-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-4">Fidelización Infinita</h3>
                            <p className="text-white/40 text-sm leading-relaxed">
                                Re-activamos automáticamente a pacientes antiguos. Aseguramos que su LTV (Valor de por vida del cliente) se dispare.
                            </p>
                            <div className="mt-8 flow-dot" style={{ backgroundColor: '#8b5cf6' }}></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pain Points Section */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-24 items-center">
                    <div>
                        <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 leading-tight">
                            ¿Siente que su clínica llegó a un <span className="text-indigo-500">techo de cristal</span>?
                        </h2>
                        <div className="space-y-8 mt-12">
                            {[
                                { title: "La Trampa de la Recepción", desc: "Su personal está desbordado o no tiene el colmillo comercial para cerrar citas difíciles." },
                                { title: "Fuga de Dinero Invisible", desc: "Leads que preguntan y nunca más reciben un seguimiento. Dinero que se va a la basura." },
                                { title: "Agenda con Agujeros", desc: "Inasistencias que no se cubren a tiempo y especialistas ociosos que cuestan dinero." }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-6 group">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
                                        <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                                        <p className="text-white/40 leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/30 blur-[100px] rounded-full"></div>
                        <div className="glass-card p-12 rounded-[3rem] relative border border-white/10 overflow-hidden shadow-2xl">
                            <TrendingUp className="w-16 h-16 text-red-500 mb-8 animate-float" />
                            <h3 className="text-3xl font-bold mb-6 italic">"El costo de la inacción es de al menos $1.200.000 mensuales en una clínica promedio."</h3>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-red-500 w-[70%]" />
                            </div>
                            <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Pérdida por Lead no gestionado</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section className="py-32 px-6 bg-indigo-600/5">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-16 underline decoration-indigo-500/30 underline-offset-8">No somos otro software</h2>
                    <div className="grid md:grid-cols-2 gap-px bg-white/10 rounded-[2.5rem] overflow-hidden border border-white/10">
                        <div className="bg-[#0a0a0b] p-12">
                            <h4 className="text-xl font-bold mb-8 text-white/40">Software Tradicional</h4>
                            <ul className="space-y-6">
                                <li className="flex gap-3 text-white/40 font-medium">
                                    <span className="text-red-500">✕</span> Te dan acceso y tú te arreglas
                                </li>
                                <li className="flex gap-3 text-white/40 font-medium">
                                    <span className="text-red-500">✕</span> Chatbot rígido y robótico
                                </li>
                                <li className="flex gap-3 text-white/40 font-medium">
                                    <span className="text-red-500">✕</span> Soporte por ticket lento
                                </li>
                                <li className="flex gap-3 text-white/40 font-medium">
                                    <span className="text-red-500">✕</span> Tú tienes que ver los Ads
                                </li>
                            </ul>
                        </div>
                        <div className="bg-[#0d0d0f] p-12 border-l border-white/10 relative">
                            <div className="absolute top-6 right-8 bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Socio Estratégico</div>
                            <h4 className="text-xl font-bold mb-8 text-white">Método Citenly HP</h4>
                            <ul className="space-y-6">
                                <li className="flex gap-3 text-white font-medium">
                                    <span className="text-indigo-500">✓</span> Implementación 100% hecha por expertos
                                </li>
                                <li className="flex gap-3 text-white font-medium">
                                    <span className="text-indigo-500">✓</span> IA entrenada con casos clínicos reales
                                </li>
                                <li className="flex gap-3 text-white font-medium">
                                    <span className="text-indigo-500">✓</span> Consultoría de negocios recurrente
                                </li>
                                <li className="flex gap-3 text-white font-medium">
                                    <span className="text-indigo-500">✓</span> Funnel completo de Ads a Conversión
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ROI CTA Section */}
            <section className="py-40 px-6 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full -z-10"></div>
                <div className="max-w-4xl mx-auto text-center glass-card p-16 md:p-24 rounded-[4rem] border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 blur-3xl opacity-20"></div>
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                        ¿Su clínica califica para este sistema?
                    </h2>
                    <p className="text-xl text-white/50 mb-12 font-medium">
                        Solo trabajamos con dueños de clínicas comprometidos con el crecimiento. No vendemos herramientas, construimos imperios.
                    </p>
                    <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-4 bg-white text-black px-10 py-6 rounded-3xl text-2xl font-black hover:scale-105 hover:bg-indigo-50 transition-all group active:scale-95 shadow-2xl"
                    >
                        Agendar Sesión de Diagnóstico
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 px-6 border-t border-white/5 text-center">
                <div className="flex items-center justify-center gap-3 mb-8">
                     <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                    </div>
                    <span className="text-xl font-bold text-white/30">Citenly <span className="text-white/10 italic">High Performance</span></span>
                </div>
                <p className="text-white/20 text-sm font-medium">© 2026 Reservas & IA S.A. | Reservado exclusivamente para socios estratégicos.</p>
            </footer>
        </div>
    );
}
