-- Lista de IDs de anuncios de Meta (referral.source_id) que activan un precio promocional.
-- Sirve para reconocer a quien llega por un anuncio de promoción incluso si borra el
-- mensaje predefinido del Click-to-WhatsApp: el referral viaja igual en el primer mensaje.
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS promo_ad_ids text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN clinic_settings.promo_ad_ids IS
  'IDs de anuncios de Meta (referral.source_id, numéricos) cuya audiencia recibe precio promocional. Vacío = sin promoción por anuncio.';
