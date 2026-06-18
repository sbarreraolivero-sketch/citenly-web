-- Migration: Saldo de créditos de campaña
-- Date: 2026-06-18
--
-- Habilita el sistema de "Créditos de Envío" para campañas (paridad con Vetly):
-- 1 crédito = 1 mensaje. Se compran vía LemonSqueezy (US$0.15/crédito, mín 50) y se
-- descuentan al enviar. El webhook acredita y send-whatsapp-campaign descuenta.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS campaign_credits_balance INTEGER NOT NULL DEFAULT 0;
