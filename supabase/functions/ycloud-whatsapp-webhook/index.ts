import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, YCloud-Signature" };

interface YCloudPayload {
    id: string;
    type: string;
    createTime: string;
    whatsappInboundMessage?: {
        id: string;
        from: string;
        to: string;
        type: string;
        text?: { body: string };
        wamid?: string;
        context?: any;
    };
}

interface Msg { role: "system" | "user" | "assistant" | "function"; content: string; name?: string; function_call?: { name: string; arguments: string }; }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// =============================================
// OpenAI Function Definitions (Agent Tools)
// =============================================
const functions = [
    {
        name: "check_availability",
        description: "Verifica disponibilidad. CRÍTICO: Debes inferir el nombre del servicio del historial de conversación (ej. 'Microblading', 'Cejas'). Si no se especifica, busca en mensajes anteriores. Solo usa 'Consulta General' si es explícito.",
        parameters: { type: "object", properties: { date: { type: "string", description: "Fecha YYYY-MM-DD" }, service_name: { type: "string", description: "Nombre del servicio inferido del contexto" } }, required: ["date"] }
    },
    {
        name: "create_appointment",
        description: "Crea nueva cita cuando paciente confirma fecha, hora y servicio",
        parameters: { type: "object", properties: { patient_name: { type: "string" }, date: { type: "string" }, time: { type: "string" }, service_name: { type: "string" } }, required: ["patient_name", "date", "time", "service_name"] }
    },
    {
        name: "get_services",
        description: "Lista servicios disponibles con precios y duración",
        parameters: { type: "object", properties: {}, required: [] }
    },
    {
        name: "confirm_appointment",
        description: "Confirma o cancela cita pendiente",
        parameters: { type: "object", properties: { response: { type: "string", enum: ["yes", "no"] } }, required: ["response"] }
    },
    {
        name: "upsert_prospect",
        description: "Crea o actualiza un prospecto en el CRM cuando obtienes información del paciente como nombre, email, servicio de interés, o notas. Llámala cada vez que el paciente comparta datos personales o muestre interés en un servicio.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string", description: "Nombre completo del paciente" },
                email: { type: "string", description: "Email del paciente (opcional)" },
                service_interest: { type: "string", description: "Servicio en el que está interesado" },
                notes: { type: "string", description: "Notas relevantes de la conversación" }
            },
            required: ["name"]
        }
    },
    {
        name: "get_knowledge",
        description: "Busca información en la base de conocimiento de la clínica. Usa esta función cuando el paciente pregunte sobre políticas, promociones, preguntas frecuentes, horarios especiales, cuidados post-tratamiento, o cualquier información específica de la clínica.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Tema o pregunta a buscar en la base de conocimiento" }
            },
            required: ["query"]
        }
    },
];

// =============================================
// Supabase & Helper Functions
// =============================================
const getSupabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Debug Logger
const debugLog = async (sb: ReturnType<typeof createClient>, msg: string, payload: any) => {
    try {
        await sb.from("debug_logs").insert({ message: msg, payload });
    } catch (e) {
        console.error("Debug log failed:", e);
    }
};

const getClinic = async (sb: ReturnType<typeof createClient>, phone: string) => {
    console.log(`[getClinic] Looking up clinic for phone: ${phone}`);
    const clean = phone.replace(/^\+/, '');
    // Try matching exact, or with +, or without +
    const { data, error } = await sb.from("clinic_settings")
        .select("*")
        .or(`ycloud_phone_number.eq.${phone},ycloud_phone_number.eq.+${clean},ycloud_phone_number.eq.${clean}`)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(`[getClinic] Error looking up clinic:`, error);
        throw new Error(error.message);
    }
    if (!data) {
        console.warn(`[getClinic] No clinic found for phone: ${phone} (clean: ${clean})`);
    } else {
        console.log(`[getClinic] Found clinic: ${data.id} (${data.clinic_name})`);
    }
    return data;
};

const getHistory = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string) => {
    const { data } = await sb.from("messages").select("direction, content").eq("clinic_id", clinicId).eq("phone_number", phone).order("created_at", { ascending: false }).limit(15);
    return data?.reverse() || [];
};

