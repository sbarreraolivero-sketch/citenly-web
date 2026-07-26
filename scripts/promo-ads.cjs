#!/usr/bin/env node
/**
 * Gestiona los anuncios de Meta que activan precio promocional (clinic_settings.promo_ad_ids).
 *
 * Cuando alguien entra por un anuncio Click-to-WhatsApp, Meta adjunta un `referral` al primer
 * mensaje con el `source_id` del anuncio. Ese dato llega aunque la persona borre el mensaje
 * predefinido, así que es la forma confiable de reconocer a quien viene de una promoción.
 *
 *   node scripts/promo-ads.cjs list            → anuncios vistos en los últimos 14 días
 *   node scripts/promo-ads.cjs add <adId>      → activa la promo para ese anuncio
 *   node scripts/promo-ads.cjs remove <adId>   → la desactiva
 *
 * Clínica por defecto: Elizabeth Microblading. Otra: CLINIC_ID=<uuid> node scripts/promo-ads.cjs ...
 */
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const CLINIC_ID = process.env.CLINIC_ID || '1ab32091-210c-4525-a7e1-e6a7dca1c8c6';
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const getCurrent = async () => {
  const { data, error } = await sb.from('clinic_settings')
    .select('clinic_name, promo_ad_ids').eq('id', CLINIC_ID).single();
  if (error) throw new Error(error.message);
  return data;
};

const list = async () => {
  const { clinic_name, promo_ad_ids } = await getCurrent();
  const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await sb.from('messages')
    .select('phone_number, created_at, payload')
    .eq('clinic_id', CLINIC_ID).eq('direction', 'inbound')
    .gte('created_at', since).limit(2000);
  if (error) throw new Error(error.message);

  const ads = new Map();
  for (const m of data) {
    const ref = m.payload?.referral;
    if (!ref?.source_id) continue;
    const a = ads.get(ref.source_id) || {
      headline: ref.headline || '(sin título)',
      body: (ref.body || '').replace(/\s+/g, ' ').slice(0, 110),
      contacts: new Set(),
      last: m.created_at,
    };
    a.contacts.add(m.phone_number);
    if (m.created_at > a.last) a.last = m.created_at;
    ads.set(ref.source_id, a);
  }

  console.log(`\nClínica: ${clinic_name}`);
  console.log(`Promo activa para: ${promo_ad_ids?.length ? promo_ad_ids.join(', ') : '(ningún anuncio)'}\n`);
  if (!ads.size) return console.log('Sin mensajes desde anuncios en los últimos 14 días.\n');

  const sorted = [...ads.entries()].sort((a, b) => b[1].last.localeCompare(a[1].last));
  for (const [id, a] of sorted) {
    const flag = promo_ad_ids?.includes(id) ? '🎁 PROMO' : '  normal';
    console.log(`${flag}  ${id}`);
    console.log(`          "${a.headline}"`);
    console.log(`          copy: ${a.body}...`);
    console.log(`          ${a.contacts.size} contacto(s) · último ${a.last.slice(0, 16).replace('T', ' ')} UTC\n`);
  }
  console.log('Para activar la promo:  node scripts/promo-ads.cjs add <adId>\n');
};

const mutate = async (adId, mode) => {
  if (!/^\d{6,}$/.test(adId)) throw new Error(`"${adId}" no parece un ID de anuncio de Meta (solo dígitos).`);
  const { clinic_name, promo_ad_ids } = await getCurrent();
  const current = promo_ad_ids || [];
  const next = mode === 'add'
    ? [...new Set([...current, adId])]
    : current.filter(id => id !== adId);

  if (JSON.stringify(next) === JSON.stringify(current)) {
    return console.log(`Sin cambios: ${adId} ${mode === 'add' ? 'ya estaba activo' : 'no estaba en la lista'}.`);
  }
  const { error } = await sb.from('clinic_settings').update({ promo_ad_ids: next }).eq('id', CLINIC_ID);
  if (error) throw new Error(error.message);
  console.log(`${clinic_name}: promo_ad_ids ${JSON.stringify(current)} → ${JSON.stringify(next)}`);
  console.log('Toma efecto en el próximo mensaje entrante (no requiere deploy).');
};

const [cmd, adId] = process.argv.slice(2);
const run = async () => {
  if (cmd === 'list' || !cmd) return list();
  if (cmd === 'add' || cmd === 'remove') {
    if (!adId) throw new Error(`Falta el ID del anuncio: node scripts/promo-ads.cjs ${cmd} <adId>`);
    return mutate(adId, cmd);
  }
  throw new Error(`Comando desconocido "${cmd}". Usa: list | add <adId> | remove <adId>`);
};

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
