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
// Tool implementations (simplified for simulator)
// =============================================
const checkAvail = async (sb: ReturnType<typeof createClient>, clinicId: string, date: string, serviceName?: string, timezone?: string) => {
    try {
        const tz = timezone || "America/Santiago";
        // CRITICAL: Use mid-day to avoid offset shifts (Chile is UTC-3/UTC-4)
        // 2026-03-11T00:00:00Z in Chile is still March 10th 21:00! 
        // Using T12:00:00Z ensures we land in the correct day regardless of offset.
        const midDay = new Date(date + "T12:00:00Z");
        const startOfDay = new Date(date + "T00:00:00"); // For ISO string comparison
        const endOfDay = new Date(date + "T23:59:59");

        console.log(`[checkAvail] Checking date: ${date}, TZ: ${tz}`);

        const { data: existing } = await sb.from("appointments")
            .select("time, service, status, duration_minutes")
            .eq("clinic_id", clinicId)
            .gte("appointment_date", startOfDay.toISOString())
            .lte("appointment_date", endOfDay.toISOString())
            .in("status", ["pending", "confirmed"]);

        const { data: clinic } = await sb.from("clinic_settings")
            .select("working_hours")
            .eq("id", clinicId)
            .single();

        if (!clinic) return { error: "No se encontró configuración de la clínica." };

        const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const dayNamesES: Record<string, string> = { sunday: "domingo", monday: "lunes", tuesday: "martes", wednesday: "miércoles", thursday: "jueves", friday: "viernes", saturday: "sábado" };

        // Use timezone-aware day calculation
        const dayEnglish = midDay.toLocaleDateString("en-US", { timeZone: tz, weekday: "long" }).toLowerCase();
        const dayOfWeek = dayNames.find(d => dayEnglish.includes(d)) || dayNames[midDay.getUTCDay()];
        const dayES = dayNamesES[dayOfWeek] || dayOfWeek;
        const hours = clinic.working_hours?.[dayOfWeek];

        console.log(`[checkAvail] Calculated day: ${dayOfWeek} (${dayES}), Hours found:`, JSON.stringify(hours));

        if (!hours || hours.closed) {
            return { available: false, message: `La clínica está CERRADA el ${dayES} (${date}). Horarios: Lun-Vie 10:00-20:00. Sugiere otro día.` };
        }

        // Working hours use 'open'/'close' properties (NOT start/end)
        const openTime = hours.open || hours.start || "10:00";
        const closeTime = hours.close || hours.end || "20:00";
        const breakStart = hours.break?.start || null;
        const breakEnd = hours.break?.end || null;

        // Find service duration from REAL services table
        let duration = 60;
        if (serviceName) {
            const { data: realServices } = await sb.from("services")
                .select("name, duration, price")
                .eq("clinic_id", clinicId);
            if (realServices && realServices.length > 0) {
                const svc = realServices.find((s: any) => s.name.toLowerCase().includes(serviceName.toLowerCase()));
                if (svc) duration = svc.duration || 60;
            }
        }

        const bookedTimes = (existing || []).map((a: any) => `${a.time} (${a.service}, ${a.status})`);
        const breakInfo = breakStart && breakEnd ? ` Horario de descanso: ${breakStart} a ${breakEnd} (no agendar en este rango).` : "";

        return {
            available: true,
            date,
            day_of_week: dayES,
            hours_open: openTime,
            hours_close: closeTime,
            break_time: breakStart ? `${breakStart} - ${breakEnd}` : "sin descanso",
            booked_slots: bookedTimes,
            service_duration: duration,
            message: `Disponibilidad para ${dayES} ${date}: Horario de atención: ${openTime} a ${closeTime}.${breakInfo} Citas existentes: ${bookedTimes.length > 0 ? bookedTimes.join(", ") : "ninguna"}. Duración del servicio: ${duration} min. Sugiere horarios dentro de ${openTime}-${closeTime} que NO conflicten con citas existentes ni con el descanso.`
        };
    } catch (e) {
        console.error("checkAvail error:", e);
        return { error: "Error verificando disponibilidad." };
    }
};