const saveMsg = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, content: string, direction: string, extra = {}) => {
    const { error } = await sb.from("messages").insert({ clinic_id: clinicId, phone_number: phone, content, direction, ...extra });
    if (error) {
        console.error(`[saveMsg] Error inserting message (dir: ${direction}):`, error);
        throw new Error(`saveMsg failed: ${error.message}`);
    }
    console.log(`[saveMsg] Saved message (dir: ${direction})`);
};

// =============================================
// Tool Implementations
// =============================================
const checkAvail = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, date: string, serviceName?: string, timezone: string = "America/Santiago") => {
    // 1. Update CRM stage to "Calificado" (Interest shown)
    await updateProspectStage(sb, clinicId, phone, "Calificado");

    let duration = 60; // Default
    if (serviceName) {
        // Try to find service duration
        const { data: svc } = await sb.from("services")
            .select("duration")
            .eq("clinic_id", clinicId)
            .ilike("name", `%${serviceName}%`)
            .limit(1)
            .maybeSingle();
        if (svc?.duration) duration = svc.duration;
    }

    // Use p_interval = duration to step by the service length (e.g. 10:00, 12:00 for 120min service)
    console.log(`[checkAvail] Checking available slots for service '${serviceName}' (duration: ${duration}min)`);
    const { data, error } = await sb.rpc("get_available_slots", {
        p_clinic_id: clinicId,
        p_date: date,
        p_duration: duration,
        p_timezone: timezone,
        p_interval: duration
    });
    if (error) return { available: false, error: error.message };

    // Filter slots to have at least 'duration' gap? No, RPC handles availability.
    // But we might want to filter the OUTPUT to show broader intervals if duration is long?
    // User complained about "every 30 mins".
    // If duration > 60, maybe show slots every 60 mins?
    // Let's stick to showing all available slots for now, but limiting count.

    const slots = data?.filter((s: { is_available: boolean }) => s.is_available).map((s: { slot_time: string }) => {
        const t = s.slot_time.substring(0, 5);
        const h = parseInt(t.split(":")[0]);
        return `${h > 12 ? h - 12 : h}:${t.split(":")[1]} ${h >= 12 ? "PM" : "AM"}`;
    }) || [];

    // If lots of slots, maybe pick some spread out? 
    // e.g. if 10:00, 10:30, 11:00, 11:30... show 10:00, 11:00, 12:00?
    // Simple heuristic: if duration >= 60, show fewer slots?
    // Let's just return first 10 slots.

    const displaySlots = slots.slice(0, 8);

    return slots.length ? { available: true, slots: displaySlots, duration_used: duration, message: `Disponibilidad el ${date} (${duration} min): ${displaySlots.join(", ")}` } : { available: false, message: `No hay disponibilidad para ${date} con duración ${duration} min` };
};

// Helper to get timezone offset (e.g. "-03:00")
const getOffset = (timeZone: string = "America/Santiago", date: Date) => {
    try {
        const str = date.toLocaleString('en-US', { timeZone, timeZoneName: 'longOffset' });
        const match = str.match(/GMT([+-]\d{2}:\d{2})/);
        return match ? match[1] : "-03:00";
    } catch (e) { console.error("getOffset error", e); return "-03:00"; }
};

