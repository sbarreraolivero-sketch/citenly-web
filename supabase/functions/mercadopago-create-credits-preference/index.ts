import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";

const CREDIT_PACKS_MINI: Record<string, { credits: number, price: number, description: string }> = {
    'pack_500': { 
        credits: 500, 
        price: 5000,
        description: "Pack Inicial - 500 Créditos de IA (GPT-4o-mini)" 
    },
    'pack_1500': { 
        credits: 1500, 
        price: 12000,
        description: "Pack Pro - 1500 Créditos de IA (GPT-4o-mini)" 
    },
    'pack_4000': { 
        credits: 4000, 
        price: 25000,
        description: "Pack Enterprise - 4000 Créditos de IA (GPT-4o-mini)" 
    },
};

const CREDIT_PACKS_4O: Record<string, { credits: number, price: number, description: string }> = {
    'pack_500_4o': { 
        credits: 500, 
        price: 10000,
        description: "Pack Inicial - 500 Créditos de IA (GPT-4o)" 
    },
    'pack_1500_4o': { 
        credits: 1500, 
        price: 30000,
        description: "Pack Pro - 1500 Créditos de IA (GPT-4o)" 
    },
    'pack_4000_4o': { 
        credits: 4000, 
        price: 80000,
        description: "Pack Enterprise - 4000 Créditos de IA (GPT-4o)" 
    },
};

interface RequestBody {
    clinic_id: string;
    pack_id: string;
    email: string;
    model?: 'mini' | '4o';
    back_urls: {
        success: string;
        failure: string;
        pending: string;
    };
}

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    };

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    try {
        const body: RequestBody = await req.json();
        const { clinic_id, pack_id, email, model, back_urls } = body;

        const selectedModel = model || 'mini';
        const packs = selectedModel === '4o' ? CREDIT_PACKS_4O : CREDIT_PACKS_MINI;

        console.log(`Creating preference for clinic ${clinic_id}, pack ${pack_id}, model ${selectedModel}, email ${email}`);

        const pack = packs[pack_id];

        if (!clinic_id || !pack || !email) {
            console.error("Missing required fields:", { clinic_id, pack_id, email, selectedModel });
            return new Response(
                JSON.stringify({ error: "Missing required fields or invalid pack" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!MERCADOPAGO_ACCESS_TOKEN) {
            console.error("MERCADOPAGO_ACCESS_TOKEN is not set in environment");
            return new Response(
                JSON.stringify({ error: "Server configuration error: Missing MP token" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create Mercado Pago preference with normalized back_urls
        const mpPayload = {
            items: [
                {
                    title: pack.description,
                    quantity: 1,
                    unit_price: pack.price,
                    currency_id: "CLP",
                },
            ],
            payer: {
                email: email,
            },
            back_urls: {
                success: back_urls?.success || "https://citenly.ai/app/dashboard",
                failure: back_urls?.failure || "https://citenly.ai/app/dashboard",
                pending: back_urls?.pending || "https://citenly.ai/app/dashboard"
            },
            auto_return: "approved",
            external_reference: clinic_id,
            notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
            metadata: {
                clinic_id: clinic_id,
                type: "ai_credits",
                credits: pack.credits.toString(),
                model: selectedModel,
            },
        };

        const preferenceResponse = await fetch(
            "https://api.mercadopago.com/checkout/preferences",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                },
                body: JSON.stringify(mpPayload),
            }
        );

        if (!preferenceResponse.ok) {
            const errorData = await preferenceResponse.json();
            console.error("Mercado Pago API error:", errorData);
            return new Response(
                JSON.stringify({ error: "Failed to create preference with MP", details: errorData }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const preference = await preferenceResponse.json();
        console.log("Preference created successfully:", preference.id);

        return new Response(
            JSON.stringify({
                id: preference.id,
                init_point: preference.init_point,
                sandbox_init_point: preference.sandbox_init_point,
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error: any) {
        console.error("Internal processing error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
