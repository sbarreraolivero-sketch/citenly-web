import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info"
};

interface Msg { role: "system" | "user" | "assistant" | "function"; content: string; name?: string; function_call?: { name: string; arguments: string }; }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const getSupabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// =============================================
// OpenAI Function Definitions (Same as webhook)
// =============================================
const functions = [
    {
        name: "check_availability",
        description: "Verifica disponibilidad de horarios. Infiere el servicio de la conversación.",
        parameters: { type: "object", properties: { date: { type: "string", description: "Fecha YYYY-MM-DD" }, service_name: { type: "string", description: "Nombre del servicio" }, professional_name: { type: "string", description: "Nombre del profesional (opcional)" } }, required: ["date"] }
    },
    {
        name: "create_appointment",
        description: "Crea nueva cita cuando paciente confirma fecha, hora y servicio",
        parameters: { type: "object", properties: { patient_name: { type: "string" }, date: { type: "string" }, time: { type: "string" }, service_name: { type: "string" }, professional_name: { type: "string", description: "Profesional solicitado (opcional)" } }, required: ["patient_name", "date", "time", "service_name"] }
    },
    {
        name: "get_services",
        description: "Lista servicios disponibles con precios y duración",
        parameters: { type: "object", properties: {}, required: [] }
    },
    {
        name: "get_knowledge",
        description: "Busca información detallada en la base de conocimiento (precios, tratamientos, cuidados, valores, promociones). ÚSALO SIEMPRE ante preguntas sobre costos o temas específicos que no estén en tu configuración básica.",
        parameters: { type: "object", properties: { query: { type: "string", description: "Palabras clave simplificadas para la búsqueda (ej: 'precios', 'labios', 'cuidados', 'promocion')" } }, required: ["query"] }
    },
    {
        name: "tag_patient",
        description: "Asigna una etiqueta al paciente para segmentación y marketing. ÚSALA PROACTIVAMENTE cuando: (1) El paciente muestra interés en un servicio específico → etiqueta 'Interés [Servicio]' (ej: 'Interés Microblading'). (2) El paciente agenda una cita → etiqueta 'Cliente [Servicio]'. (3) Detectas una condición relevante → etiqueta descriptiva (ej: 'Piel Sensible', 'Primera Vez'). (4) El paciente es recurrente → 'Cliente Frecuente'. (5) El paciente refiere a alguien → 'Referidor'. Puedes llamar esta función múltiples veces para asignar varias etiquetas. La etiqueta se crea automáticamente si no existe.",
        parameters: {
            type: "object",
            properties: {
                tag_name: { type: "string", description: "Nombre de la etiqueta. Usa formato capitalizado y descriptivo. Ej: 'Interés Microblading', 'Cliente Frecuente', 'VIP', 'Piel Sensible', 'Primera Vez'" },
                tag_color: { type: "string", description: "Color hex de la etiqueta. Usa: #10B981 (verde) para clientes activos, #3B82F6 (azul) para intereses, #F59E0B (amarillo) para alertas, #EF4444 (rojo) para condiciones médicas, #8B5CF6 (morado) para VIP/especiales, #EC4899 (rosado) para servicios estéticos. Opcional, default azul." }
            },
            required: ["tag_name"]
        }
    }
];

