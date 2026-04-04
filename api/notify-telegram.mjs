const token = process.env.TELEGRAM_BOT_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(404).send('Not found');

  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return res.status(500).send('Bot token not configured');
  }

  try {
    const { chatId, text } = req.body || {};

    if (!chatId || !text) {
      return res.status(400).json({ error: 'Missing chatId or text' });
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error('Telegram sendMessage error', data);
      return res.status(502).json({ error: 'Telegram API error', details: data });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return res.status(500).send('error');
  }
}