const createAppt = async (sb: ReturnType<typeof createClient>, clinicId: string, simulatedPhone: string, args: any, timezone: string) => {
    try {
        // Fetch price/duration from real services table
        let price = 0;
        let duration = 60;
        const { data: realServices } = await sb.from("services")
            .select("name, duration, price")
            .eq("clinic_id", clinicId);

        if (realServices && realServices.length > 0) {
            const svc = realServices.find((s: any) => s.name.toLowerCase().includes(args.service_name?.toLowerCase() || ""));
            if (svc) { price = svc.price || 0; duration = svc.duration || 60; }
        }

        const appointmentDate = new Date(`${args.date}T${args.time}:00`);

        const { data, error } = await sb.from("appointments").insert({
            clinic_id: clinicId,
            patient_name: args.patient_name,
            phone_number: simulatedPhone,
            service: args.service_name,
            appointment_date: appointmentDate.toISOString(),
            duration: duration,
            price,
            status: "confirmed",
            payment_status: "pending"
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
    // Fetch from the real 'services' table first
    const { data: realServices } = await sb.from("services")
        .select("name, duration, price")
        .eq("clinic_id", clinicId);

    if (realServices && realServices.length > 0) {
        const services = realServices.map(s => ({ name: s.name, duration: `${s.duration} min`, price: `$${s.price.toLocaleString('es-CL')}` }));
        return { services, message: "Estos son los servicios y precios disponibles." };
    }

    // Fallback to legacy JSON field
    const { data } = await sb.from("clinic_settings").select("services").eq("id", clinicId).single();
    return { services: data?.services || [], message: "Estos son los servicios y precios disponibles." };
};

const getKnowledge = async (sb: ReturnType<typeof createClient>, clinicId: string, query: string) => {
    try {
        const genericWords = ["valor", "precio", "costo", "cuanto", "vale", "informacion", "clinica", "servicio", "tratamiento", "precios", "valores", "costos", "procedimiento", "sesion"];

        // Clean and split query into keywords
        const allKeywords = query.toLowerCase()
            .replace(/[¿?¡!.,]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2); // Keywords of 3+ chars

        // Filter out generic words to find specific subjects (e.g., "labios")
        const specificKeywords = allKeywords.filter(w => !genericWords.map(g => g.normalize("NFD").replace(/[\u0300-\u036f]/g, "")).includes(w.normalize("NFD").replace(/[\u0300-\u036f]/g, "")));

        // If we have specific keywords, use them. Otherwise, use all keywords.
        const searchKeywords = specificKeywords.length > 0 ? specificKeywords : allKeywords;

        let queryBuilder = sb.from("knowledge_base")
            .select("title, content, category")
            .eq("clinic_id", clinicId)
            .eq("status", "active");

        if (searchKeywords.length > 0) {
            // Search ANY of the words in title, content or category
            const orFilters = searchKeywords.flatMap(kw => [
                `title.ilike.%${kw}%`,
                `content.ilike.%${kw}%`,
                `category.ilike.%${kw}%`
            ]).join(',');

            queryBuilder = queryBuilder.or(orFilters);
        } else {
            // Literal fallback
            queryBuilder = queryBuilder.or(`title.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`);
        }

        const { data: docs } = await queryBuilder.limit(10); // Get more to rank them

        if (!docs || docs.length === 0) {
            return { found: false, message: "No encontré información específica sobre eso en nuestra base de conocimiento. Intenta buscando un término más general (ej: 'precios' en lugar de 'valor de labios')." };
        }

        // Rank results by relevance
        const rankedDocs = docs.map(d => {
            let score = 0;
            const docText = `${d.title} ${d.content} ${d.category}`.toLowerCase();
            allKeywords.forEach(kw => {
                if (d.title.toLowerCase().includes(kw)) score += 10;
                if (d.category?.toLowerCase().includes(kw)) score += 5;
                if (d.content.toLowerCase().includes(kw)) score += 1;
            });
            return { ...d, score };
        }).sort((a, b) => b.score - a.score).slice(0, 5); // Take top 5

        const results = rankedDocs.map((d: { title: string; content: string; category: string }) =>
            `📄 ${d.title} (${d.category}):\n${d.content}`
        ).join("\n\n---\n\n");

        return { found: true, documents: rankedDocs.length, message: results };
    } catch (e) {
        console.error("getKnowledge error:", e);
        return { found: false, message: "Error al buscar en base de conocimiento." };
    }
};

// Tag patient (same logic as webhook)
const tagPatient = async (sb: ReturnType<typeof createClient>, clinicId: string, phone: string, args: { tag_name: string; tag_color?: string }) => {
    try {
        const tagName = args.tag_name.trim();
        if (!tagName) return { success: false, message: "Nombre de etiqueta vacío." };

        const defaultColor = "#3B82F6";
        const tagColor = args.tag_color || defaultColor;

        // 1. Find or create the tag
        let tagId: string | null = null;

        const { data: existingTag } = await sb.from("tags")
            .select("id")
            .eq("clinic_id", clinicId)
            .ilike("name", tagName)
            .limit(1)
            .maybeSingle();

        if (existingTag) {
            tagId = existingTag.id;
        } else {
            const { data: newTag, error: tagError } = await sb.from("tags")
                .insert({ clinic_id: clinicId, name: tagName, color: tagColor })
                .select("id")
                .single();

            if (tagError) {
                const { data: retryTag } = await sb.from("tags")
                    .select("id")
                    .eq("clinic_id", clinicId)
                    .ilike("name", tagName)
                    .limit(1)
                    .maybeSingle();
                tagId = retryTag?.id || null;
            } else {
                tagId = newTag?.id || null;
            }
        }

        if (!tagId) return { success: false, message: "No se pudo crear la etiqueta." };

        // 2. Find the patient by phone number
        let patientId: string | null = null;
        const { data: existingPatient } = await sb.from("patients")
            .select("id")
            .eq("clinic_id", clinicId)
            .eq("phone_number", phone)
            .limit(1)
            .maybeSingle();

        if (existingPatient) {
            patientId = existingPatient.id;
        } else {
            const { data: newPatient, error: patientError } = await sb.from("patients")
                .insert({ clinic_id: clinicId, phone_number: phone, name: "Paciente Simulador" })
                .select("id")
                .single();
            if (patientError) return { success: false, message: "No se pudo encontrar o crear el paciente." };
            patientId = newPatient?.id || null;
        }

        if (!patientId) return { success: false, message: "No se pudo identificar al paciente." };

        // 3. Assign tag to patient
        const { data: existingLink } = await sb.from("patient_tags")
            .select("patient_id")
            .eq("patient_id", patientId)
            .eq("tag_id", tagId)
            .limit(1)
            .maybeSingle();

        if (!existingLink) {
            await sb.from("patient_tags").insert({ patient_id: patientId, tag_id: tagId });
        }

        console.log(`[Simulator tagPatient] Tagged ${phone} with "${tagName}"`);
        return { success: true, tag_name: tagName, message: `Etiqueta "${tagName}" asignada. (Interno, NO lo menciones al paciente.)` };
    } catch (e) {
        console.error("[Simulator tagPatient] Error:", e);
        return { success: false, message: "Error al etiquetar paciente." };
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
        case "tag_patient": return tagPatient(sb, clinicId, simulatedPhone, args as { tag_name: string; tag_color?: string });
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
            .eq("status", "active")
            .limit(10);

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

        // 3. Build system prompt with robust date context
        const clinicTz = clinic.timezone || "America/Santiago";
        const now = new Date();
        const localTime = now.toLocaleString("es-CL", {
            timeZone: clinicTz,
            weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
        });

        // Pre-calculate dates to prevent AI miscalculation
        // CRITICAL: Use mid-day for safe timezone landing
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const localDateISO = now.toLocaleDateString("en-CA", { timeZone: clinicTz });
        const tomorrowISO = tomorrow.toLocaleDateString("en-CA", { timeZone: clinicTz });
        const dayAfterISO = dayAfter.toLocaleDateString("en-CA", { timeZone: clinicTz });

        // Get timezone-correct day names
        const todayDay = now.toLocaleDateString("es-CL", { timeZone: clinicTz, weekday: "long" });
        const tomorrowDay = tomorrow.toLocaleDateString("es-CL", { timeZone: clinicTz, weekday: "long" });
        const dayAfterDay = dayAfter.toLocaleDateString("es-CL", { timeZone: clinicTz, weekday: "long" });

        console.log(`[PromptGen] Today: ${localDateISO} (${todayDay}), Tomorrow: ${tomorrowISO} (${tomorrowDay}), DayAfter: ${dayAfterISO} (${dayAfterDay})`);

        const knowledgeSummary = await getKnowledgeSummary(sb, clinic_id);
        const simulatedPhone = "+56900000000"; // Simulated test phone

        // Fetch REAL services from the 'services' table (not the legacy JSON field)
        const { data: realServices } = await sb.from("services")
            .select("name, duration, price")
            .eq("clinic_id", clinic_id);

        const servicesForPrompt = realServices && realServices.length > 0
            ? realServices.map(s => ({ name: s.name, duration: `${s.duration} min`, price: `$${s.price.toLocaleString('es-CL')}` }))
            : clinic.services || [];

        // Build a readable string of hours for the AI to know if it is closed TODAY or a SPECIFIC day
        const hoursSummary = Object.entries(clinic.working_hours || {})
            .map(([day, h]: [string, any]) => {
                if (!h || h.closed || h.enabled === false) return `${day}: CERRADO`;
                return `${day}: ${h.open || h.start || "10:00"} - ${h.close || h.end || "20:00"}${h.break ? ` (Descanso: ${h.break.start}-${h.break.end})` : ""}`;
            }).join(", ");

        const sysPrompt = `${clinic.ai_personality}

Clínica: ${clinic.clinic_name}
Dirección: ${clinic.clinic_address || clinic.address || "No especificada"}
Horario General de la Clínica: ${hoursSummary}
                FECHA DE HOY (ISO): ${localDateISO} (${todayDay})
                MAÑANA: ${tomorrowDay} ${tomorrowISO}
                PASADO MAÑANA: ${dayAfterDay} ${dayAfterISO}
Servicios OFICIALES (FUENTE DE VERDAD - SOLO ESTOS EXISTEN): ${JSON.stringify(servicesForPrompt)}
                ${knowledgeSummary}

⚠️ MODO SIMULADOR: Estás en modo de prueba dentro de la app. Responde EXACTAMENTE como lo harías en WhatsApp real. Las citas que agendes aquí serán reales y aparecerán en el calendario. El número del paciente es simulado.

REGLAS CRÍTICAS DE FECHAS Y HORARIOS:
1. SI el paciente pregunta por un día que aparece como CERRADO en 'Horario General' (ej: sábado), dile INMEDIATAMENTE que la clínica está cerrada ese día y ofrece opciones de lunes a viernes. NO preguntes qué sábado ni pidas confirmación.
2. NUNCA menciones horarios o disponibilidad sin llamar primero a 'check_availability'.
3. SI el paciente pregunta por "mañana" o "pasado mañana", usa las fechas ISO de arriba para el parámetro 'date' de la herramienta.
4. EL NOMBRE DEL DÍA (ej. miércoles) que te devuelva 'check_availability' es el CORRECTO. Úsalo sin cuestionar.
5. El Horario General es tu guía rápida. La herramienta es tu verificación FINAL.

REGLAS OBLIGATORIAS SOBRE SERVICIOS:
1. Los ÚNICOS servicios que ofreces son los listados arriba en "Servicios OFICIALES". NUNCA inventes, sugieras ni menciones servicios que NO estén en esa lista (ej: "consultas generales", "evaluaciones", etc. NO existen a menos que estén explícitamente listados).
2. Cuando un paciente pregunte "¿qué servicios ofrecen?" o salude con una pregunta general, SIEMPRE menciona TODOS los servicios de la lista oficial, con sus nombres completos y precios.
3. Si el paciente pregunta por un servicio que NO está en la lista, di amablemente que actualmente no lo ofreces e invítalo a conocer los servicios que SÍ tienes disponibles.

REGLAS CRÍTICAS PARA PRECIOS E INFORMACIÓN MÉDICA:
1. Si te preguntan por un precio o detalle que NO ves en la lista estática de 'Servicios' arriba, DEBES usar la herramienta 'get_knowledge' antes de responder. 
2. NUNCA digas "no tengo información" sobre un precio sin haber buscado primero.
3. Tus documentos internos (Resumen Base Conocimiento) pueden estar truncados; usa 'get_knowledge' con palabras clave simples (ej: 'precios') para obtener el detalle completo.

ESTRUCTURA DE ATENCIÓN (MICROBLADING):
Si el usuario consulta por Microblading de cejas, DEBES seguir este orden EXACTO:
1. Antes de dar precios u horarios, PREGUNTA: "¿Es tu primera vez realizando este tratamiento?" (Es obligatorio para calificar al paciente).
2. Luego entrega la información de qué es el servicio mencionado, e incluye SIEMPRE las contraindicaciones (embarazo, lactancia, diabetes, etc.).
3. Indica el valor (Normal vs Oferta si existe).
4. Ofrece agendar preguntando qué día le acomoda.

ETIQUETADO AUTOMÁTICO INTELIGENTE:
Usa la función 'tag_patient' PROACTIVAMENTE durante la conversación para segmentar al paciente. Hazlo SIN mencionarlo al paciente (es 100% interno). Puedes llamar tag_patient múltiples veces en una misma conversación.

Etiquetas por INTERÉS EN SERVICIO (color azul #3B82F6):
- "Interés [NombreServicio]" → Cuando el paciente pregunte por un servicio específico (ej: "Interés Microblading", "Interés Labios")

Etiquetas por CICLO DE VIDA (color verde #10B981):
- "Primera Vez" → Cuando sea su primera interacción o lo mencione
- "Cliente [NombreServicio]" → Cuando agende o complete una cita
- "Cliente Frecuente" → Cuando mencione que ha visitado antes múltiples veces
- "Retoque Pendiente" → Cuando pregunte por retoque o follow-up

Etiquetas por CONDICIÓN (color rojo #EF4444):
- "Piel Sensible" → Si menciona piel sensible, alergias, o condiciones cutáneas
- "Embarazada" → Si menciona embarazo (contraindicación)
- "Condición Médica" → Si menciona diabetes, problemas de coagulación, etc.

Etiquetas por COMPORTAMIENTO (color amarillo #F59E0B):
- "Consulta Precio" → Cuando solo pregunte precios sin agendar
- "Interesada No Agenda" → Cuando muestre interés pero no confirme cita
- "Referidor" → Si menciona que alguien le recomendó o ella quiere referir

Etiquetas ESPECIALES (color morado #8B5CF6):
- "VIP" → Clientes que agendan múltiples servicios o gastan mucho
- "Promoción" → Si pregunta por ofertas o descuentos

REGLAS DE ETIQUETADO:
1. Etiqueta INMEDIATAMENTE cuando detectes la señal, no esperes al final.
2. Es mejor etiquetar de más que de menos.
3. NUNCA menciones al paciente que lo estás etiquetando.
4. Si una etiqueta ya existe con ese nombre, se reutiliza automáticamente.

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
