// User Signup Handler Edge Function
// Creates user, clinic, profile, and subscription in a single transaction
// Uses service_role to bypass RLS for initial setup

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// CORS headers for Supabase client
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupRequest {
    email: string;
    password: string;
    full_name: string;
    clinic_name: string;
    selected_plan?: string;
}

Deno.serve(async (req: Request) => {
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
        const body: SignupRequest = await req.json();
        const { email, password, full_name, clinic_name, selected_plan = "radiance" } = body;

        // Validate required fields
        if (!email || !password || !full_name || !clinic_name) {
            return new Response(
                JSON.stringify({ error: "Missing required fields" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Validate password length
        if (password.length < 6) {
            return new Response(
                JSON.stringify({ error: "Password must be at least 6 characters" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create admin client with service role
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // 1. Create auth user with auto-confirm
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email for smooth onboarding
            user_metadata: {
                full_name,
            },
        });

        if (authError) {
            console.error("Auth error:", authError);

            // Handle duplicate email
            if (authError.message?.includes("already registered") || authError.message?.includes("already been registered")) {
                return new Response(
                    JSON.stringify({ error: "Este email ya está registrado" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            return new Response(
                JSON.stringify({ error: authError.message }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!authData.user) {
            return new Response(
                JSON.stringify({ error: "Failed to create user" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const userId = authData.user.id;

        // 2. Create clinic
        const { data: clinicData, error: clinicError } = await supabaseAdmin
            .from("clinic_settings")
            .insert({
                clinic_name: clinic_name,
                services: [
                    { id: "svc-1", name: "Consulta General", duration: 30, price: 500 },
                ],
            })
            .select()
            .single();

        if (clinicError) {
            console.error("Clinic error:", clinicError);
            // Rollback: delete the auth user
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return new Response(
                JSON.stringify({ error: "Error creating clinic" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 3. Create user profile
        const { error: profileError } = await supabaseAdmin
            .from("user_profiles")
            .insert({
                id: userId,
                email: email,
                full_name: full_name,
                clinic_id: clinicData.id,
                role: "admin",
            });

        if (profileError) {
            console.error("Profile error:", profileError);
            // Rollback
            await supabaseAdmin.from("clinic_settings").delete().eq("id", clinicData.id);
            await supabaseAdmin.auth.admin.deleteUser(userId);
            return new Response(
                JSON.stringify({ error: "Error creating profile" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Note: Subscription is auto-created by trigger on clinic_settings insert

        // Return success
        return new Response(
            JSON.stringify({
                success: true,
                user_id: userId,
                clinic_id: clinicData.id,
                message: "Account created successfully",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Signup error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