const createAppt = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, args: { patient_name: string; date: string; time: string; service_name: string }, timezone: string = "America/Santiago") => {
    let duration = 60;
    if (args.service_name) {
        const { data: svc } = await sb.from("services").select("duration").eq("clinic_id", clinicId).ilike("name", `%${args.service_name}%`).limit(1).maybeSingle();
        if (svc?.duration) duration = svc.duration;
    }

    const { data: avail } = await sb.rpc("check_availability", { p_clinic_id: clinicId, p_date: args.date, p_time: args.time, p_duration: duration, p_timezone: timezone });
    if (!avail) return { success: false, message: "Horario no disponible. ¿Ver otros?" };

    // Fix Timezone: Construct ISO string with offset
    const offset = getOffset(timezone, new Date(`${args.date}T12:00:00`));
    const appointmentDateWithOffset = `${args.date}T${args.time}:00${offset}`;

    const { data, error } = await sb.from("appointments").insert({
        clinic_id: clinicId, patient_name: args.patient_name, phone_number: phone,
        service: args.service_name, appointment_date: appointmentDateWithOffset, status: "pending", duration: duration
    }).select().single();
    if (error) return { success: false, message: "Error al agendar. Intenta de nuevo." };

    // Update CRM stage to "Cita Agendada"
    await updateProspectStage(sb, clinicId, phone, "Cita Agendada");

    const d = new Date(`${args.date}T${args.time}:00`);
    const h = parseInt(args.time.split(":")[0]);
    return {
        success: true, appointment_id: data.id,
        message: `¡Cita agendada!\n\n📅 ${d.toLocaleDateString("es-MX", { weekday: "long", month: "long", day: "numeric" })}\n🕐 ${h > 12 ? h - 12 : h}:${args.time.split(":")[1]} ${h >= 12 ? "PM" : "AM"}\n💆 ${args.service_name}`
    };
};

const getServices = async (sb: ReturnType<typeof createClient>, clinicId: string) => {
    const { data: svcRows } = await sb.from("services").select("name, duration, price").eq("clinic_id", clinicId);
    if (svcRows && svcRows.length > 0) {
        const msg = `Servicios:\n\n${svcRows.map((s: { name: string; duration: number; price: number }) => `• ${s.name} (${s.duration}min) - $${s.price}`).join("\n")}`;
        return { services: svcRows, message: msg };
    }
    const { data } = await sb.from("clinic_settings").select("services").eq("id", clinicId).single();
    const svcs = data?.services || [];
    if (!svcs.length) return { message: "No hay servicios disponibles." };
    return { services: svcs, message: `Servicios:\n\n${svcs.map((s: { name: string; duration: number; price: number }) => `• ${s.name} (${s.duration}min) - $${s.price}`).join("\n")}` };
};

const confirmAppt = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, response: string) => {
    const { data: appt } = await sb.from("appointments").select("*").eq("clinic_id", clinicId).eq("phone_number", phone).eq("status", "pending").gte("appointment_date", new Date().toISOString()).order("appointment_date", { ascending: true }).limit(1).single();
    if (!appt) return { message: "No hay citas pendientes." };
    const status = response === "yes" ? "confirmed" : "cancelled";
    await sb.from("appointments").update({ status, confirmation_received: true, confirmation_response: response }).eq("id", appt.id);
    return status === "confirmed" ? { message: "¡Cita confirmada! 😊" } : { message: "Cita cancelada. ¿Reagendar?" };
};

const upsertProspect = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, args: { name?: string; email?: string; service_interest?: string; notes?: string }) => {
    try {
        // If interest is shown, update stage to "Calificado"
        if (args.service_interest) {
            await updateProspectStage(sb, clinicId, phone, "Calificado");
        }

        const { data: defaultStage } = await sb.from("crm_pipeline_stages")
            .select("id").eq("clinic_id", clinicId).eq("is_default", true).limit(1).single();

        let stageId = defaultStage?.id;
        if (!stageId) {
            const { data: firstStage } = await sb.from("crm_pipeline_stages")
                .select("id").eq("clinic_id", clinicId).order("position", { ascending: true }).limit(1).single();
            stageId = firstStage?.id;
        }

        const { data: existing } = await sb.from("crm_prospects")
            .select("id, name, email, service_interest, notes")
            .eq("clinic_id", clinicId).eq("phone", phone).limit(1).single();

        if (existing) {
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (args.name && args.name !== existing.name) updates.name = args.name;
            if (args.email && args.email !== existing.email) updates.email = args.email;
            if (args.service_interest) updates.service_interest = args.service_interest;
            if (args.notes) updates.notes = existing.notes ? `${existing.notes}\n${args.notes}` : args.notes;

            await sb.from("crm_prospects").update(updates).eq("id", existing.id);
            return { success: true, action: "updated", prospect_id: existing.id, message: "Prospecto actualizado en CRM." };
        } else {
            const { data: newProspect, error } = await sb.from("crm_prospects").insert({
                clinic_id: clinicId,
                stage_id: stageId,
                name: args.name || "Sin nombre",
                phone: phone,
                email: args.email || null,
                service_interest: args.service_interest || null,
                notes: args.notes || null,
                source: "whatsapp",
                score: 0
            }).select("id").single();

            if (error) return { success: false, message: "Error al crear prospecto." };
            return { success: true, action: "created", prospect_id: newProspect?.id, message: "Nuevo prospecto creado en CRM." };
        }
    } catch (e) {
        console.error("upsertProspect error:", e);
        return { success: false, message: "Error en CRM." };
    }
};

