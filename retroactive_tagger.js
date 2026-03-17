
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiKey = process.env.VITE_OPENAI_API_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getAIInterest(history) {
  if (!history || history.length === 0) return null;
  
  const prompt = `Analiza la siguiente conversación de chat en una clínica estética y determina en qué servicio está interesado el cliente. 
Servicios posibles: Microblading, Perfilado, Labios, Pestañas.
Si no hay un interés claro, responde "NONE".
Si hay interés, responde SOLO con el nombre del servicio.

Chat:
${history}

Servicio:`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0
      })
    });
    const data = await resp.json();
    const result = data.choices[0].message.content.trim();
    return result === 'NONE' ? null : result;
  } catch (e) {
    console.error('Error calling OpenAI:', e);
    return null;
  }
}

async function retroactiveTagger() {
  console.log('--- Starting Retroactive Chat Analysis ---')

  // 1. Get all prospects
  const { data: prospects } = await supabase.from('crm_prospects').select('id, phone, clinic_id, name')

  for (const prospect of prospects) {
    // Check if they already have tags
    const { count } = await supabase.from('crm_prospect_tags').select('*', { count: 'exact', head: true }).eq('prospect_id', prospect.id)
    
    if (count > 0) continue; // Already tagged

    console.log(`Analyzing history for: ${prospect.name || prospect.phone}...`)

    // 2. Get history
    const { data: messages } = await supabase
      .from('messages')
      .select('content, role')
      .eq('phone_number', prospect.phone)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!messages || messages.length === 0) continue;

    const chatString = messages.reverse().map(m => `${m.role}: ${m.content}`).join('\n');
    const interest = await getAIInterest(chatString);

    if (interest) {
      console.log(`   Found interest: ${interest}`);
      const tagName = `Interés ${interest}`;

      // 3. Ensure Tag exists in CRM
      let { data: tag } = await supabase.from('crm_tags').select('id').eq('clinic_id', prospect.clinic_id).ilike('name', tagName).maybeSingle();
      
      let tagId;
      if (!tag) {
        const { data: newTag } = await supabase.from('crm_tags').insert({
          clinic_id: prospect.clinic_id,
          name: tagName,
          color: '#3B82F6'
        }).select('id').single();
        tagId = newTag.id;
      } else {
        tagId = tag.id;
      }

      // 4. Link tag and Update prospect interest
      await supabase.from('crm_prospect_tags').insert({ prospect_id: prospect.id, tag_id: tagId });
      await supabase.from('crm_prospects').update({ service_interest: interest }).eq('id', prospect.id);
    }
  }

  console.log('--- Retroactive Analysis Finished ---')
}

retroactiveTagger()
