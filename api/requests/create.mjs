const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(404).send('Not found');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Supabase not configured');
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const payload = req.body || {};

    const url = `${SUPABASE_URL}/rest/v1/deposit_requests`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ ...payload, status: 'pending_review' }),
    });

    const data = await resp.json();

    if (!resp.ok) return res.status(502).json({ error: 'Supabase error', details: data });

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'error' });
  }
}
