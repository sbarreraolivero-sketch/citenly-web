import { useState, useEffect, useRef } from 'react';
import { Bot, Send, MessageSquare, ChevronDown, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
    id: string;
    sender: 'ai' | 'user';
    text: string;
}

interface AIChatWidgetProps {
    variant: 'sales' | 'support';
}

export function AIChatWidget({ variant }: AIChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isSales = variant === 'sales';

    // Config based on variant
    const config = {
        title: isSales ? 'Citenly AI' : 'Copilot de Soporte',
        subtitle: isSales ? 'Asesor de Crecimiento' : 'Te ayudo a usar Citenly',
        welcomeMessage: isSales
            ? '¡Hola! Soy la IA de Citenly. ¿Te gustaría saber cómo escalar la facturación de tu clínica sin gastar más en anuncios?'
            : '¡Hola! Soy tu Copilot. ¿En qué te puedo ayudar con la plataforma hoy?',
        quickReplies: isSales
            ? ['¿Cómo funciona?', 'Ver Precios', 'Agendar Demo']
            : ['¿Cómo creo una campaña?', 'No entiendo el CRM', 'Hablar con humano'],
        colorTheme: isSales ? 'from-charcoal to-gray-900' : 'from-primary-600 to-primary-800',
        buttonColor: isSales ? 'bg-charcoal hover:bg-gray-800' : 'bg-primary-600 hover:bg-primary-700',
        aiBubble: isSales ? 'bg-gray-100 text-charcoal' : 'bg-primary-50 text-charcoal',
    };

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Add welcome message when opened for the first time
            setMessages([
                { id: Date.now().toString(), sender: 'ai', text: config.welcomeMessage },
            ]);
        }
    }, [isOpen]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        // Add user message
        const newMessages: Message[] = [
            ...messages,
            { id: Date.now().toString(), sender: 'user', text },
        ];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            // Calling the Supabase Edge Function connected to OpenAI
            const { data, error } = await supabase.functions.invoke('chat-agent', {
                body: { messages: newMessages, variant }
            });

            if (error) throw error;

            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), sender: 'ai', text: data?.reply || 'Lo siento, no pude entender la solicitud.' },
            ]);
        } catch (err) {
            console.error("Error llamando edge function:", err);
            setMessages((prev) => [
                ...prev,
                { id: Date.now().toString(), sender: 'ai', text: 'Ups, tuvimos un problema de conexión al procesar tu mensaje. Intenta nuevamente.' },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className={`fixed bottom-6 ${isSales ? 'right-6' : 'right-6'} z-50`}>
            {/* Expanded Chat */}
            {isOpen && (
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-80 sm:w-96 flex flex-col overflow-hidden mb-4 transition-all duration-300 origin-bottom-right animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95">
                    {/* Header */}
                    <div className={`p-4 bg-gradient-to-r ${config.colorTheme} text-white flex justify-between items-center relative overflow-hidden`}>
                        {/* Subtle background effect */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm flex items-center gap-1.5">
                                    {config.title} <Sparkles className="w-3 h-3 text-yellow-400" />
                                </h3>
                                <div className="flex items-center gap-1.5 opacity-80">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                                    <p className="text-xs font-medium">{config.subtitle}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 overflow-y-auto h-96 bg-gray-50 flex flex-col gap-4">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                                    }`}
                            >
                                <div
                                    className={`p-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user'
                                        ? `${config.buttonColor} text-white rounded-br-sm`
                                        : `${config.aiBubble} rounded-bl-sm border border-gray-100/50 shadow-sm`
                                        }`}
                                >
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-gray-400 mt-1 font-medium px-1">
                                    {msg.sender === 'ai' ? config.title : 'Tú'}
                                </span>
                            </div>
                        ))}

                        {isTyping && (
                            <div className="self-start max-w-[85%]">
                                <div className={`${config.aiBubble} p-4 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm flex gap-1.5`}>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    {!isTyping && messages.length < 3 && (
                        <div className="px-4 pb-2 bg-gray-50 flex flex-wrap gap-2">
                            {config.quickReplies.map((reply) => (
                                <button
                                    key={reply}
                                    onClick={() => handleSend(reply)}
                                    className="text-xs bg-white border border-gray-200 text-charcoal px-3 py-1.5 rounded-full hover:border-primary-300 hover:text-primary-600 transition-colors shadow-sm font-medium"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSend(input);
                            }}
                            className="flex items-center gap-2 relative"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe un mensaje..."
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-all text-charcoal pr-10"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className={`absolute right-1 w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${input.trim() ? `${config.buttonColor} text-white` : 'text-gray-400'
                                    }`}
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Launcher Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 relative group ${config.buttonColor} text-white`}
                >
                    {/* Pulse effect */}
                    <div className={`absolute inset-0 rounded-full ${isSales ? 'bg-charcoal' : 'bg-primary-500'} opacity-40 animate-ping`}></div>
                    <MessageSquare className="w-6 h-6 relative z-10" />

                    {/* Notification badge */}
                    {messages.length === 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}