const getKnowledge = async (sb: ReturnType<typeof createClient>, clinicId: string, query: string) => {
    try {
        const { data: docs } = await sb.from("knowledge_base")
            .select("title, content, category")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .or(`title.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`)
            .limit(3);

        if (!docs || docs.length === 0) {
            return { found: false, message: "No encontré información específica sobre eso en nuestra base de conocimiento." };
        }

        const results = docs.map((d: { title: string; content: string; category: string }) =>
            `📄 ${d.title} (${d.category}):\n${d.content}`
        ).join("\n\n---\n\n");

        return { found: true, documents: docs.length, message: results };
    } catch (e) {
        console.error("getKnowledge error:", e);
        return { found: false, message: "Error al buscar en base de conocimiento." };
    }
};

const getStageId = async (sb: ReturnType<typeof createClient>, clinicId: string, stageName: string) => {
    const { data } = await sb.from("crm_pipeline_stages")
        .select("id")
        .eq("clinic_id", clinicId)
        .ilike("name", stageName) // Case insensitive
        .limit(1)
        .maybeSingle();
    return data?.id;
};

const updateProspectStage = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, targetStageName: string) => {
    // 1. Get target stage ID
    const targetId = await getStageId(sb, clinicId, targetStageName);
    if (!targetId) return;

    // 2. Get current prospect and their stage
    const { data: prospect } = await sb.from("crm_prospects")
        .select("id, stage_id, crm_pipeline_stages(name, position)") // Join to get stage info
        .eq("clinic_id", clinicId)
        .eq("phone", phone)
        .limit(1)
        .maybeSingle();

    if (!prospect) return; // Prospect should exist by now

    const currentStageName = prospect.crm_pipeline_stages?.name;

    // 3. Logic: Only move "forward" or setup initial
    // Hierarchy: Nuevo Prospecto (low) -> Calificado (med) -> Cita Agendada (high)
    // We don't want to move BACK from Cita Agendada to Calificado just because they asked a question.

    let shouldUpdate = false;

    if (!prospect.stage_id) shouldUpdate = true;
    else if (targetStageName.toLowerCase() === "nuevo prospecto") shouldUpdate = false; // Never overwrite with "New" if exists
    else if (targetStageName.toLowerCase() === "cita agendada") shouldUpdate = true; // Always update to Scheduled (highest priority here)
    else if (targetStageName.toLowerCase() === "calificado") {
        // Only update to Calificado if current is NOT "Cita Agendada" or "Cerrado"
        const forbidden = ["cita agendada", "cerrado"];
        if (!forbidden.includes(currentStageName?.toLowerCase() || "")) shouldUpdate = true;
    }

    if (shouldUpdate) {
        await sb.from("crm_prospects").update({ stage_id: targetId }).eq("id", prospect.id);
        console.log(`[CRM] Moved ${phone} to '${targetStageName}'`);
    }
};

