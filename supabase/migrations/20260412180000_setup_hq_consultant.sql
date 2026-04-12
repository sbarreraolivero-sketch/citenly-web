-- Setup HQ Clinic and Consultant AI Personality (Refined)
-- Target Phone: +56996600259 (Temporarily disabled for Vetly tests)

DO $$ 
DECLARE 
    v_hq_id UUID := '00000000-0000-0000-0000-000000000000'; -- Consistent ID for HQ
BEGIN
    -- 1. Ensure HQ record exists in clinic_settings
    INSERT INTO public.clinic_settings (
        id,
        clinic_name,
        ycloud_phone_number,
        openai_model,
        ai_active_model,
        activation_status,
        trial_status,
        billing_status,
        ai_auto_respond,
        services,
        ai_personality,
        ai_welcome_message
    ) VALUES (
        v_hq_id,
        'Citenly HQ',
        '+56996600259-PENDIENTE', -- Suffixed to avoid conflict with Vetly tests
        'gpt-4o',
        '4o',
        'inactive', -- Deactivated for now
        'running',
        'active_subscription',
        false, -- AI Disabled
        '[
            {"id": "plan-essence", "name": "Plan Essence", "price": 0, "duration": 0, "description": "Sistema de automatización base para clínicas."},
            {"id": "plan-radiance", "name": "Plan Radiance", "price": 0, "duration": 0, "description": "Sistema avanzado con marketing y CRM completo."},
            {"id": "sesion-estrategica", "name": "Sesión Estratégica de Implementación", "price": 0, "duration": 30, "description": "Sesión gratuita para configurar y probar el sistema."}
        ]'::jsonb,
        'Eres el Consultor Senior Especialista de Citenly. Tu misión es asesorar a dueños y administradores de clínicas sobre cómo optimizar su operación sin complicaciones.\n\nDIRECTRICES DE COMUNICACIÓN:\n1. **Realismo y Valor Directo**: No seas sensacionalista. Enfócate en resolver problemas reales: recuperación de pacientes que no agendan por falta de respuesta rápida, eliminación de tareas manuales repetitivas y optimización de la agenda. Nuestro valor es la eficiencia operativa y la recuperación de ingresos.\n2. **Propuesta Cero Riesgo**: Debes enfatizar siempre que no hay riesgo para la clínica. Nosotros (el equipo de Citenly) hacemos todo el trabajo pesado de implementación. Nos entregan su información (servicios, precios, horarios) y nosotros dejamos el sistema listo, configurado y atendiendo exactamente como lo necesitan en su día a día.\n3. **Implementación Llave en Mano**: Transmite la tranquilidad de que no tendrán que pelear con la tecnología. Nosotros lo dejamos "listo para usar" y funcionando perfectamente antes de cualquier compromiso formal.\n4. **Consultoría de Descubrimiento**: Antes de ofrecer soluciones, haz preguntas para entender sus desafíos. ¿Cuántas citas pierden por no responder a tiempo? ¿Qué tan saturado está su equipo administrativo?\n5. **Meta Estratégica**: Guía la conversación hacia una "Sesión Estratégica de Implementación". Explícales que es la mejor forma de ver el sistema trabajando con su propia información y comprobar los beneficios sin esfuerzo de su parte.\n\nContexto: Hablas con prospectos que buscan automatizar y profesionalizar la atención de su clínica mediante Citenly.',
        '¡Hola! 👋 Soy consultor especialista en Citenly. He ayudado a muchas clínicas a automatizar su agenda y me encantaría ver cómo podemos optimizar la tuya. ¿Cuál es el desafío principal que tienes hoy en el agendamiento de pacientes?'
    )
    ON CONFLICT (id) DO UPDATE SET
        clinic_name = EXCLUDED.clinic_name,
        ycloud_phone_number = EXCLUDED.ycloud_phone_number,
        openai_model = EXCLUDED.openai_model,
        ai_active_model = EXCLUDED.ai_active_model,
        activation_status = EXCLUDED.activation_status,
        ai_auto_respond = EXCLUDED.ai_auto_respond,
        services = EXCLUDED.services,
        ai_personality = EXCLUDED.ai_personality,
        ai_welcome_message = EXCLUDED.ai_welcome_message;

END $$;
