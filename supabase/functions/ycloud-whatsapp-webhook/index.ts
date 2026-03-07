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
        audio?: { id: string; link: string; mime_type: string };
        image?: { id: string; link: string; mime_type: string; caption?: string };
        wamid?: string;
        context?: any;
    };
}

interface Msg { role: "system" | "user" | "assistant" | "function"; content: string | any[]; name?: string; function_call?: { name: string; arguments: string }; }

// ====== Helper: Download Media from YCloud ======
const downloadYCloudMedia = async (link: string, ycloudKey: string): Promise<Blob> => {
    const res = await fetch(link, {
        headers: { "X-API-Key": ycloudKey }
    });
    if (!res.ok) throw new Error(`Media fetch failed: ${await res.text()}`);
    return await res.blob();
};

// ====== Helper: Transcribe Audio using OpenAI Whisper ======
const transcribeAudioData = async (audioBlob: Blob, openAiKey: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.ogg");
    formData.append("model", "whisper-1");
    // Ensure text output
    formData.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openAiKey}` },
        body: formData
    });
    if (!res.ok) throw new Error(`Transcription failed: ${await res.text()}`);
    return await res.text();
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// =============================================
// OpenAI Function Definitions (Agent Tools)
// =============================================
const functions = [
    {
        name: "check_availability",
        description: "Verifica disponibilidad. CRÍTICO: Debes inferir el nombre del servicio del historial de conversación (ej. 'Microblading', 'Cejas'). Además, si el usuario menciona a un profesional o cargo específico (ej. 'con la doctora Ana', 'con la kinesióloga'), extrae su nombre en professional_name.",
        parameters: { type: "object", properties: { date: { type: "string", description: "Fecha YYYY-MM-DD" }, service_name: { type: "string", description: "Nombre del servicio inferido del contexto" }, professional_name: { type: "string", description: "Nombre, cargo o título del profesional solicitado por el paciente (opcional)" } }, required: ["date"] }
    },
    {
        name: "create_appointment",
        description: "Crea nueva cita cuando paciente confirma fecha, hora y servicio",
        parameters: { type: "object", properties: { patient_name: { type: "string" }, date: { type: "string" }, time: { type: "string" }, service_name: { type: "string" }, professional_name: { type: "string", description: "Nombre, cargo o título del profesional solicitado (opcional)" } }, required: ["patient_name", "date", "time", "service_name"] }
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
    {
        name: "escalate_to_human",
        description: "ÚSALA SÓLO si el paciente está molesto, tiene un problema médico complejo o pide EXPLÍCITAMENTE hablar con un humano. Esta función silenciará al bot para que un agente humano tome el control del chat.",
        parameters: { type: "object", properties: {}, required: [] }
    },
    {
        name: "reschedule_appointment",
        description: "Reagenda una cita existente del paciente a una nueva fecha y hora. Úsala cuando el paciente quiera cambiar la fecha/hora de su cita. Primero verifica disponibilidad con check_availability, luego usa esta función para mover la cita.",
        parameters: {
            type: "object",
            properties: {
                new_date: { type: "string", description: "Nueva fecha YYYY-MM-DD" },
                new_time: { type: "string", description: "Nueva hora HH:MM (24h)" }
            },
            required: ["new_date", "new_time"]
        }
    }
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
    const { data, error } = await sb.from("messages").insert({ clinic_id: clinicId, phone_number: phone, content, direction, ...extra }).select("id").single();
    if (error) {
        console.error(`[saveMsg] Error inserting message (dir: ${direction}):`, error);
        throw new Error(`saveMsg failed: ${error.message}`);
    }
    console.log(`[saveMsg] Saved message (dir: ${direction}) id: ${data.id}`);
    return data.id;
};

// =============================================
// Tool Implementations
// =============================================
const checkAvail = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, date: string, serviceName?: string, timezone: string = "America/Santiago", profName?: string) => {
    // 1. Update CRM stage to "Calificado" (Interest shown)
    await updateProspectStage(sb, clinicId, phone, "Calificado");

    let duration = 60; // Default
    let serviceId: string | null = null;
    let professionalId: string | null = null;

    if (serviceName) {
        // Try to find service duration and ID
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

    // Try to find requested professional BY NAME/TITLE
    if (profName) {
        const { data: prof } = await sb.from("clinic_members")
            .select("id:user_id, member_id:id")
            .eq("clinic_id", clinicId)
            .or(`first_name.ilike.%${profName}%,last_name.ilike.%${profName}%,job_title.ilike.%${profName}%`)
            .limit(1)
            .maybeSingle();

        if (prof) {
            professionalId = prof.member_id;
        }
    }

    // Fallback to service professional if NO specific professional was requested or found
    if (!professionalId && serviceId) {
        const { data: profs } = await sb.from("service_professionals")
            .select("member_id, is_primary")
            .eq("service_id", serviceId);

        if (profs && profs.length > 0) {
            const primary = profs.find((p: { is_primary: boolean }) => p.is_primary);
            professionalId = primary ? primary.member_id : profs[0].member_id;
        }
    }

    console.log(`[checkAvail] Service: '${serviceName}' (ID: ${serviceId}), Duration: ${duration}min, Professional: ${professionalId || 'Global'}`);

    let slots: { slot_time: string, is_available: boolean }[] = [];

    // Strategy: Try professional-specific slots first if we have a professional
    if (professionalId) {
        try {
            const { data, error } = await sb.rpc("get_professional_available_slots", {
                p_clinic_id: clinicId,
                p_member_id: professionalId,
                p_date: date,
                p_duration: duration,
                p_interval: duration, // Step by duration to fit slots cleanly? Or 30? Let's use 30 for granularity.
                p_timezone: timezone
            });

            if (!error && data) {
                slots = data; // New RPC returns { slot_time, is_available }
            } else {
                console.warn("[checkAvail] Professional slot check failed/empty, falling back to global:", error);
                // Fallback will happen below if slots empty? No, we should explicitly fallback.
            }
        } catch (e) {
            console.error("[checkAvail] RPC error:", e);
        }
    }

    // Fallback: If no professional identified OR professional check returned no slots (or error), try global
    // Note: If professional has NO slots, we might NOT want to show other's slots if strictly assigned? 
    // Current requirement: "Intelligent scheduling based on selected professional".
    // If we couldn't get slots from professional RPC (e.g. migration not applied), we try global existing RPC.
    if (slots.length === 0) {
        const { data, error } = await sb.rpc("get_available_slots", {
            p_clinic_id: clinicId,
            p_date: date,
            p_duration: duration,
            p_timezone: timezone,
            p_interval: duration
        });
        if (error) return { available: false, error: error.message };
        slots = data || [];
    }

    const availableSlots = slots
        .filter((s: { is_available: boolean }) => s.is_available)
        .map((s: { slot_time: string }) => {
            const t = s.slot_time.substring(0, 5);
            const h = parseInt(t.split(":")[0]);
            return `${h > 12 ? h - 12 : h}:${t.split(":")[1]} ${h >= 12 ? "PM" : "AM"}`;
        });

    const displaySlots = availableSlots.slice(0, 8);

    return availableSlots.length
        ? { available: true, slots: displaySlots, duration_used: duration, message: `Disponibilidad el ${date} (${duration} min): ${displaySlots.join(", ")}` }
        : { available: false, message: `No hay disponibilidad para ${date} con duración ${duration} min` };
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
    let price = 0;
    let professionalId: string | null = null;
    let serviceId: string | null = null;

    if (args.service_name) {
        const { data: svc } = await sb.from("services")
            .select("id, name, duration, price")
            .eq("clinic_id", clinicId)
            .ilike("name", `%${args.service_name}%`)
            .limit(1)
            .maybeSingle();

        if (svc) {
            duration = svc.duration;
            serviceId = svc.id;
            price = svc.price || 0;
            args.service_name = svc.name; // Keep exact DB string so select UI binds correctly
        }
    }

    // Try to find requested professional BY NAME/TITLE
    // @ts-ignore
    const profName = args.professional_name;
    if (profName) {
        const { data: prof } = await sb.from("clinic_members")
            .select("id:user_id, member_id:id")
            .eq("clinic_id", clinicId)
            .or(`first_name.ilike.%${profName}%,last_name.ilike.%${profName}%,job_title.ilike.%${profName}%`)
            .limit(1)
            .maybeSingle();

        if (prof) {
            professionalId = prof.member_id;
        }
    }

    // Fallback to service professional if NO specific professional was requested or found
    if (!professionalId && serviceId) {
        const { data: profs } = await sb.from("service_professionals")
            .select("member_id, is_primary")
            .eq("service_id", serviceId);

        if (profs && profs.length > 0) {
            const primary = profs.find((p: { is_primary: boolean }) => p.is_primary);
            professionalId = primary ? primary.member_id : profs[0].member_id;
        }
    }

    // Double check availability before booking? 
    // Ideally yes, using the same logic as checkAvail.
    // For now, we trust the user picked a slot offered by checkAvail.

    // Fix Timezone: Construct ISO string with offset
    const offset = getOffset(timezone, new Date(`${args.date}T12:00:00`));
    const appointmentDateWithOffset = `${args.date}T${args.time}:00${offset}`;

    const { data, error } = await sb.from("appointments").insert({
        clinic_id: clinicId,
        patient_name: args.patient_name,
        phone_number: phone,
        service: args.service_name,
        appointment_date: appointmentDateWithOffset,
        status: "confirmed",
        duration: duration,
        price: price,
        professional_id: professionalId // NEW field
    }).select().single();

    if (error) {
        console.error("[createAppt] Error:", error);
        return { success: false, message: "Error al agendar. Intenta de nuevo." };
    }

    // Update CRM stage to "Cita Agendada"
    await updateProspectStage(sb, clinicId, phone, "Cita Agendada");

    // Try to sync with Google Calendar
    try {
        const { data: gcToken } = await sb.from("google_calendar_tokens")
            .select("user_id, user_profiles!inner(clinic_id)")
            .eq("user_profiles.clinic_id", clinicId)
            .limit(1)
            .maybeSingle();

        if (gcToken?.user_id) {
            const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            const supabaseUrl = Deno.env.get("SUPABASE_URL");

            // Format end time correctly by adding duration in minutes
            const endDate = new Date(new Date(appointmentDateWithOffset).getTime() + (duration * 60000));

            if (serviceRole && supabaseUrl) {
                const res = await fetch(`${supabaseUrl}/functions/v1/create-google-event`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${serviceRole}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: `${args.patient_name} - ${args.service_name}`,
                        start: appointmentDateWithOffset,
                        end: endDate.toISOString(),
                        user_id: gcToken.user_id
                    })
                });

                if (res.ok) {
                    const json = await res.json();
                    if (json.event_id) {
                        await sb.from("appointments").update({ google_event_id: json.event_id }).eq("id", data.id);
                        console.log(`[createAppt] Successfully synced to Google Calendar args:`, json.event_id);
                    }
                } else {
                    console.error("[createAppt] Failed to sync to Google Calendar:", await res.text());
                }
            }
        }
    } catch (e) {
        console.error("[createAppt] Google Calendar Sync Error:", e);
    }

    const d = new Date(`${args.date}T${args.time}:00`);
    const h = parseInt(args.time.split(":")[0]);
    return {
        success: true, appointment_id: data.id,
        message: `¡Cita agendada!\n\n📅 ${d.toLocaleDateString("es-MX", { weekday: "long", month: "long", day: "numeric" })}\n🕐 ${h > 12 ? h - 12 : h}:${args.time.split(":")[1]} ${h >= 12 ? "PM" : "AM"}\n💆 ${args.service_name}${professionalId ? ' (Profesional Asignado)' : ''}`
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

const escalateToHuman = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string) => {
    try {
        // Find existing prospect
        const { data: existing } = await sb.from("crm_prospects")
            .select("id")
            .eq("clinic_id", clinicId)
            .eq("phone", phone)
            .limit(1)
            .single();

        if (existing) {
            await sb.from("crm_prospects").update({ requires_human: true }).eq("id", existing.id);
        } else {
            // Very rare: AI called escalate before prospect creation succeeded
            await autoUpsertMinimalProspect(sb, clinicId, phone);
            await sb.from("crm_prospects").update({ requires_human: true }).eq("clinic_id", clinicId).eq("phone", phone);
        }

        // Send a notification!
        await sb.from("notifications").insert({
            clinic_id: clinicId,
            type: "human_handoff",
            title: "Atención Requerida 🚨",
            message: `El paciente ${phone} solicitó atención humana. La IA ha sido silenciada para este chat.`
        });

        console.log(`[ESCALATE] Escalated to human for ${phone} in clinic ${clinicId}`);
        return { success: true, message: "El chat ha sido derivado a un agente humano. Despídete cordialmente avisando que un humano se contactará pronto." };
    } catch (e) {
        console.error("escalateToHuman error:", e);
        return { success: false, message: "Error al derivar." };
    }
};

const rescheduleAppt = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, args: { new_date: string; new_time: string }, timezone: string) => {
    try {
        // 1. Find the patient's nearest upcoming appointment
        const { data: appt, error: apptError } = await sb.from("appointments")
            .select("*")
            .eq("clinic_id", clinicId)
            .eq("phone_number", phone)
            .in("status", ["pending", "confirmed"])
            .gte("appointment_date", new Date().toISOString())
            .order("appointment_date", { ascending: true })
            .limit(1)
            .single();

        if (apptError || !appt) {
            return { success: false, message: "No encontré una cita próxima para reagendar. ¿Podrías darme más detalles?" };
        }

        // 2. Check availability at the new time
        const duration = appt.duration || 60;
        const offset = getOffset(timezone, new Date(`${args.new_date}T12:00:00`));
        const newDateWithOffset = `${args.new_date}T${args.new_time}:00${offset}`;

        // Check for conflicts
        const newStart = new Date(newDateWithOffset);
        const newEnd = new Date(newStart.getTime() + duration * 60000);

        const { data: conflicts } = await sb.from("appointments")
            .select("id")
            .eq("clinic_id", clinicId)
            .in("status", ["pending", "confirmed"])
            .neq("id", appt.id) // Exclude current appointment
            .lt("appointment_date", newEnd.toISOString())
            .gte("appointment_date", new Date(newStart.getTime() - duration * 60000).toISOString());

        if (conflicts && conflicts.length > 0) {
            return { success: false, message: "Ese horario ya está ocupado. ¿Podrías elegir otra hora?" };
        }

        // 3. Update the appointment
        const { error: updateError } = await sb.from("appointments").update({
            appointment_date: newDateWithOffset,
            status: "pending", // Reset to pending after reschedule
            reminder_sent: false, // Reset reminder flags
            reminder_sent_at: null,
            confirmation_received: false,
            confirmation_response: null,
            updated_at: new Date().toISOString()
        }).eq("id", appt.id);

        if (updateError) {
            console.error("[rescheduleAppt] Error:", updateError);
            return { success: false, message: "Error al reagendar. Intenta de nuevo." };
        }

        const d = new Date(`${args.new_date}T${args.new_time}:00`);
        const h = parseInt(args.new_time.split(":")[0]);
        return {
            success: true,
            appointment_id: appt.id,
            message: `¡Cita reagendada exitosamente!\n\n📅 ${d.toLocaleDateString("es-MX", { weekday: "long", month: "long", day: "numeric" })}\n🕐 ${h > 12 ? h - 12 : h}:${args.new_time.split(":")[1]} ${h >= 12 ? "PM" : "AM"}\n💆 ${appt.service || 'consulta'}`
        };
    } catch (e) {
        console.error("rescheduleAppt error:", e);
        return { success: false, message: "Error al reagendar la cita." };
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

// @ts-ignore
const processFunc = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, name: string, args: Record<string, unknown>, timezone: string) => {
    switch (name) {
        // @ts-ignore - passing extra argument that is received dynamically via arguments[4] in checkAvail
        case "check_availability": return checkAvail(sb, clinicId, phone, args.date as string, args.service_name as string, timezone, args.professional_name as string);
        case "create_appointment": return createAppt(sb, clinicId, phone, args as any, timezone);
        case "get_services": return getServices(sb, clinicId);
        case "confirm_appointment":
        case "cancel_appointment": return confirmAppt(sb, clinicId, phone, name === "cancel_appointment" ? "no" : args.response as string);
        case "upsert_prospect": return upsertProspect(sb, clinicId, phone, args as { name?: string; email?: string; service_interest?: string; notes?: string });
        case "get_knowledge": return getKnowledge(sb, clinicId, args.query as string);
        case "escalate_to_human": return escalateToHuman(sb, clinicId, phone);
        case "reschedule_appointment": return rescheduleAppt(sb, clinicId, phone, args as { new_date: string; new_time: string }, timezone);
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

        if (!msgObj) {
            return new Response(JSON.stringify({ status: "ignored" }), { headers: corsHeaders });
        }

        const validTypes = ["text", "audio", "image"];
        if (!validTypes.includes(msgObj.type)) {
            await debugLog(sb, `Ignored: Unsupported message type`, { msgType: msgObj?.type });
            return new Response(JSON.stringify({ status: "ignored" }), { headers: corsHeaders });
        }

        const to = msgObj.to;
        const from = msgObj.from;
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

        if (!clinic.ycloud_api_key) {
            await debugLog(sb, "Missing YCloud API key", { clinic_id: clinic.id });
            return new Response(JSON.stringify({ error: "Missing config" }), { status: 500, headers: corsHeaders });
        }

        const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openaiApiKey) {
            await debugLog(sb, "Missing global OPENAI_API_KEY", { clinic_id: clinic.id });
            return new Response(JSON.stringify({ error: "Missing config" }), { status: 500, headers: corsHeaders });
        }

        let body = "";
        let isImage = false;
        let base64ImageObj: any = null;
        let payloadExtra: any = {};

        if (msgObj.type === "text") {
            body = msgObj.text?.body || "";
        } else if (msgObj.type === "audio" && msgObj.audio) {
            try {
                // If link exists, use it, otherwise fall back to fetching via ID
                let downloadUrl = msgObj.audio.link;
                if (!downloadUrl) {
                    downloadUrl = `https://api.ycloud.com/v2/whatsapp/media/${msgObj.audio.id}`;
                }
                const blob = await downloadYCloudMedia(downloadUrl, clinic.ycloud_api_key);
                body = await transcribeAudioData(blob, openaiApiKey);
                await debugLog(sb, `Audio transcribed`, { body });
            } catch (e) {
                console.error("Audio error", e);
                body = "[Mensaje de audio que no pude procesar. Pide amablemente que te escriban.]";
            }
        } else if (msgObj.type === "image" && msgObj.image) {
            try {
                let downloadUrl = msgObj.image.link;
                if (!downloadUrl) {
                    downloadUrl = `https://api.ycloud.com/v2/whatsapp/media/${msgObj.image.id}`;
                }
                const blob = await downloadYCloudMedia(downloadUrl, clinic.ycloud_api_key);
                const arrayBuffer = await blob.arrayBuffer();
                const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                base64ImageObj = {
                    type: "image_url",
                    image_url: { url: `data:${blob.type || 'image/jpeg'};base64,${base64}` }
                };
                payloadExtra = { image_base64: `data:${blob.type || 'image/jpeg'};base64,${base64}` };
                body = msgObj.image?.caption || "[La persona te acaba de enviar una imagen]";
                isImage = true;
                await debugLog(sb, `Image received`, { type: blob.type });
            } catch (e) {
                console.error("Image error", e);
                body = "[La persona envió una imagen pero no pude verla. Pídele que te describa lo que envió.]";
            }
        }

        const msgRowId = await saveMsg(sb, clinic.id, from, body, "inbound", { ycloud_message_id: msgId, message_type: msgObj.type, payload: payloadExtra });

        // Auto-create prospect in CRM (best-effort, non-blocking)
        autoUpsertMinimalProspect(sb, clinic.id, from).catch(e => console.error("Auto-prospect failed:", e));

        if (!clinic.ai_auto_respond) return new Response(JSON.stringify({ status: "saved" }), { headers: corsHeaders });

        // VERIFY IF HUMAN IS REQUIRED
        const { data: prospect } = await sb.from("crm_prospects")
            .select("requires_human")
            .eq("clinic_id", clinic.id)
            .eq("phone", from)
            .limit(1)
            .maybeSingle();

        if (prospect?.requires_human) {
            await debugLog(sb, `IA silenciosa: Handoff a humano activo para ${from}`, { phone: from });
            // Only save the message but DO NOT respond
            return new Response(JSON.stringify({ status: "saved_silently", reason: "requires_human" }), { headers: corsHeaders });
        }

        const asyncProcess = async () => {
            try {
                // DEBOUNCE - WAIT FOR 30 SECONDS
                await new Promise(r => setTimeout(r, 30000));

                // CHECK IF A NEWER USER MESSAGE ARRIVED WHILE WE WAITED
                const { data: latestMsg } = await sb.from("messages")
                    .select("id")
                    .eq("clinic_id", clinic.id)
                    .eq("phone_number", from)
                    .eq("direction", "inbound")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (latestMsg && latestMsg.id !== msgRowId) {
                    // WE ARE NOT THE LATEST MESSAGE! Abort silently and let the latest one handle everything.
                    await debugLog(sb, `Debounced message`, { msgRowId });
                    return;
                }

                // --- AT THIS POINT, WE ARE THE LATEST MESSAGE. BEGIN PROCESSING. ---

                const localTime = new Date().toLocaleString("es-MX", { timeZone: clinic.timezone || "America/Mexico_City", weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

                // Fetch knowledge base summary for system prompt
                const knowledgeSummary = await getKnowledgeSummary(sb, clinic.id);

                const sysPrompt = `${clinic.ai_personality}\n\nClínica: ${clinic.clinic_name}\nDirección: ${clinic.address || "No especificada, consultar al equipo."}\nFecha/Hora actual: ${localTime}\nServicios (Fuente de Verdad para Precios y Duración): ${JSON.stringify(clinic.services)}\nHorarios: ${JSON.stringify(clinic.working_hours)}\n${knowledgeSummary}\n\nIMPORTANTE SOBRE IMÁGENES: TIENES capacidad visual. Si el usuario envía una imagen, vela, analízala profesionalmente y NO digas que no puedes ver imágenes.\n\n${clinic.ai_behavior_rules || "Sin reglas específicas adicionales."}`;

                // Build conversation context WITH GROUPING
                const { data: recentMsgs } = await sb.from("messages")
                    .select("direction, content, message_type, payload")
                    .eq("clinic_id", clinic.id)
                    .eq("phone_number", from)
                    .order("created_at", { ascending: false })
                    .limit(15);

                const orderedMsgs = recentMsgs?.reverse() || [];

                // Find where the last outbound message is so we can group all recent inbound ones
                let lastOutboundIndex = -1;
                for (let i = orderedMsgs.length - 1; i >= 0; i--) {
                    if (orderedMsgs[i].direction === "outbound") {
                        lastOutboundIndex = i;
                        break;
                    }
                }

                const pastContext = lastOutboundIndex >= 0 ? orderedMsgs.slice(0, lastOutboundIndex + 1) : [];
                const burstInbound = lastOutboundIndex >= 0 ? orderedMsgs.slice(lastOutboundIndex + 1) : orderedMsgs;

                const msgs: Msg[] = [
                    { role: "system", content: sysPrompt },
                    ...pastContext.map((m) => ({ role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant", content: m.content || "" }))
                ];

                // Combine the current inbound burst into a single user message
                let userContentBlocks: any[] = [];
                for (const msg of burstInbound) {
                    if (msg.message_type === "image" && msg.payload?.image_base64) {
                        userContentBlocks.push({ type: "text", text: msg.content || "[Imagen]" });
                        userContentBlocks.push({
                            type: "image_url",
                            image_url: { url: msg.payload.image_base64 }
                        });
                    } else {
                        userContentBlocks.push({ type: "text", text: msg.content || "" });
                    }
                }

                if (userContentBlocks.length > 0) {
                    msgs.push({ role: "user", content: userContentBlocks });
                }

                let res = await callOpenAI(openaiApiKey, clinic.openai_model, msgs);
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

                    res = await callOpenAI(openaiApiKey, clinic.openai_model, msgs);
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
                await sendWA(clinic.ycloud_api_key, from, clinic.ycloud_phone_number || to, reply);
            } catch (err) {
                console.error("Async Process Error:", err);
            }
        };

        // @ts-ignore: EdgeRuntime is available in Supabase edge functions
        if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
            // @ts-ignore
            EdgeRuntime.waitUntil(asyncProcess());
        } else {
            asyncProcess();
        }

        return new Response(JSON.stringify({ status: "processing_async" }), { headers: corsHeaders });
    } catch (e) {
        console.error(e);
        const sb = getSupabase(); // Needs logging if internal error
        await debugLog(sb, "Internal Error", { error: (e as Error).message });
        return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
    }
});
