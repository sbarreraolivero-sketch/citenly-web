// LemonSqueezy Create Checkout - Edge Function
// Creates a checkout session for international clients (USD)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const LEMONSQUEEZY_API_KEY = Deno.env.get("LEMONSQUEEZY_API_KEY") || "";
const LEMONSQUEEZY_STORE_ID = Deno.env.get("LEMONSQUEEZY_STORE_ID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * LemonSqueezy Variant IDs — configure via LS dashboard secrets.
 * Dashboard → Store → Products → Click product → Copy variant ID from URL.
 */
const VARIANT_IDS: Record<string, string> = {
    // Subscription Plans
    'core':       Deno.env.get("LS_VARIANT_CORE")       || "1712277",
    'starter':    Deno.env.get("LS_VARIANT_STARTER")    || "1460445",
    'pro':        Deno.env.get("LS_VARIANT_PRO")        || "1460476",
    'enterprise': Deno.env.get("LS_VARIANT_ENTERPRISE") || "1460482",
    // Legacy plan IDs — backward compat
    'essence':    Deno.env.get("LS_VARIANT_STARTER")    || "1460445",
    'radiance':   Deno.env.get("LS_VARIANT_PRO")        || "1460476",
    'prestige':   Deno.env.get("LS_VARIANT_ENTERPRISE") || "1460482",
    // AI Credit Packs (mini): Pack Inicial 500, Pack Pro 2000, Pack Enterprise 5000
    'pack_500':    Deno.env.get("LS_VARIANT_PACK_500")   || "1460498",
    'pack_1500':   Deno.env.get("LS_VARIANT_PACK_1500")  || "1460490",
    'pack_4000':   Deno.env.get("LS_VARIANT_PACK_4000")  || "1460505",
    // AI Credit Packs (4o premium) — mismos IDs por ahora
    'pack_500_4o':  Deno.env.get("LS_VARIANT_PACK_500_4O")  || "1460498",
    'pack_1500_4o': Deno.env.get("LS_VARIANT_PACK_1500_4O") || "1460490",
    'pack_4000_4o': Deno.env.get("LS_VARIANT_PACK_4000_4O") || "1460505",
    // Reminder Units — per-unit purchase
    'reminders': Deno.env.get("LS_VARIANT_REMINDERS") || "",
    // Reminder Packs — fixed-quantity bundles
    'reminders_50':        Deno.env.get("LS_VARIANT_REMINDERS_50")        || "1712284",
    'reminders_350':       Deno.env.get("LS_VARIANT_REMINDERS_350")       || "1712305",
    'reminders_unlimited': Deno.env.get("LS_VARIANT_REMINDERS_UNLIMITED") || "1712321",
    // Campaign Credits
    'campaign_credits': Deno.env.get("LS_VARIANT_CAMPAIGN_CREDITS") || "",
};

interface RequestBody {
    clinic_id: string;
    email: string;
    type: 'subscription' | 'ai_credits' | 'reminders' | 'campaign_credits';
    plan_or_pack_id: string;
    model?: 'mini' | '4o';
    quantity?: number;
    success_url?: string;
}

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
    };

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
        const { clinic_id, email, type, plan_or_pack_id, model, quantity, success_url } = body;

        if (!clinic_id || !email || !plan_or_pack_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: clinic_id, email, plan_or_pack_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!LEMONSQUEEZY_API_KEY) {
            return new Response(
                JSON.stringify({ error: "Server configuration error: Missing LemonSqueezy API key" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const variantId = VARIANT_IDS[plan_or_pack_id];
        if (!variantId) {
            return new Response(
                JSON.stringify({ error: `Product variant not configured: ${plan_or_pack_id}. Please set LS_VARIANT_* secrets.` }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const creditsMap: Record<string, number> = {
            'pack_500': 500, 'pack_1500': 2000, 'pack_4000': 5000,
            'pack_500_4o': 500, 'pack_1500_4o': 2000, 'pack_4000_4o': 5000,
        };

        // Fixed quantities for reminder packs
        const reminderPackQtyMap: Record<string, number> = {
            'reminders_50': 50, 'reminders_350': 150, 'reminders_unlimited': 9999,
        };

        const customData: Record<string, string> = {
            clinic_id: clinic_id,
            type: type,
        };

        // lsCustomPrice: override variant price for variable-quantity products (cents USD)
        let lsCustomPrice: number | undefined;

        if (type === 'ai_credits') {
            customData.credits = String(creditsMap[plan_or_pack_id] || 0);
            customData.model = model || 'mini';
        } else if (type === 'reminders') {
            const fixedQty = reminderPackQtyMap[plan_or_pack_id];
            if (fixedQty !== undefined) {
                customData.quantity = String(fixedQty);
            } else {
                // Per-unit: US$0.15/unit → custom_price cents = units * 15
                const units = Math.max(10, quantity || 10);
                const roundedUnits = Math.ceil(units / 10) * 10;
                customData.quantity = String(roundedUnits);
                lsCustomPrice = roundedUnits * 15;
            }
        } else if (type === 'campaign_credits') {
            // US$0.15/crédito · mín 50 → custom_price cents = credits * 15
            const credits = Math.max(50, quantity || 50);
            const roundedCredits = Math.ceil(credits / 10) * 10;
            customData.quantity = String(roundedCredits);
            lsCustomPrice = roundedCredits * 15;
        } else {
            customData.plan = plan_or_pack_id;
        }

        const checkoutData: Record<string, unknown> = {
            email: email,
            custom: customData,
        };

        const checkoutAttributes: Record<string, unknown> = {
            checkout_data: checkoutData,
            checkout_options: {
                embed: false,
                media: true,
                logo: true,
                desc: true,
                discount: true,
                locale: "es",
            },
            product_options: {
                redirect_url: success_url || `${SUPABASE_URL.replace('.supabase.co', '')}/app/settings?payment=success`,
            },
        };

        if (lsCustomPrice !== undefined) {
            checkoutAttributes.custom_price = lsCustomPrice;
        }

        const checkoutPayload = {
            data: {
                type: "checkouts",
                attributes: checkoutAttributes,
                relationships: {
                    store: { data: { type: "stores", id: LEMONSQUEEZY_STORE_ID } },
                    variant: { data: { type: "variants", id: variantId } },
                },
            },
        };

        console.log(`Creating LS checkout: clinic=${clinic_id}, type=${type}, variant=${variantId}`);

        const lsResponse = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
            method: "POST",
            headers: {
                "Accept": "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
                "Authorization": `Bearer ${LEMONSQUEEZY_API_KEY}`,
            },
            body: JSON.stringify(checkoutPayload),
        });

        if (!lsResponse.ok) {
            const errorText = await lsResponse.text();
            console.error(`LemonSqueezy API error (${lsResponse.status}):`, errorText);
            return new Response(
                JSON.stringify({ success: false, error: `Error de LemonSqueezy (${lsResponse.status})`, details: errorText }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const lsData = await lsResponse.json();
        const checkoutUrl = lsData.data?.attributes?.url;

        if (!checkoutUrl) {
            return new Response(
                JSON.stringify({ error: "No checkout URL returned from LemonSqueezy" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ url: checkoutUrl, checkout_id: lsData.data?.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        console.error("Internal error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error", message: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

// Silence unused import warning
const _supabase = createClient;
void _supabase;
void SUPABASE_SERVICE_ROLE_KEY;
