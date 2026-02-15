// Mercado Pago Subscription Creation Edge Function
// Deploy with: supabase functions deploy mercadopago-create-subscription

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Plan prices in ARS (Argentine Pesos) - adjust based on your needs
const PLAN_PRICES: Record<string, number> = {
    essence: 79000, // ~$79 USD
    radiance: 159000, // ~$159 USD
    prestige: 299000, // ~$299 USD
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
    essence: "Citenly AI - Plan Essence",
    radiance: "Citenly AI - Plan Radiance",
    prestige: "Citenly AI - Plan Prestige",
};

interface RequestBody {
    clinic_id: string;
    plan: "essence" | "radiance" | "prestige";
    email: string;
    external_reference: string;
    back_urls: {
        success: string;
        failure: string;
        pending: string;
    };
}

Deno.serve(async (req: Request) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body: RequestBody = await req.json();
        const { clinic_id, plan, email, external_reference, back_urls } = body;

        // Validate required fields
        if (!clinic_id || !plan || !email) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Validate plan
        if (!PLAN_PRICES[plan]) {
            return new Response(
                JSON.stringify({ error: "Invalid plan" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create Mercado Pago preference
        const preferenceResponse = await fetch(
            "https://api.mercadopago.com/checkout/preferences",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
                },
                body: JSON.stringify({
                    items: [
                        {
                            title: PLAN_DESCRIPTIONS[plan],
                            quantity: 1,
                            unit_price: PLAN_PRICES[plan],
                            currency_id: "ARS",
                        },
                    ],
                    payer: {
                        email: email,
                    },
                    back_urls: back_urls,
                    auto_return: "approved",
                    external_reference: external_reference,
                    notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
                    metadata: {
                        clinic_id: clinic_id,
                        plan: plan,
                    },
                }),
            }
        );

        if (!preferenceResponse.ok) {
            const errorData = await preferenceResponse.json();
            console.error("Mercado Pago error:", errorData);
            return new Response(
                JSON.stringify({ error: "Failed to create preference", details: errorData }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const preference = await preferenceResponse.json();

        // Create pending subscription record in database
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        await supabase.from("subscriptions").upsert({
            clinic_id: clinic_id,
            plan: plan,
            status: "trial",
            mercadopago_subscription_id: preference.id,
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            monthly_appointments_limit: plan === "essence" ? 50 : null,
            monthly_appointments_used: 0,
        }, {
            onConflict: "clinic_id",
        });

        return new Response(
            JSON.stringify({
                id: preference.id,
                init_point: preference.init_point,
                sandbox_init_point: preference.sandbox_init_point,
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        console.error("Error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
