import { useState, useEffect, useRef } from 'react';
import { Send, ChevronDown, Sparkles, MessageCircle, Zap, Bot } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
    id: string;
    sender: 'ai' | 'user';
    text: string;
    timestamp: string;
    toolsUsed?: number;
}

interface AIChatWidgetProps {
    variant?: 'support' | 'simulator';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AIChatWidget(_props?: AIChatWidgetProps) {
    const { profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showBadge, setShowBadge] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const formatTime = () => {
        return new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([
                {
                    id: Date.now().toString(),
                    sender: 'ai',
                    text: '¡Hola! 👋 Soy tu agente de IA en modo simulador.\n\nEscríbeme como si fueras un paciente real y te responderé exactamente como lo haría por WhatsApp.\n\nPuedes probar: preguntar por servicios, precios, agendar citas, etc.',
                    timestamp: formatTime()
                },
            ]);
            setShowBadge(false);
        }
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: text.trim(),
            timestamp: formatTime()
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setInput('');
        setIsTyping(true);

        try {
            // Call the simulator Edge Function
            const { data, error } = await supabase.functions.invoke('ai-simulator', {
                body: {
                    clinic_id: profile?.clinic_id,
                    message: text.trim(),
                    conversation_history: updatedMessages.filter(m => m.id !== userMsg.id).slice(-10) // Last 10 messages for context
                }
            });

            if (error) throw error;

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: data?.reply || 'No pude generar una respuesta.',
                timestamp: formatTime(),
                toolsUsed: data?.tools_used || 0
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            console.error("Error en simulador:", err);
            setMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    sender: 'ai',
                    text: '⚠️ Error de conexión con la IA. Verifica que tu clave de OpenAI esté configurada en Configuración.',
                    timestamp: formatTime()
                }
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleClearChat = () => {
        setMessages([
            {
                id: Date.now().toString(),
                sender: 'ai',
                text: '🔄 Conversación reiniciada.\n\n¡Hola! Soy tu agente de IA. ¿En qué puedo ayudarte?',
                timestamp: formatTime()
            },
        ]);
    };

    const quickReplies = [
        'Hola, ¿qué servicios ofrecen?',
        '¿Cuáles son sus precios?',
        '¿Tienen disponibilidad mañana?'
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[360px] sm:w-[400px] flex flex-col overflow-hidden mb-4 max-h-[600px]"
                    style={{ animation: 'slideUp 0.3s ease-out' }}
                >
                    {/* WhatsApp-style Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ccircle cx=\'2\' cy=\'2\' r=\'1\' fill=\'white\'/%3E%3C/svg%3E")' }}></div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-lg">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                                    Simulador IA
                                    <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full font-bold uppercase tracking-wider">Test</span>
                                </h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <p className="text-xs text-gray-300">Probando tu agente en tiempo real</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 relative z-10">
                            <button
                                onClick={handleClearChat}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Reiniciar conversación"
                            >
                                <Zap className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Simulator Badge */}
                    <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <p className="text-[11px] text-amber-700 leading-tight">
                            <span className="font-semibold">Modo Simulador:</span> Las respuestas son idénticas a WhatsApp. Las citas agendadas aquí son reales.
                        </p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-[#f0f2f5] flex flex-col gap-3 min-h-[300px] max-h-[350px]"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'400\' height=\'400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23d1d5db\' opacity=\'0.15\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'1\'/%3E%3Ccircle cx=\'150\' cy=\'100\' r=\'1\'/%3E%3Ccircle cx=\'250\' cy=\'50\' r=\'1\'/%3E%3Ccircle cx=\'350\' cy=\'100\' r=\'1\'/%3E%3Ccircle cx=\'100\' cy=\'150\' r=\'1\'/%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'1\'/%3E%3Ccircle cx=\'300\' cy=\'150\' r=\'1\'/%3E%3Ccircle cx=\'50\' cy=\'250\' r=\'1\'/%3E%3Ccircle cx=\'150\' cy=\'300\' r=\'1\'/%3E%3Ccircle cx=\'250\' cy=\'250\' r=\'1\'/%3E%3Ccircle cx=\'350\' cy=\'300\' r=\'1\'/%3E%3Ccircle cx=\'100\' cy=\'350\' r=\'1\'/%3E%3Ccircle cx=\'200\' cy=\'400\' r=\'1\'/%3E%3Ccircle cx=\'300\' cy=\'350\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}
                    >
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}
                            >
                                <div
                                    className={`px-3 py-2 text-[13px] leading-relaxed shadow-sm ${msg.sender === 'user'
                                        ? 'bg-[#d9fdd3] text-charcoal rounded-lg rounded-tr-sm'
                                        : 'bg-white text-charcoal rounded-lg rounded-tl-sm'
                                        }`}
                                    style={{ whiteSpace: 'pre-wrap' }}
                                >
                                    {msg.text}
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                                        {msg.sender === 'user' && (
                                            <svg className="w-3 h-3 text-blue-400" viewBox="0 0 16 11" fill="currentColor">
                                                <path d="M11.07.02L4.43 6.97 2.42 4.94 0 7.37l4.43 4.46L13.49 2.44z" />
                                                <path d="M15.07.02L8.43 6.97l-.72-.73L5.29 8.66l3.14 3.17L17.49 2.44z" style={{ transform: 'translateX(-2px)' }} />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                {Number(msg.toolsUsed) > 0 && (
                                    <span className="text-[9px] text-gray-400 mt-0.5 ml-1 flex items-center gap-1">
                                        <Zap className="w-2.5 h-2.5" />{msg.toolsUsed} herramienta{(msg.toolsUsed || 0) > 1 ? 's' : ''} usada{(msg.toolsUsed || 0) > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="self-start max-w-[85%]">
                                <div className="bg-white px-4 py-3 rounded-lg rounded-tl-sm shadow-sm flex gap-1.5">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies (only at start) */}
                    {!isTyping && messages.length <= 2 && (
                        <div className="px-3 py-2 bg-[#f0f2f5] border-t border-gray-200 flex flex-wrap gap-1.5">
                            {quickReplies.map((reply) => (
                                <button
                                    key={reply}
                                    onClick={() => handleSend(reply)}
                                    className="text-[11px] bg-white border border-gray-200 text-primary-700 px-3 py-1.5 rounded-full hover:bg-primary-50 hover:border-primary-300 transition-all font-medium shadow-sm"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div className="px-3 py-2 bg-[#f0f2f5] border-t border-gray-200">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend(input);
                            }}
                            className="flex items-center gap-2"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe como si fueras un paciente..."
                                disabled={isTyping}
                                className="flex-1 bg-white border-none rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 text-charcoal shadow-sm disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary-500 hover:bg-primary-600 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 hover:from-primary-600 hover:to-primary-800 text-white transition-all hover:scale-110 active:scale-95"
                >
                    {/* Pulse ring */}
                    <div className="absolute inset-0 rounded-full bg-primary-500 opacity-30 animate-ping"></div>
                    <MessageCircle className="w-6 h-6 relative z-10" />

                    {/* Badge */}
                    {showBadge && (
                        <span className="absolute -top-1 -right-1 flex">
                            <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white items-center justify-center">
                                <Sparkles className="w-2 h-2 text-white" />
                            </span>
                        </span>
                    )}

                    {/* Tooltip */}
                    <span className="absolute right-full mr-3 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        Probar agente IA
                    </span>
                </button>
            )}

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
