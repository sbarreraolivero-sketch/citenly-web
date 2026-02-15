// @ts-nocheck
// Citenly AI - Cron Job para Recordatorios
// Se ejecuta diariamente a las 08:00 AM para enviar recordatorios de citas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Crear cliente de Supabase
function getSupabaseClient() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    return createClient(supabaseUrl, supabaseServiceKey);
}

// Enviar mensaje por YCloud
async function sendWhatsAppMessage(
    apiKey: string,
    phoneNumber: string,
    fromNumber: string,
    message: string
) {
    const response = await fetch("https://api.ycloud.com/v2/whatsapp/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
        },
        body: JSON.stringify({
            from: fromNumber,
            to: phoneNumber,
            type: "text",
            text: {
                body: message,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`YCloud API error: ${error}`);
    }

    return await response.json();
}

// Formatear fecha para mensaje
function formatAppointmentDate(date: Date, timezone: string): string {
    return date.toLocaleDateString("es-MX", {
        timeZone: timezone,
        weekday: "long",
        day: "numeric",
        month: "long",
    });
}

// Formatear hora para mensaje
function formatAppointmentTime(date: Date, timezone: string): string {
    return date.toLocaleTimeString("es-MX", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
}

serve(async (req) => {
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
    };

    try {
        console.log("🔔 Iniciando envío de recordatorios...");

        const supabase = getSupabaseClient();

        // Obtener configuración de la clínica
        const { data: clinicSettings, error: settingsError } = await supabase
            .from("clinic_settings")
            .select("*")
            .single();

        if (settingsError || !clinicSettings) {
            throw new Error("No se encontró configuración de clínica");
        }

        // Verificar si los recordatorios están habilitados
        if (!clinicSettings.reminders_enabled) {
            console.log("⏸️ Recordatorios deshabilitados");
            return new Response(
                JSON.stringify({ status: "skipped", reason: "Reminders disabled" }),
                { headers }
            );
        }

        // Calcular rango de fechas para mañana
        const now = new Date();
        const hoursBeforeReminder = clinicSettings.reminders_hours_before || 24;

        // Calcular el inicio y fin del día siguiente
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        console.log(`📅 Buscando citas entre ${tomorrow.toISOString()} y ${dayAfterTomorrow.toISOString()}`);

        // Obtener citas para mañana que no han recibido recordatorio
        const { data: appointments, error: appointmentsError } = await supabase
            .from("appointments")
            .select("*")
            .eq("clinic_id", clinicSettings.id)
            .in("status", ["pending", "confirmed"])
            .eq("reminder_sent", false)
            .gte("appointment_date", tomorrow.toISOString())
            .lt("appointment_date", dayAfterTomorrow.toISOString());

        if (appointmentsError) {
            throw new Error(`Error fetching appointments: ${appointmentsError.message}`);
        }

        console.log(`📋 Encontradas ${appointments?.length || 0} citas para recordar`);

        if (!appointments || appointments.length === 0) {
            return new Response(
                JSON.stringify({ status: "ok", reminders_sent: 0 }),
                { headers }
            );
        }

        let remindersSent = 0;
        const errors: string[] = [];

        // Enviar recordatorio para cada cita
        for (const appointment of appointments) {
            try {
                const appointmentDate = new Date(appointment.appointment_date);
                const formattedDate = formatAppointmentDate(appointmentDate, clinicSettings.timezone);
                const formattedTime = formatAppointmentTime(appointmentDate, clinicSettings.timezone);

                // Construir mensaje de recordatorio
                const reminderMessage = `¡Hola${appointment.patient_name ? ` ${appointment.patient_name.split(" ")[0]}` : ""}! 👋

Te recordamos que tienes una cita programada:

📅 ${formattedDate}
🕐 ${formattedTime}
💆 ${appointment.service || "Consulta"}

📍 ${clinicSettings.clinic_name}

¿Confirmas tu asistencia? Por favor responde:
✅ *SÍ* para confirmar
❌ *NO* para cancelar

¡Te esperamos! ✨`;

                // Enviar mensaje
                await sendWhatsAppMessage(
                    clinicSettings.ycloud_api_key,
                    appointment.phone_number,
                    clinicSettings.ycloud_phone_number || "",
                    reminderMessage
                );

                // Guardar mensaje en historial
                await supabase.from("messages").insert({
                    clinic_id: clinicSettings.id,
                    phone_number: appointment.phone_number,
                    content: reminderMessage,
                    direction: "outbound",
                    ai_generated: true,
                });

                // Marcar recordatorio como enviado
                await supabase
                    .from("appointments")
                    .update({
                        reminder_sent: true,
                        reminder_sent_at: new Date().toISOString(),
                    })
                    .eq("id", appointment.id);

                remindersSent++;
                console.log(`✅ Recordatorio enviado a ${appointment.phone_number}`);

                // Pequeña pausa entre mensajes para evitar rate limiting
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                const errorMessage = `Error enviando recordatorio a ${appointment.phone_number}: ${error.message}`;
                console.error(`❌ ${errorMessage}`);
                errors.push(errorMessage);
            }
        }

        console.log(`📤 Recordatorios enviados: ${remindersSent}/${appointments.length}`);

        return new Response(
            JSON.stringify({
                status: "ok",
                reminders_sent: remindersSent,
                total_appointments: appointments.length,
                errors: errors.length > 0 ? errors : undefined,
            }),
            { headers }
        );
    } catch (error) {
        console.error("❌ Error en cron job:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers }
        );
    }
});