const autoUpsertMinimalProspect = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string) => {
    try {
        const { data: existing } = await sb.from("crm_prospects")
            .select("id").eq("clinic_id", clinicId).eq("phone", phone).limit(1).single();

        if (existing) return;

        // Try to find "Nuevo Prospecto" specifically, or fallback to default
        let stageId = await getStageId(sb, clinicId, "Nuevo Prospecto");

        if (!stageId) {
            const { data: defaultStage } = await sb.from("crm_pipeline_stages")
                .select("id").eq("clinic_id", clinicId).eq("is_default", true).limit(1).single();
            stageId = defaultStage?.id;
        }

        // Fallback to first
        if (!stageId) {
            const { data: firstStage } = await sb.from("crm_pipeline_stages")
                .select("id").eq("clinic_id", clinicId).order("position", { ascending: true }).limit(1).single();
            stageId = firstStage?.id;
        }

        if (!stageId) return;

        await sb.from("crm_prospects").insert({
            clinic_id: clinicId,
            stage_id: stageId,
            name: "Sin nombre",
            phone: phone,
            source: "whatsapp",
            score: 0
        });
        console.log(`Auto-created prospect for phone: ${phone}`);
    } catch (e) {
        console.error("autoUpsertMinimalProspect error:", e);
    }
};

const getKnowledgeSummary = async (sb: ReturnType<typeof createClient>, clinicId: string) => {
    try {
        const { data: docs } = await sb.from("knowledge_base")
            .select("title, content, category")
            .eq("clinic_id", clinicId)
            .eq("status", "active")
            .limit(10);

        if (!docs || docs.length === 0) return "";

        return "\n\nBase de Conocimiento de la Clínica:\n" +
            docs.map((d: { title: string; content: string; category: string }) =>
                `- ${d.title} (${d.category}): ${d.content.substring(0, 300)}`
            ).join("\n");
    } catch {
        return "";
    }
};

const processFunc = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, name: string, args: Record<string, unknown>, timezone: string) => {
    switch (name) {
        case "check_availability": return checkAvail(sb, clinicId, phone, args.date as string, args.service_name as string, timezone);
        case "create_appointment": return createAppt(sb, clinicId, phone, args as { patient_name: string; date: string; time: string; service_name: string }, timezone);
        case "get_services": return getServices(sb, clinicId);
        case "confirm_appointment":
        case "cancel_appointment": return confirmAppt(sb, clinicId, phone, name === "cancel_appointment" ? "no" : args.response as string);
        case "upsert_prospect": return upsertProspect(sb, clinicId, phone, args as { name?: string; email?: string; service_interest?: string; notes?: string });
        case "get_knowledge": return getKnowledge(sb, clinicId, args.query as string);
        default: return { error: `Unknown: ${name}` };
    }
};

const callOpenAI = async (key: string, model: string, msgs: Msg[], useFns = true) => {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model: model || "gpt-4o-mini",
            messages: msgs,
            functions: useFns ? functions : undefined,
            function_call: useFns ? "auto" : undefined,
            temperature: 0.7,
            max_tokens: 500
        })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
};

const sendWA = async (key: string, to: string, from: string, msg: string) => {
    const r = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": key },
        body: JSON.stringify({ from, to, type: "text", text: { body: msg } })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
};

