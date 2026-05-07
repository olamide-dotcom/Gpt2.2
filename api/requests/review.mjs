const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(404).send('Not found');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase not configured; skipping optional request mirror review');
    return res.status(200).json({ ok: true, mirrored: false, reason: 'Supabase not configured' });
  }

  try {
    const { requestId, status, creditedAmountUsd, approvalMessage } = req.body || {};
    if (!requestId || !status) return res.status(400).json({ error: 'Missing requestId or status' });

    const url = `${SUPABASE_URL}/rest/v1/deposit_requests?id=eq.${requestId}`;

    const updateBody = {
      status,
      reviewed_at: new Date().toISOString(),
      credited_amount_usd: creditedAmountUsd ?? null,
      approval_message: approvalMessage ?? null,
    };

    const resp = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(updateBody),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Supabase mirror review failed', data);
      return res.status(200).json({ ok: true, mirrored: false, reason: 'Supabase error', details: data });
    }

    // Notify submitter if present
    try {
      const updated = Array.isArray(data) ? data[0] : data;
      if (updated && updated.submitted_by_telegram_id) {
        const chatId = updated.submitted_by_telegram_id;
        const text = `Your deposit request *${updated.id}* was *${updated.status}*. ${updated.approval_message ?? ''}`;
        await fetch('/api/notify-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, text }),
        });
      }
    } catch (e) {
      console.error('notify failed', e);
    }

    return res.status(200).json({ ok: true, mirrored: true, data });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ ok: true, mirrored: false, reason: 'error' });
  }
}
