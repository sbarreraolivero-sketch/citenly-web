import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
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
        description: "Busca información en la base de conocimiento de la clínica.",
        parameters: { type: "object", properties: { query: { type: "string", description: "Tema o pregunta a buscar" } }, required: ["query"] }
    }
];

// =============================================
// Tool implementations (simplified for simulator)
// =============================================
const checkAvail = async (sb: ReturnType<typeof createClient>, clinicId: string, date: string, serviceName?: string, timezone?: string) => {
    try {
        const tz = timezone || "America/Santiago";
        // Parse date in clinic timezone
        const startOfDay = new Date(date + "T00:00:00");
        const endOfDay = new Date(date + "T23:59:59");

        const { data: existing } = await sb.from("appointments")
            .select("time, service, status, duration_minutes")
            .eq("clinic_id", clinicId)
            .gte("appointment_date", startOfDay.toISOString())
            .lte("appointment_date", endOfDay.toISOString())
            .in("status", ["pending", "confirmed"]);

        const { data: clinic } = await sb.from("clinic_settings")
            .select("working_hours, services")
            .eq("id", clinicId)
            .single();

        if (!clinic) return { error: "No se encontró configuración de la clínica." };

        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayOfWeek = dayNames[startOfDay.getDay()];
        const hours = clinic.working_hours?.[dayOfWeek];

        if (!hours || hours.closed) {
            return { available: false, message: `La clínica está cerrada el ${dayOfWeek}. Horarios disponibles: ${JSON.stringify(clinic.working_hours)}` };
        }

        // Find service duration
        let duration = 60;
        if (serviceName && clinic.services) {
            const svc = clinic.services.find((s: any) => s.name.toLowerCase().includes(serviceName.toLowerCase()));
            if (svc) duration = svc.duration || 60;
        }

        const bookedTimes = (existing || []).map((a: any) => `${a.time} (${a.service}, ${a.status})`);

        return {
            available: true,
            date,
            day: dayOfWeek,
            hours: `${hours.start} - ${hours.end}`,
            booked_slots: bookedTimes,
            service_duration: duration,
            message: `Disponibilidad para ${date}: Horario ${hours.start} - ${hours.end}. Citas existentes: ${bookedTimes.length > 0 ? bookedTimes.join(", ") : "ninguna"}. Duración del servicio: ${duration} min. Sugiere horarios que NO conflicten con las citas existentes.`
        };
    } catch (e) {
        console.error("checkAvail error:", e);
        return { error: "Error verificando disponibilidad." };
    }
};

const createAppt = async (sb: ReturnType<typeof createClient>, clinicId: string, simulatedPhone: string, args: any, timezone: string) => {
    try {
        const { data: clinic } = await sb.from("clinic_settings")
            .select("services")
            .eq("id", clinicId)
            .single();

        let price = 0;
        let duration = 60;
        if (clinic?.services) {
            const svc = clinic.services.find((s: any) => s.name.toLowerCase().includes(args.service_name?.toLowerCase() || ""));
            if (svc) { price = svc.price || 0; duration = svc.duration || 60; }
        }

        const appointmentDate = new Date(`${args.date}T${args.time}:00`);

        const { data, error } = await sb.from("appointments").insert({
            clinic_id: clinicId,
            patient_name: args.patient_name,
            phone_number: simulatedPhone,
            service: args.service_name,
            appointment_date: appointmentDate.toISOString(),
            time: args.time,
            duration_minutes: duration,
            price,
            status: "confirmed",
            payment_status: "pending",
            source: "simulator"
        }).select("id").single();

        if (error) throw error;

        return {
            success: true,
            appointment_id: data?.id,
            message: `✅ Cita agendada: ${args.patient_name} el ${args.date} a las ${args.time} para ${args.service_name}. Precio: $${price.toLocaleString()}. (NOTA INTERNA: Cita creada desde el simulador)`
        };
    } catch (e) {
        console.error("createAppt error:", e);
        return { error: "Error creando la cita." };
    }
};

const getServices = async (sb: ReturnType<typeof createClient>, clinicId: string) => {
    const { data } = await sb.from("clinic_settings").select("services").eq("id", clinicId).single();
    return { services: data?.services || [], message: "Estos son los servicios y precios disponibles." };
};

const getKnowledge = async (sb: ReturnType<typeof createClient>, clinicId: string, query: string) => {
    try {
        const { data: docs } = await sb.from("knowledge_base")
            .select("title, content, category")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .or(`title.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`)
            .limit(3);

        if (!docs || docs.length === 0) return { found: false, message: "No encontré información sobre eso en la base de conocimiento." };
        return { found: true, message: docs.map((d: any) => `📄 ${d.title}: ${d.content}`).join("\n\n") };
    } catch {
        return { found: false, message: "Error buscando en base de conocimiento." };
    }
};

