import { 
    Sparkles, 
    ArrowRight, 
    MessageSquare, 
    Calendar, 
    TrendingUp, 
    ShieldCheck, 
    Bot, 
    CheckCircle2, 
    XCircle,
    Activity,
    Target
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FreeConsultation() {
    const whatsappLink = "https://wa.me/56996600259?text=Hola!%20Quiero%20agendar%20mi%20asesoría%20gratuita%20para%20Citenly"

    return (
        <div className="min-h-screen bg-ivory font-sans selection:bg-primary-200 overflow-x-hidden">
            <style>{`
                @keyframes float-y {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float-y { animation: float-y 8s ease-in-out infinite; }
                
                @keyframes chat-message {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-chat-1 { animation: chat-message 0.6s ease-out forwards; animation-delay: 1s; opacity: 0; }
                .animate-chat-2 { animation: chat-message 0.6s ease-out forwards; animation-delay: 3s; opacity: 0; }
                .animate-chat-3 { animation: chat-message 0.6s ease-out forwards; animation-delay: 5s; opacity: 0; }
            `}</style>

            {/* Navigation (Simple) */}
            <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-silk-beige z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-charcoal rounded-soft flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-primary-300" />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-charcoal">Citenly</span>
                    </div>
                    <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-charcoal text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-primary-600 transition-all flex items-center gap-2"
                    >
                        Agendar Asesoría
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </nav>

            {/* 1. HERO */}
            <section className="relative pt-32 pb-20 px-4 md:px-8 overflow-hidden">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-primary-200">
                        <Sparkles className="w-3.5 h-3.5" />
                        Modelo "Done-for-you" • Implementación Garantizada
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-charcoal tracking-tight mb-8 leading-[1.1]">
                        Recupera pacientes perdidos y <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">llena tu agenda automáticamente</span> con WhatsApp
                    </h1>

                    <p className="text-xl md:text-2xl text-charcoal/70 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
                        Reduce inasistencias y responde 24/7 sin depender de recepcionistas. 
                        A diferencia de otros sistemas, nosotros lo configuramos y entrenamos por ti hasta que funcione perfecto.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a 
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto bg-primary-600 text-white px-8 py-5 rounded-2xl text-xl font-bold border-b-4 border-primary-800 hover:translate-y-[-2px] hover:border-b-6 transition-all flex items-center justify-center gap-3 shadow-xl"
                        >
                            Agendar asesoría gratuita
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                    
                    <p className="mt-8 text-charcoal/50 font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Tienes 7 días gratis para probarlo después de la validación
                    </p>
                </div>
            </section>

            {/* 2. SECCIÓN DE DOLOR */}
            <section className="py-24 bg-white border-y border-silk-beige px-4 md:px-8">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-charcoal mb-8 leading-tight">
                            Miras tu agenda y ves huecos que significan dinero perdido
                        </h2>
                        <div className="space-y-6">
                            {[
                                { icon: MessageSquare, text: "Pacientes que no respondes a tiempo y se van a la competencia" },
                                { icon: XCircle, text: "Citas confirmadas que simplemente no se presentan (No-shows)" },
                                { icon: Calendar, text: "Horas vacías que el equipo no alcanza a gestionar" },
                                { icon: Activity, text: "Mensajes de seguimiento que nunca se envían por falta de tiempo" }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 items-start bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <item.icon className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                                    <p className="text-lg font-bold text-charcoal/80">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-charcoal p-10 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-600/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <TrendingUp className="w-20 h-20 text-red-400 mx-auto mb-6 animate-pulse" />
                        <h3 className="text-4xl font-extrabold text-white mb-6 leading-tight">
                            Estás perdiendo dinero todos los días
                        </h3>
                        <p className="text-xl text-white/70 font-medium mb-8">
                            Cada lead sin responder es una venta perdida. Cada inasistencia es un costo fijo que no se cubre.
                        </p>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                            <p className="text-sm uppercase tracking-widest font-bold text-white/50 mb-2">Pérdida promedio del sector</p>
                            <p className="text-5xl font-black text-red-400">$850.000+ CLP mensuales</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. ROMPER OBJECIÓN */}
            <section className="py-24 bg-ivory px-4 md:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-black text-charcoal mb-12">¿Por qué otros sistemas de "automatización" te han fallado?</h2>
                    <div className="grid sm:grid-cols-3 gap-6 mb-12">
                        {[
                            { title: "Difíciles de configurar", desc: "Te dan el software y te dejan solo." },
                            { title: "IA responde mal", desc: "Suenan robóticos y confunden al paciente." },
                            { title: "Mala experiencia", desc: "Dificultan el agendamiento en lugar de facilitarlo." }
                        ].map((obj, i) => (
                            <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-silk-beige flex flex-col justify-center">
                                <h4 className="font-extrabold text-xl text-charcoal mb-3">{obj.title}</h4>
                                <p className="text-charcoal/60 font-medium">{obj.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="bg-charcoal text-white p-10 rounded-[2rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600 blur-3xl opacity-20"></div>
                        <p className="text-4xl font-black mb-4">“El problema no es la automatización, es la implementación”</p>
                        <p className="text-xl text-white/60 font-medium">Nosotros no te vendemos un software, instalamos una máquina operativa.</p>
                    </div>
                </div>
            </section>

            {/* 4. SOLUCIÓN */}
            <section className="py-24 bg-white px-4 md:px-8 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-6xl font-black text-charcoal mb-4">Citenly: Tu nuevo estándar</h2>
                        <p className="text-2xl text-charcoal/60 font-medium">Sistema que responde, agenda y recupera pacientes automáticamente</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { 
                                icon: ShieldCheck, 
                                title: "Implementación total", 
                                desc: "Nuestro equipo técnico configura todo. No tienes que mover un dedo." 
                            },
                            { 
                                icon: Bot, 
                                title: "Entrenamiento real", 
                                desc: "La IA aprende tus precios, servicios y tono de voz exacto." 
                            },
                            { 
                                icon: Target, 
                                title: "Validación humana", 
                                desc: "No activamos hasta que el sistema fluya perfectamente ante nuestras pruebas." 
                            }
                        ].map((item, i) => (
                            <div key={i} className="bg-ivory/50 p-10 rounded-[2.5rem] border border-silk-beige hover:border-primary-400 transition-all hover:translate-y-[-5px]">
                                <item.icon className="w-12 h-12 text-primary-600 mb-6" />
                                <h4 className="text-2xl font-black text-charcoal mb-4">{item.title}</h4>
                                <p className="text-lg text-charcoal/70 font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. CÓMO FUNCIONA (4 PASOS) */}
            <section className="py-24 bg-charcoal text-white px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-4">4 Pasos hacia la libertad operativa</h2>
                        <p className="text-xl text-white/60 font-medium">De cero a facturación automática en días, no semanas.</p>
                    </div>
                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: "01", title: "Implementación", desc: "Conectamos Citenly a tu WhatsApp y calendario oficial." },
                            { step: "02", title: "Entrenamiento", desc: "Cargamos tus servicios, precios y reglas de negocio." },
                            { step: "03", title: "Validación", desc: "Realizamos simulacros de atención para asegurar calidad." },
                            { step: "04", title: "Activación", desc: "El sistema comienza a atender a tus pacientes reales 24/7." }
                        ].map((step, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-3xl relative overflow-hidden group hover:bg-white/10 transition-colors">
                                <span className="text-6xl font-black text-white/10 absolute top-2 right-4 group-hover:text-primary-500/20 transition-colors">{step.step}</span>
                                <h4 className="text-2xl font-black mb-4 relative z-10">{step.title}</h4>
                                <p className="text-white/60 font-medium leading-relaxed relative z-10">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. RESULTADOS */}
            <section className="py-24 bg-white px-4 md:px-8">
                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-4xl font-black text-charcoal mb-8 leading-tight">Resultados que puedes medir en tu cuenta bancaria</h2>
                            <div className="space-y-4">
                                {[
                                    "Agenda llena con menos esfuerzo de ventas",
                                    "Reducción de ausencias (No-shows) hasta en 80%",
                                    "Atención 24/7 que captura leads mientras duermes",
                                    "Aumento directo en la facturación mensual"
                                ].map((bullet, i) => (
                                    <div key={i} className="flex gap-4 items-center">
                                        <div className="bg-emerald-100 p-1 rounded-full"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
                                        <span className="text-xl font-bold text-charcoal/80">{bullet}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-primary-600 p-1 rounded-[2.5rem] shadow-2xl">
                             <div className="bg-charcoal p-10 rounded-[2.4rem] text-center">
                                <h3 className="text-white text-3xl font-black mb-8 italic">"Vemos Citenly no como un software, sino como un generador de flujo de caja"</h3>
                                <div className="flex items-center justify-center gap-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-full"></div>
                                    <div className="text-left">
                                        <p className="text-white font-bold">Gestor Médico</p>
                                        <p className="text-white/50 text-sm italic">Clínica de Estética Avanzada</p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. CASO REAL */}
            <section className="py-24 bg-ivory px-4 md:px-8">
                <div className="max-w-4xl mx-auto bg-white rounded-[3rem] p-12 shadow-2xl border-4 border-emerald-50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white px-8 py-2 font-black uppercase text-sm -rotate-45 translate-x-10 translate-y-6">CASO REAL</div>
                    <div className="text-center mb-10">
                        <TrendingUp className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-4xl font-black text-charcoal mb-4">El retorno de inversión es inmediato</h2>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-8 text-center border-t border-b border-gray-100 py-10">
                        <div>
                            <p className="text-charcoal/50 font-bold uppercase tracking-widest text-xs mb-2">Contactos</p>
                            <p className="text-4xl font-black text-charcoal">100</p>
                        </div>
                        <div>
                            <p className="text-charcoal/50 font-bold uppercase tracking-widest text-xs mb-2">Recuperados</p>
                            <p className="text-4xl font-black text-primary-600">3</p>
                        </div>
                        <div>
                            <p className="text-charcoal/50 font-bold uppercase tracking-widest text-xs mb-2">Ingresos Extra</p>
                            <p className="text-4xl font-black text-emerald-600">+$237.000 <span className="text-lg">CLP</span></p>
                        </div>
                    </div>
                    <p className="text-center mt-10 text-xl font-medium text-charcoal/60 italic">
                        "Con solo 3 pacientes recuperados de una base de 100, el sistema se pagó solo por los siguientes 2 meses."
                    </p>
                </div>
            </section>

            {/* 8. VISUALIZACIÓN */}
            <section className="py-24 bg-white px-4 md:px-8">
                <div className="max-w-5xl mx-auto text-center">
                    <h2 className="text-3xl md:text-5xl font-black text-charcoal mb-12">Imagina esto en tu clínica...</h2>
                    <div className="bg-gray-50 p-1 rounded-[3rem] shadow-inner mb-12">
                         <div className="bg-white p-12 rounded-[2.9rem] flex flex-col md:flex-row gap-12 text-left">
                            <div className="flex-1">
                                <h4 className="text-2xl font-black text-charcoal mb-4">Tu recepcionista enfocada</h4>
                                <p className="text-lg text-charcoal/70 font-medium">Recibe al paciente con un café, gestiona pagos presenciales y da una atención de lujo, mientras Citenly agita y ordena la agenda digital.</p>
                            </div>
                            <div className="flex-1 border-l-2 border-gray-100 md:pl-12">
                                <h4 className="text-2xl font-black text-charcoal mb-4">Tu agenda siempre llena</h4>
                                <p className="text-lg text-charcoal/70 font-medium">Cada vez que alguien cancela, el sistema busca en la lista de espera o activa un paciente antiguo para llenar ese hueco en minutos.</p>
                            </div>
                         </div>
                    </div>
                    <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary px-10 py-5 text-xl font-bold shadow-2xl hover:scale-105 transition-all text-white bg-charcoal rounded-2xl"
                    >
                        Quiero esta transformación en mi clínica
                    </a>
                </div>
            </section>

            {/* 9. SISTEMA (SIMPLIFICADO) */}
            <section className="py-24 bg-ivory px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16">Un sistema 360° para tu negocio</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { title: "Captación", desc: "Convierte leads de IG/FB al instante." },
                            { title: "Conversión", desc: "Agenda citas sin intervención humana." },
                            { title: "Retención", desc: "Recupera pacientes antiguos en piloto automático." },
                            { title: "Control", desc: "Mide tus resultados y ROI en tiempo real." }
                        ].map((m, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2rem] shadow-lg border border-silk-beige group hover:bg-primary-600 transition-all">
                                <h4 className="text-xl font-black mb-2 text-charcoal group-hover:text-white transition-colors">{m.title}</h4>
                                <p className="text-charcoal/50 group-hover:text-white/70 transition-colors font-medium">{m.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 10. DEMOSTRACIÓN */}
            <section className="py-24 bg-white px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black text-charcoal mb-4">Conversaciones reales que parecen humanas</h2>
                        <p className="text-xl text-charcoal/60 font-medium italic">Mira cómo Citenly interactúa con tus pacientes</p>
                    </div>
                    <div className="bg-[#E5DDD5] rounded-[3rem] p-4 shadow-2xl max-w-lg mx-auto border-[10px] border-white relative overflow-hidden">
                        <div className="bg-[#075E54] h-20 flex items-center px-6 text-white">
                            <div className="w-10 h-10 bg-white/20 rounded-full mr-3"></div>
                            <div>
                                <p className="font-bold">Citenly AI Assistant</p>
                                <p className="text-xs text-white/70 italic">Online</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6 bg-chat-pattern min-h-[400px]">
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm animate-chat-1">
                                <p className="font-bold text-charcoal">¿Atienden hoy sábado? Necesito una limpieza facial urgente.</p>
                                <p className="text-[10px] text-gray-400 text-right mt-1">10:45 AM</p>
                            </div>
                            <div className="bg-[#DCF8C6] p-4 rounded-2xl rounded-tr-none max-w-[85%] ml-auto shadow-sm animate-chat-2">
                                <p className="font-bold text-charcoal italic">¡Hola! 😊 Hoy sábado atendemos hasta las 14:00 hrs. Me queda un cupo a las 12:30. ¿Te gustaría agendarlo?</p>
                                <p className="text-[10px] text-green-700 text-right mt-1">10:45 AM ✓✓</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm animate-chat-3">
                                <p className="font-bold text-charcoal italic">¡Sí por favor! ¿Cuánto sale?</p>
                                <p className="text-[10px] text-gray-400 text-right mt-1">10:46 AM</p>
                            </div>
                        </div>
                        <div className="bg-[#F0F2F5] p-4 flex gap-2 items-center">
                            <div className="flex-1 bg-white h-10 rounded-full border border-gray-200"></div>
                            <div className="w-10 h-10 bg-[#075E54] rounded-full"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 11. PRICING CONTEXTUAL */}
            <section className="py-24 bg-ivory px-4 md:px-8 border-t border-silk-beige">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="bg-white rounded-[3rem] p-12 shadow-xl border border-silk-beige relative">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-charcoal text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl">
                            INVIRTIENDO EN TU CLÍNICA
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-charcoal mb-6 mt-4">Un sistema que se paga solo</h2>
                        <p className="text-2xl text-charcoal/60 font-medium mb-10 leading-relaxed">
                            No pienses en Citenly como un gasto mensual. <br />
                            <span className="text-primary-600 font-black">Con recuperar solo 2 a 3 citas al mes que antes perdías, el sistema ya es gratuito para ti.</span>
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                           <div className="flex gap-2 items-center">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                                <span className="font-bold text-charcoal/70">Sin letra chica</span>
                           </div>
                           <div className="flex gap-2 items-center">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                                <span className="font-bold text-charcoal/70">Sin contratos largos</span>
                           </div>
                           <div className="flex gap-2 items-center">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                                <span className="font-bold text-charcoal/70">Implementación VIP</span>
                           </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 12. CTA FINAL */}
            <section className="py-32 bg-charcoal text-white px-4 md:px-8 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-primary-600/30 to-transparent"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
                        No necesitas más pacientes. <br />
                        <span className="text-primary-400">Necesitas dejar de perder los que ya tienes.</span>
                    </h2>
                    <p className="text-xl text-white/50 mb-12 font-medium">Agenda hoy una asesoría gratuita y deja que nuestro equipo te muestre el potencial de automatización de tu clínica.</p>
                    <a 
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-4 bg-primary-500 text-white px-10 py-6 rounded-3xl text-2xl font-black shadow-[0_20px_50px_rgba(var(--color-primary-500),0.3)] hover:scale-105 transition-all group"
                    >
                        Agendar asesoría gratuita
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </a>
                    
                    <div className="mt-20 border-t border-white/10 pt-10">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8 opacity-50 font-bold text-sm uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" />
                                <span>Citenly Operating System</span>
                            </div>
                            <div>© 2026 Reservas & IA S.A.</div>
                            <div className="flex gap-8">
                                <Link to="/terminos" className="hover:text-white transition-colors">Términos</Link>
                                <Link to="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
