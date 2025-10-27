// api/chat.js — Vercel Edge Function with clear errors
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-model'
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST')
    return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const { messages = [], system = '', model } = await req.json();
    const MODEL = model || 'gpt-4o-mini'; // safe default

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.7,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      // Surface the actual OpenAI error back to the UI
      return new Response(JSON.stringify({ error: data?.error?.message || 'OpenAI error' }), {
        status: r.status,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const content = data?.choices?.[0]?.message?.content || '';
    return new Response(JSON.stringify({ content }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Proxy error', detail: String(e) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
}