// =============================================
// Main Webhook Handler
// =============================================
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    const sb = getSupabase();

    try {
        const p: YCloudPayload = await req.json();

        // Log incoming payload
        await debugLog(sb, `Incoming webhook: ${p.type}`, p);

        // Check event type
        if (p.type !== "whatsapp.inbound_message.received") {
            // Optional: log reason?
            // await debugLog(sb, `Ignored: Wrong type`, { type: p.type });
            return new Response(JSON.stringify({ status: "ignored" }), { headers: corsHeaders });
        }

        const msgObj = p.whatsappInboundMessage;

        if (!msgObj || msgObj.type !== "text") {
            await debugLog(sb, `Ignored: Not text message`, { msgType: msgObj?.type });
            return new Response(JSON.stringify({ status: "ignored" }), { headers: corsHeaders });
        }

        const to = msgObj.to;
        const from = msgObj.from;
        const body = msgObj.text?.body || "";
        const msgId = msgObj.id;

        // Deduplication
        const { data: exists } = await sb.from("messages").select("id").eq("ycloud_message_id", msgId).limit(1).maybeSingle();
        if (exists) {
            await debugLog(sb, `Ignored: Duplicate message`, { msgId });
            return new Response(JSON.stringify({ status: "ignored_duplicate" }), { headers: corsHeaders });
        }

        const clinic = await getClinic(sb, to);

        if (!clinic) {
            await debugLog(sb, "Clinic not found", { phone: to });
            return new Response(JSON.stringify({ status: "ignored", reason: "clinic_not_found" }), { headers: corsHeaders });
        }

        if (!clinic.openai_api_key || !clinic.ycloud_api_key) {
            await debugLog(sb, "Missing API keys", { clinic_id: clinic.id });
            return new Response(JSON.stringify({ error: "Missing config" }), { status: 500, headers: corsHeaders });
        }

        await saveMsg(sb, clinic.id, from, body, "inbound", { ycloud_message_id: msgId });

        // Auto-create prospect in CRM (best-effort, non-blocking)
        autoUpsertMinimalProspect(sb, clinic.id, from).catch(e => console.error("Auto-prospect failed:", e));

        if (!clinic.ai_auto_respond) return new Response(JSON.stringify({ status: "saved" }), { headers: corsHeaders });

        // Build conversation context
        const history = await getHistory(sb, clinic.id, from);
        const localTime = new Date().toLocaleString("es-MX", { timeZone: clinic.timezone || "America/Mexico_City", weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

        // Fetch knowledge base summary for system prompt
        const knowledgeSummary = await getKnowledgeSummary(sb, clinic.id);

        const sysPrompt = `${clinic.ai_personality}

Clínica: ${clinic.clinic_name}
Dirección: ${clinic.address || "No especificada, consultar al equipo."}
Fecha/Hora actual: ${localTime}
Servicios (Fuente de Verdad para Precios y Duración): ${JSON.stringify(clinic.services)}
Horarios: ${JSON.stringify(clinic.working_hours)}
${knowledgeSummary}

${clinic.ai_behavior_rules || "Sin reglas específicas adicionales."}`;

        const msgs: Msg[] = [
            { role: "system", content: sysPrompt },
            ...history.map((m) => ({ role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant", content: m.content })),
            { role: "user", content: body }
        ];

        let res = await callOpenAI(clinic.openai_api_key, clinic.openai_model, msgs);
        let assistant = res.choices[0].message;
        let funcResult: Record<string, unknown> | null = null;
        let allFuncResults: Record<string, unknown>[] = [];

        // Handle function calls (support multiple sequential calls)
        let maxCalls = 3;
        while (assistant.function_call && maxCalls > 0) {
            const fnArgs = JSON.parse(assistant.function_call.arguments);
            funcResult = await processFunc(sb, clinic.id, from, assistant.function_call.name, fnArgs, clinic.timezone || "America/Santiago");
            allFuncResults.push({ name: assistant.function_call.name, result: funcResult });

            msgs.push(
                { role: "assistant", content: "", function_call: assistant.function_call },
                { role: "function", name: assistant.function_call.name, content: JSON.stringify(funcResult) }
            );

            res = await callOpenAI(clinic.openai_api_key, clinic.openai_model, msgs);
            assistant = res.choices[0].message;
            maxCalls--;
        }

        const reply = assistant.content || "Error. ¿Puedes repetir?";
        await saveMsg(sb, clinic.id, from, reply, "outbound", {
            ai_generated: true,
            ai_function_called: allFuncResults.length > 0 ? allFuncResults.map(r => (r as Record<string, unknown>).name).join(", ") : null,
            ai_function_result: allFuncResults.length > 0 ? allFuncResults : null
        });

        // Send reply via WA
        // sendWA(key, to, from, msg)
        // to (destination) = user phone (from variable)
        // from (sender) = clinic phone (to variable)
        await sendWA(clinic.ycloud_api_key, from, clinic.ycloud_phone_number || to, reply);

        return new Response(JSON.stringify({ status: "ok", response: reply }), { headers: corsHeaders });
    } catch (e) {
        console.error(e);
        const sb = getSupabase(); // Needs logging if internal error
        await debugLog(sb, "Internal Error", { error: (e as Error).message });
        return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
    }
});
