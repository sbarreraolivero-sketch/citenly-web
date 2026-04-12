import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Phone, Send, Sparkles, MessageSquare, RefreshCw, Bot, User, BellOff, ArrowLeft, Shield } from 'lucide-react'
import { cn, formatPhoneNumber, getInitials } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAdminAuth } from '@/contexts/AdminAuthContext'

// HQ specific ID
const HQ_CLINIC_ID = '00000000-0000-0000-0000-000000000000'

interface Message {
    id: string
    phone_number: string
    direction: 'inbound' | 'outbound'
    content: string
    ai_generated: boolean
    ai_function_called: string | null
    created_at: string
}

interface Conversation {
    phone_number: string
    patient_name: string | null
    last_message: string
    last_message_at: string
    unread_count: number
    message_count: number
    requires_human: boolean
}

export default function AdminMessages() {
    useAdminAuth() // Keep the hook for auth check, but removed unused destructuring
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [sending, setSending] = useState(false)
    const [togglingAI, setTogglingAI] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const chatRef = useRef<HTMLDivElement>(null)

    const selectedPhoneRef = useRef<string | null>(selectedPhone)
    useEffect(() => {
        selectedPhoneRef.current = selectedPhone
    }, [selectedPhone])

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
    }, [])

    const fetchConversations = useCallback(async () => {
        try {
            // Fetch messages for HQ Clinic
            const { data: msgs, error } = await (supabase as any)
                .from('messages')
                .select('phone_number, content, direction, created_at, is_read')
                .eq('clinic_id', HQ_CLINIC_ID)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching conversations:', error)
                return
            }
            if (!msgs || msgs.length === 0) {
                setConversations([])
                setLoading(false)
                return
            }

            // Group by phone number
            const phoneMap = new Map<string, { messages: any[], count: number }>()
            msgs.forEach((m: any) => {
                if (!phoneMap.has(m.phone_number)) {
                    phoneMap.set(m.phone_number, { messages: [], count: 0 })
                }
                const entry = phoneMap.get(m.phone_number)!
                entry.messages.push(m)
                entry.count++
            })

            // Fetch prospect names for HQ
            const phones = Array.from(phoneMap.keys())
            const { data: prospects } = await (supabase as any)
                .from('crm_prospects')
                .select('phone, name, requires_human')
                .eq('clinic_id', HQ_CLINIC_ID)
                .in('phone', phones)

            const nameMap = new Map<string, string>()
            const humanMap = new Map<string, boolean>()
            prospects?.forEach((p: any) => {
                if (p.name) nameMap.set(p.phone, p.name)
                humanMap.set(p.phone, !!p.requires_human)
            })

            // Build conversations
            const convs: Conversation[] = Array.from(phoneMap.entries()).map(([phone, data]) => {
                const latest = data.messages[0]
                let unread = 0
                for (const m of data.messages) {
                    if (m.direction === 'inbound') {
                        if (m.is_read === false) unread++
                    } else {
                        break
                    }
                }
                return {
                    phone_number: phone,
                    patient_name: nameMap.get(phone) || null,
                    last_message: latest.content,
                    last_message_at: latest.created_at,
                    unread_count: unread,
                    message_count: data.count,
                    requires_human: humanMap.get(phone) || false
                }
            })

            convs.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
            setConversations(convs)

            if (!selectedPhoneRef.current && convs.length > 0 && window.innerWidth >= 768) {
                setSelectedPhone(convs[0].phone_number)
            }
        } catch (e) {
            console.error('Error:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchMessages = useCallback(async () => {
        if (!selectedPhone) return
        setLoadingMessages(true)
        try {
            // Mark as read
            await (supabase as any)
                .from('messages')
                .update({ is_read: true })
                .eq('clinic_id', HQ_CLINIC_ID)
                .eq('phone_number', selectedPhone)
                .eq('direction', 'inbound')
                .eq('is_read', false)

            const { data, error } = await (supabase as any)
                .from('messages')
                .select('*')
                .eq('clinic_id', HQ_CLINIC_ID)
                .eq('phone_number', selectedPhone)
                .order('created_at', { ascending: true })
                .limit(100)

            if (error) throw error
            setMessages(data || [])
            scrollToBottom()
        } catch (e) {
            console.error('Error fetching messages:', e)
        } finally {
            setLoadingMessages(false)
        }
    }, [selectedPhone, scrollToBottom])

    useEffect(() => {
        fetchConversations()
    }, [fetchConversations])

    useEffect(() => {
        if (selectedPhone) fetchMessages()
    }, [selectedPhone, fetchMessages])

    // Subscription
    useEffect(() => {
        const channel = supabase
            .channel(`hq-messages`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `clinic_id=eq.${HQ_CLINIC_ID}`,
            }, async (payload) => {
                const newMsg = payload.new as (Message & { is_read: boolean })
                
                if (newMsg.direction === 'inbound' && newMsg.phone_number === selectedPhoneRef.current) {
                    await (supabase as any).from('messages').update({ is_read: true }).eq('id', newMsg.id)
                    newMsg.is_read = true
                    setMessages(prev => [...prev, newMsg])
                    scrollToBottom()
                }
                fetchConversations()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchConversations, scrollToBottom])

    const toggleAIStatus = async (conv: Conversation) => {
        if (togglingAI) return
        setTogglingAI(true)
        try {
            const newStatus = !conv.requires_human
            const { error } = await (supabase as any)
                .from('crm_prospects')
                .update({ requires_human: newStatus })
                .eq('clinic_id', HQ_CLINIC_ID)
                .eq('phone', conv.phone_number)

            if (error) throw error
            setConversations(prev => prev.map(c =>
                c.phone_number === conv.phone_number ? { ...c, requires_human: newStatus } : c
            ))
        } catch (e) {
            console.error('Error toggling AI status:', e)
        } finally {
            setTogglingAI(false)
        }
    }

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedPhone || sending) return
        setSending(true)
        try {
            const { data: clinic } = await (supabase as any)
                .from('clinic_settings')
                .select('ycloud_api_key, ycloud_phone_number')
                .eq('id', HQ_CLINIC_ID)
                .single()

            if (!clinic?.ycloud_api_key) {
                alert('No se encontró API Key de YCloud para HQ.')
                return
            }

            const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': clinic.ycloud_api_key },
                body: JSON.stringify({
                    from: clinic.ycloud_phone_number,
                    to: selectedPhone,
                    type: 'text',
                    text: { body: newMessage.trim() }
                })
            })

            if (!res.ok) throw new Error('YCloud error')

            await (supabase as any).from('messages').insert({
                clinic_id: HQ_CLINIC_ID,
                phone_number: selectedPhone,
                direction: 'outbound',
                content: newMessage.trim(),
                ai_generated: false
            })

            setNewMessage('')
        } catch (e) {
            console.error('Send error:', e)
            alert('Error al enviar mensaje.')
        } finally {
            setSending(false)
        }
    }

    const filteredConversations = conversations.filter(
        c => c.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.phone_number.includes(searchQuery)
    )

    const selectedConversation = conversations.find(c => c.phone_number === selectedPhone)

    const groupedMessages = messages.reduce((acc, msg) => {
        const dateKey = new Date(msg.created_at).toLocaleDateString()
        if (!acc[dateKey]) acc[dateKey] = []
        acc[dateKey].push(msg)
        return acc
    }, {} as Record<string, Message[]>)

    if (!loading && conversations.length === 0) {
        return (
            <div className="h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-gray-50">
                <div className="text-center max-w-md bg-white p-12 rounded-3xl shadow-xl border border-gray-100">
                    <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-10 h-10 text-primary-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin prospectos aún</h2>
                    <p className="text-gray-500">
                        Los mensajes del HQ aparecerán aquí cuando los prospectos escriban por WhatsApp al número de Citenly.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
            {/* List */}
            <div className={cn(
                "w-full md:w-96 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full",
                selectedPhone ? "hidden md:flex" : "flex"
            )}>
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                             <Shield className="w-5 h-5 text-primary-500" />
                             Prospectos HQ
                        </h2>
                        <button onClick={() => { setLoading(true); fetchConversations() }} className="p-2 text-gray-400 hover:text-primary-500 hover:bg-white rounded-xl transition-all">
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o celular..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.phone_number}
                                onClick={() => setSelectedPhone(conv.phone_number)}
                                className={cn(
                                    'w-full p-5 flex items-start gap-4 text-left transition-all border-b border-gray-50',
                                    selectedPhone === conv.phone_number ? 'bg-primary-50/50 border-l-4 border-l-primary-500' : 'hover:bg-gray-50'
                                )}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-sm">
                                        <span className="text-lg font-bold text-gray-600">
                                            {getInitials(conv.patient_name || conv.phone_number.slice(-4))}
                                        </span>
                                    </div>
                                    {conv.unread_count > 0 && (
                                        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="font-bold text-gray-900 truncate">
                                            {conv.patient_name || formatPhoneNumber(conv.phone_number)}
                                        </p>
                                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                            {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate line-clamp-1">
                                        {conv.last_message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        {conv.requires_human && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                                <BellOff className="w-3 h-3" /> ATENCIÓN HUMANA
                                            </span>
                                        )}
                                        {!conv.requires_human && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                <Sparkles className="w-3 h-3" /> IA CONSULTOR
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat */}
            <div className={cn(
                "flex-1 flex flex-col h-full bg-white relative",
                selectedPhone ? "flex" : "hidden md:flex"
            )}>
                {selectedConversation ? (
                    <>
                        <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-10">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setSelectedPhone(null)} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 md:hidden">
                                    <ArrowLeft className="w-6 h-6" />
                                </button>
                                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white shadow-md">
                                    <span className="text-lg font-bold">
                                        {getInitials(selectedConversation.patient_name || selectedConversation.phone_number.slice(-4))}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-lg leading-tight">
                                        {selectedConversation.patient_name || formatPhoneNumber(selectedConversation.phone_number)}
                                    </p>
                                    <p className="text-sm text-gray-400 flex items-center gap-1.5 font-medium">
                                        <Phone className="w-3.5 h-3.5" />
                                        {formatPhoneNumber(selectedConversation.phone_number)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleAIStatus(selectedConversation)}
                                    disabled={togglingAI}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm",
                                        selectedConversation.requires_human
                                            ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                            : "bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100"
                                    )}
                                >
                                    {selectedConversation.requires_human ? <BellOff className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                    {selectedConversation.requires_human ? "REINICIAR IA" : "PAUSAR IA"}
                                </button>
                            </div>
                        </div>

                        <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8f9fa] scrollbar-soft">
                            {loadingMessages ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                                </div>
                            ) : Object.entries(groupedMessages).map(([date, dayMsgs]) => (
                                <div key={date} className="space-y-4">
                                    <div className="flex justify-center">
                                        <span className="px-4 py-1.5 bg-white shadow-sm border border-gray-100 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {date}
                                        </span>
                                    </div>
                                    {dayMsgs.map((msg) => (
                                        <div key={msg.id} className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
                                            <div className={cn(
                                                'max-w-[80%] md:max-w-[70%] rounded-2xl p-4 shadow-sm',
                                                msg.direction === 'outbound' 
                                                    ? 'bg-primary-600 text-white rounded-tr-none' 
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                            )}>
                                                <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                                                <div className={cn('flex items-center gap-2 mt-2 text-[10px] font-bold uppercase tracking-wider', msg.direction === 'outbound' ? 'text-white/60' : 'text-gray-400')}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {msg.direction === 'outbound' && (
                                                        <span className="flex items-center gap-1 border-l border-white/20 pl-2">
                                                            {msg.ai_generated ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                            {msg.ai_generated ? 'IA' : 'MANUAL'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 bg-white border-t border-gray-100">
                            <div className="flex items-end gap-3 max-w-5xl mx-auto">
                                <div className="flex-1">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                                        placeholder="Escribe un mensaje estratégico..."
                                        rows={1}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all resize-none shadow-inner"
                                    />
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || sending}
                                    className="p-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale"
                                >
                                    {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center p-12 bg-white rounded-3xl shadow-xl border border-gray-100 max-w-sm">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <MessageSquare className="w-12 h-12 text-gray-200" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Canal de Ventas HQ</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                Selecciona una conversación para gestionar la relación con el prospecto. El Consultor IA está configurado para ayudarles a descubrir el valor de Citenly.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function Loader2({ className }: { className?: string }) {
    return <RefreshCw className={cn("animate-spin", className)} />
}
