-- Migration: Normalizar IDs de plan en subscriptions
-- Date: 2026-06-18
--
-- Contexto: la app usa los IDs de plan core/starter/pro/enterprise, pero la columna
-- subscriptions.plan tenía un CHECK que solo permitía los nombres legacy
-- (essence/radiance/prestige) + trial. Clínicas antiguas (ej. Elizabeth Microblading)
-- quedaron con 'prestige', lo que rompía el nombre del plan, el precio (lookup vacío)
-- y el gating premium de Retención. normalizePlanId() ya cubre esto en el frontend;
-- esta migración deja la DB consistente.

-- 1. Ampliar el CHECK para aceptar los IDs actuales (manteniendo legacy + trial)
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan = ANY (ARRAY[
    'core'::text, 'starter'::text, 'pro'::text, 'enterprise'::text,
    'essence'::text, 'radiance'::text, 'prestige'::text, 'freemium'::text,
    'trial'::text
  ]));

-- 2. Migrar valores legacy a los IDs actuales (deja 'trial' intacto)
UPDATE public.subscriptions
SET plan = CASE plan
    WHEN 'prestige' THEN 'enterprise'
    WHEN 'radiance'  THEN 'pro'
    WHEN 'essence'   THEN 'starter'
    WHEN 'freemium'  THEN 'core'
    ELSE plan
END
WHERE plan IN ('prestige', 'radiance', 'essence', 'freemium');