// =============================================
// Helper functions
// =============================================
const getOffset = (timeZone: string = "America/Santiago", date: Date) => {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone,
            timeZoneName: 'shortOffset'
        }).formatToParts(date);
        const name = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-3';
        const match = name.match(/([+-])(\d+)(?::(\d+))?/);
        if (match) {
            const [_, sign, h, m] = match;
            return `${sign}${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
        }
        return "-03:00";
    } catch (e) { return "-03:00"; }
};

const getLocalDayName = (date: Date, timeZone: string): string => {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).formatToParts(date);
    const shortDay = parts.find(p => p.type === 'weekday')?.value?.toLowerCase() || '';
    
    if (shortDay.includes('sun')) return 'domingo';
    if (shortDay.includes('mon')) return 'lunes';
    if (shortDay.includes('tue')) return 'martes';
    if (shortDay.includes('wed')) return 'miércoles';
    if (shortDay.includes('thu')) return 'jueves';
    if (shortDay.includes('fri')) return 'viernes';
    if (shortDay.includes('sat')) return 'sábado';
    
    return days[date.getDay()];
};

const debugLog = async (sb: any, msg: string, payload: any) => {
    try {
        await sb.from("debug_logs").insert({ message: msg, payload });
    } catch (e) {
        console.error("Debug log failed:", e);
    }
};

// =============================================
// Tool implementations
// =============================================
const checkAvail = async (sb: any, clinicId: string, date: string, serviceName?: string, timezone?: string, professionalName?: string, clinicWorkingHours?: any) => {
    try {
        const tz = timezone || "America/Santiago";
        let duration = 60;
        let serviceId: string | null = null;
        let professionalId: string | null = null;

        if (serviceName) {
            const { data: svc } = await sb.from("services")
                .select("id, duration")
                .eq("clinic_id", clinicId)
                .ilike("name", `%${serviceName}%`)
                .limit(1)
                .maybeSingle();
            if (svc) {
                duration = svc.duration;
                serviceId = svc.id;
            }
        }

        if (professionalName) {
            const { data: prof } = await sb.from("clinic_members")
                .select("id")
                .eq("clinic_id", clinicId)
                .or(`first_name.ilike.%${professionalName}%,last_name.ilike.%${professionalName}%,job_title.ilike.%${professionalName}%`)
                .limit(1)
                .maybeSingle();
            if (prof) professionalId = prof.id;
        }

        if (!professionalId && serviceId) {
            const { data: sp } = await sb.from("service_professionals")
                .select("member_id")
                .eq("service_id", serviceId)
                .eq("is_primary", true)
                .maybeSingle();
            if (sp) professionalId = sp.member_id;
        }

        let slots: { slot_time: string, is_available: boolean }[] = [];

        if (professionalId) {
            const { data, error } = await sb.rpc("get_professional_available_slots", {
                p_clinic_id: clinicId,
                p_member_id: professionalId,
                p_date: date,
                p_duration: duration,
                p_timezone: tz,
                p_interval: duration
            });
            if (!error && data) slots = data;
        }

        if (slots.length === 0) {
            const { data, error } = await sb.rpc("get_available_slots", {
                p_clinic_id: clinicId,
                p_date: date,
                p_duration: duration,
                p_timezone: tz,
                p_interval: duration
            });
            if (!error && data) slots = data;
        }

        if (slots.length === 0) {
            return { available: false, message: `No hay disponibilidad para el ${date}. Sugiere otro día de lunes a viernes.` };
        }

        const dow = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(date + 'T12:00:00').getDay()];
        const dayConfig = clinicWorkingHours?.[dow];
        const lunch = dayConfig?.lunch_break;

        const availableSlots = slots
            .filter(s => s.is_available)
            .filter(s => {
                if (!lunch || !lunch.enabled) return true;
                const tStart = s.slot_time.substring(0, 5);
                const [h, m] = tStart.split(':').map(Number);
                const endDate = new Date(2000, 0, 1, h, m + duration);
                const tEnd = endDate.toTimeString().substring(0, 5);
                const lStart = lunch.start;
                const lEnd = lunch.end;
                return !(tStart < lEnd && tEnd > lStart);
            })
            .map(s => {
                const t = s.slot_time.substring(0, 5);
                const h = parseInt(t.split(":")[0]);
                return `${h > 12 ? h - 12 : (h === 0 ? 12 : h)}:${t.split(":")[1]} ${h >= 12 ? "PM" : "AM"}`;
            });

        if (availableSlots.length === 0) {
            return { available: false, message: `Lo siento, no hay espacios libres disponibles para el ${date}.` };
        }

        const displaySlots = availableSlots.slice(0, 10);

        return {
            available: true,
            date,
            slots: displaySlots,
            message: `Para el ${date}, tenemos estos espacios disponibles para ${serviceName || 'tu cita'}: ${displaySlots.join(", ")}. ¿A qué hora te gustaría agendar?`
        };
    } catch (e) {
        console.error("checkAvail error:", e);
        return { error: "Error verificando disponibilidad." };
    }
};

const createAppt = async (sb: any, clinicId: string, simulatedPhone: string, args: any, timezone: string) => {
    try {
        let price = 0;
        let duration = 60;
        const { data: realServices } = await sb.from("services")
            .select("name, duration, price")
            .eq("clinic_id", clinicId);

        if (realServices && realServices.length > 0) {
            const svc = realServices.find((s: any) => s.name.toLowerCase().includes(args.service_name?.toLowerCase() || ""));
            if (svc) { price = svc.price || 0; duration = svc.duration || 60; }
        }

        let normalizedTime = args.time.replace(/[^\d:apmAPM\s]/g, '').trim();
        if (normalizedTime.toLowerCase().includes('pm') || normalizedTime.toLowerCase().includes('am')) {
            const isPM = normalizedTime.toLowerCase().includes('pm');
            let [h, m] = normalizedTime.replace(/[apmAPM\s]/g, '').split(':').map(Number);
            if (isPM && h < 12) h += 12;
            if (!isPM && h === 12) h = 0;
            normalizedTime = `${h.toString().padStart(2, '0')}:${(m || 0).toString().padStart(2, '0')}`;
        } else {
            const parts = normalizedTime.split(':');
            const h = parts[0].padStart(2, '0');
            const m = (parts[1] || '00').padStart(2, '0');
            normalizedTime = `${h}:${m}`;
        }

        const offset = getOffset(timezone, new Date(`${args.date}T12:00:00`));
        const appointmentDateWithOffset = `${args.date}T${normalizedTime}:00${offset}`;

        const { data, error } = await sb.from("appointments").insert({
            clinic_id: clinicId,
            patient_name: args.patient_name,
            phone_number: simulatedPhone,
            service: args.service_name,
            appointment_date: appointmentDateWithOffset,
            duration: duration,
            price,
            status: "pending",
            payment_status: "pending"
        }).select("id").single();

        if (error) {
            let errorMsg = "Error DB-AG-01: No pudimos registrar tu cita.";
            if (error.code === '23505') errorMsg = "Error DB-CONFLICT: Ya existe una cita con este teléfono.";
            return { success: false, message: errorMsg };
        }

        return {
            success: true,
            appointment_id: data?.id,
            message: `✅ Cita agendada: ${args.patient_name} el ${args.date} a las ${args.time} para ${args.service_name}. Precio: $${price.toLocaleString()}.`
        };
    } catch (e: any) {
        return { success: false, message: "Error técnico: Cita no guardada." };
    }
};

const getServices = async (sb: any, clinicId: string) => {
    const { data: realServices } = await sb.from("services")
        .select("name, duration, price")
        .eq("clinic_id", clinicId);

    if (realServices && realServices.length > 0) {
        const services = realServices.map(s => ({ name: s.name, duration: `${s.duration} min`, price: `$${s.price.toLocaleString('es-CL')}` }));
        return { services, message: "Estos son los servicios y precios disponibles." };
    }
    return { services: [], message: "No hay servicios disponibles." };
};

const getKnowledge = async (sb: any, clinicId: string, query: string) => {
    try {
        const { data: docs } = await sb.from("knowledge_base")
            .select("title, content, category")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .or(`title.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`)
            .limit(5);

        if (!docs || docs.length === 0) return { found: false, message: "No encontré información." };

        const results = docs.map((d: any) => `📄 ${d.title} (${d.category}):\n${d.content}`).join("\n\n---\n\n");
        return { found: true, message: results };
    } catch (e) { return { found: false, message: "Error al buscar conocimiento." }; }
};

const tagPatient = async (sb: any, clinicId: string, phone: string, args: { tag_name: string; tag_color?: string }) => {
    return { success: true, message: "Etiqueta simulada asignada." };
};

const processFunc = async (sb: any, clinicId: string, simulatedPhone: string, funcName: string, args: any, timezone: string, clinic?: any) => {
    switch (funcName) {
        case "check_availability": return checkAvail(sb, clinicId, args.date, args.service_name, timezone, args.professional_name, clinic?.working_hours);
        case "create_appointment": return createAppt(sb, clinicId, simulatedPhone, args, timezone);
        case "get_services": return getServices(sb, clinicId);
        case "get_knowledge": return getKnowledge(sb, clinicId, args.query);
        case "tag_patient": return tagPatient(sb, clinicId, simulatedPhone, args);
        default: return { message: `Función ${funcName} no disponible.` };
    }
};

const callOpenAI = async (key: string, model: string, msgs: Msg[], useFns = true) => {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model,
            messages: msgs,
            ...(useFns ? { functions, function_call: "auto" } : {}),
            temperature: 0.5,
            max_tokens: 800
        })
    });
    if (!r.ok) throw new Error(`OpenAI Error: ${await r.text()}`);
    return r.json();
};

const getKnowledgeSummary = async (sb: any, clinicId: string) => {
    try {
        const { data: docs } = await sb.from("knowledge_base")
            .select("title, content, category")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .limit(5);
        if (!docs || docs.length === 0) return "";
        return "\n\nBase de Conocimiento:\n" + docs.map((d: any) => `- ${d.title}: ${d.content.substring(0, 100)}...`).join("\n");
    } catch { return ""; }
};

// =============================================
// Main Handler
// =============================================
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { clinic_id, message, conversation_history } = await req.json();
        if (!clinic_id || !message) return new Response(JSON.stringify({ error: "clinic_id y message son requeridos." }), { status: 400, headers: corsHeaders });

        const sb = getSupabase();
        const { data: clinic, error: clinicError } = await sb.from("clinic_settings").select("*").eq("id", clinic_id).single();
        if (clinicError || !clinic) return new Response(JSON.stringify({ error: "Clínica no encontrada." }), { status: 404, headers: corsHeaders });

        const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
        const clinicTz = clinic.timezone || "America/Santiago";
        const now = new Date();
        const localTime = now.toLocaleString("es-CL", { timeZone: clinicTz, weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const localDateISO = now.toLocaleDateString("en-CA", { timeZone: clinicTz });
        const tomorrowISO = tomorrow.toLocaleDateString("en-CA", { timeZone: clinicTz });
        const dayAfterISO = dayAfter.toLocaleDateString("en-CA", { timeZone: clinicTz });

        const todayDay = getLocalDayName(now, clinicTz);
        const tomorrowDay = getLocalDayName(tomorrow, clinicTz);
        const dayAfterDay = getLocalDayName(dayAfter, clinicTz);

        const knowledgeSummary = await getKnowledgeSummary(sb, clinic_id);
        const simulatedPhone = "+56900000000";

        const { data: realServices } = await sb.from("services").select("name, duration, price").eq("clinic_id", clinic_id);
        const servicesForPrompt = realServices && realServices.length > 0
            ? realServices.map(s => ({ name: s.name, duration: `${s.duration} min`, price: `$${s.price.toLocaleString('es-CL')}` }))
            : clinic.services || [];

        const daysMap: { [key: string]: string } = { "monday": "lunes", "tuesday": "martes", "wednesday": "miércoles", "thursday": "jueves", "friday": "viernes", "saturday": "sábado", "sunday": "domingo" };
        const hoursSummary = Object.entries(clinic.working_hours || {})
            .map(([day, h]: [string, any]) => {
                const dayName = daysMap[day.toLowerCase()] || day;
                if (!h || h.closed || h.enabled === false) return `${dayName}: CERRADO`;
                const lunch = h.lunch_break;
                return `${dayName}: ${h.open || h.start || "10:00"} - ${h.close || h.end || "20:00"}${lunch?.enabled ? ` (Colación: ${lunch.start}-${lunch.end})` : ""}`;
            }).join(", ");

        const isElizabeth = (clinic.clinic_name?.toLowerCase().includes("elizabeth") || clinic.id === "1ab32091-210c-4525-a7e1-e6a7dca1c8c6");
        const lagRule = isElizabeth 
            ? `1. ANTICIPACIÓN OBLIGATORIA: Requerimos al menos un día completo de anticipación.
               - HOY (${todayDay.toUpperCase()}, ${localDateISO}) está BLOQUEADO.
               - MAÑANA (${tomorrowDay.toUpperCase()}, ${tomorrowISO}) está BLOQUEADO.
               - Solo puedes ofrecer a partir de PASADO MAÑANA (${dayAfterDay.toUpperCase()}, ${dayAfterISO}).`
            : "1. ANTICIPACIÓN: Puedes agendar incluso para el mismo día.";

        const sysPrompt = `### REGLA DE SINCRONIZACIÓN TEMPORAL (CRÍTICO):
IGNORA cualquier fecha o día de la semana mencionado anteriormente. La ÚNICA fuente de verdad es abajo.

FECHA Y HORA ACTUAL: ${localTime}

${clinic.ai_personality}

Clínica: ${clinic.clinic_name}
Horario General: ${hoursSummary}

### CONTEXTO DE FECHAS (FUENTE DE VERDAD ABSOLUTA):
- HOY ES: **${todayDay.toUpperCase()}**, ${localDateISO}
- MAÑANA ES: **${tomorrowDay.toUpperCase()}**, ${tomorrowISO}
- PASADO MAÑANA ES: **${dayAfterDay.toUpperCase()}**, ${dayAfterISO}

Servicios: ${JSON.stringify(servicesForPrompt)}
${knowledgeSummary}

⚠️ MODO SIMULADOR: Responde como en WhatsApp real.
REGLAS:
0. Sin límites de anticipación.
${lagRule}
2. Si un día está CERRADO, indícalo.
3. Verifica con check_availability antes de confirmar.
4. Usa las fechas ISO arriba para "mañana".
5. Los datos para el abono ($10.000) son: Elizabeth Hernández, RUT 18.342.131-k, Banco Estado, Cuenta Vista 80070001890.

${clinic.ai_behavior_rules || ""}`;

        await debugLog(sb, `AI Simulator Prompt Sync`, { prompt: sysPrompt.substring(0, 500), clinic_id });

        const msgs: Msg[] = [{ role: "system", content: sysPrompt }];
        if (conversation_history && Array.isArray(conversation_history)) {
            for (const msg of conversation_history) {
                msgs.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
            }
        }
        msgs.push({ role: "user", content: message });

        let res = await callOpenAI(openaiKey, clinic.openai_model || "gpt-4o-mini", msgs);
        let assistant = res.choices[0].message;
        let loopCount = 0;

        while (assistant.function_call && loopCount < 5) {
            const funcName = assistant.function_call.name;
            let funcArgs = {};
            try { funcArgs = JSON.parse(assistant.function_call.arguments); } catch {}
            const result = await processFunc(sb, clinic_id, simulatedPhone, funcName, funcArgs, clinicTz, clinic);
            msgs.push({ role: "assistant", content: "", function_call: assistant.function_call });
            msgs.push({ role: "function", name: funcName, content: JSON.stringify(result) });
            res = await callOpenAI(openaiKey, clinic.openai_model || "gpt-4o-mini", msgs);
            assistant = res.choices[0].message;
            loopCount++;
        }

        return new Response(JSON.stringify({ reply: assistant.content || "No pude responder." }), { headers: corsHeaders });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});