// =============================================
// Process tool calls
// =============================================
const processFunc = async (sb: ReturnType<typeof createClient>, clinicId: string, simulatedPhone: string, funcName: string, args: any, timezone: string) => {
    switch (funcName) {
        case "check_availability": return checkAvail(sb, clinicId, args.date, args.service_name, timezone);
        case "create_appointment": return createAppt(sb, clinicId, simulatedPhone, args, timezone);
        case "get_services": return getServices(sb, clinicId);
        case "get_knowledge": return getKnowledge(sb, clinicId, args.query);
        default: return { message: `(Función ${funcName} no disponible en el simulador. En WhatsApp real sí funcionaría.)` };
    }
};

// =============================================
// Call OpenAI
// =============================================
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

// =============================================
// Get knowledge summary for system prompt
// =============================================
const getKnowledgeSummary = async (sb: ReturnType<typeof createClient>, clinicId: string) => {
    try {
        const { data: docs } = await sb.from("knowledge_base")
            .select("title, content, category")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .limit(5);

        if (!docs || docs.length === 0) return "";
        return "\n\nBase de Conocimiento de la Clínica:\n" +
            docs.map((d: any) => `- ${d.title} (${d.category}): ${d.content.substring(0, 300)}`).join("\n");
    } catch {
        return "";
    }
};

// =============================================
// Main Handler
// =============================================
Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const { clinic_id, message, conversation_history } = await req.json();

        if (!clinic_id || !message) {
            return new Response(JSON.stringify({ error: "clinic_id y message son requeridos." }), { status: 400, headers: corsHeaders });
        }

        const sb = getSupabase();

        // 1. Get clinic config
        const { data: clinic, error: clinicError } = await sb.from("clinic_settings")
            .select("*")
            .eq("id", clinic_id)
            .single();

        if (clinicError || !clinic) {
            return new Response(JSON.stringify({ error: "Clínica no encontrada." }), { status: 404, headers: corsHeaders });
        }

        // 2. Get OpenAI key
        const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
        if (!openaiKey) {
            return new Response(JSON.stringify({ error: "OpenAI API key no configurada." }), { status: 500, headers: corsHeaders });
        }

        // 3. Build system prompt (same as webhook)
        const localTime = new Date().toLocaleString("es-MX", {
            timeZone: clinic.timezone || "America/Santiago",
            weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
        });

        const knowledgeSummary = await getKnowledgeSummary(sb, clinic_id);
        const simulatedPhone = "+56900000000"; // Simulated test phone

        const sysPrompt = `${clinic.ai_personality}

Clínica: ${clinic.clinic_name}
Dirección: ${clinic.address || "No especificada"}
Fecha/Hora actual: ${localTime}
Servicios: ${JSON.stringify(clinic.services)}
Horarios: ${JSON.stringify(clinic.working_hours)}
${knowledgeSummary}

⚠️ MODO SIMULADOR: Estás en modo de prueba dentro de la app. Responde EXACTAMENTE como lo harías en WhatsApp real. Las citas que agendes aquí serán reales y aparecerán en el calendario. El número del paciente es simulado.

${clinic.ai_behavior_rules || "Sin reglas específicas adicionales."}`;

        // 4. Build messages array
        const msgs: Msg[] = [{ role: "system", content: sysPrompt }];

        // Add conversation history
        if (conversation_history && Array.isArray(conversation_history)) {
            for (const msg of conversation_history) {
                msgs.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
            }
        }

        // Add current message
        msgs.push({ role: "user", content: message });

        // 5. Call OpenAI with tool loop (same pattern as webhook)
        let res = await callOpenAI(openaiKey, clinic.openai_model || "gpt-4o-mini", msgs);
        let assistant = res.choices[0].message;
        let loopCount = 0;
        const maxLoops = 5;

        while (assistant.function_call && loopCount < maxLoops) {
            const funcName = assistant.function_call.name;
            let funcArgs: any = {};
            try { funcArgs = JSON.parse(assistant.function_call.arguments); } catch { }

            console.log(`[Simulator] Tool call: ${funcName}`, funcArgs);

            const result = await processFunc(sb, clinic_id, simulatedPhone, funcName, funcArgs, clinic.timezone || "America/Santiago");

            // Add assistant's function call + result to messages
            msgs.push({ role: "assistant", content: "", function_call: assistant.function_call });
            msgs.push({ role: "function", name: funcName, content: JSON.stringify(result) });

            // Call OpenAI again with the result
            res = await callOpenAI(openaiKey, clinic.openai_model || "gpt-4o-mini", msgs);
            assistant = res.choices[0].message;
            loopCount++;
        }

        const reply = assistant.content || "No pude generar una respuesta.";

        return new Response(JSON.stringify({
            reply,
            tools_used: loopCount,
            model: clinic.openai_model || "gpt-4o-mini"
        }), { headers: corsHeaders });

    } catch (err: any) {
        console.error("[Simulator] Error:", err);
        return new Response(JSON.stringify({ error: err.message || "Error interno." }), { status: 500, headers: corsHeaders });
    }
});
