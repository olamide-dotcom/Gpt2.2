import { Telegraf } from 'telegraf';

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.APP_URL;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not set');
}

const bot = new Telegraf(token);

bot.start((ctx) => {
  return ctx.reply('Welcome — open the app below:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: appUrl } }]],
    },
  });
});

bot.command('open', (ctx) => {
  ctx.reply('Open the web app:', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Open App', web_app: { url: appUrl } }]],
    },
  });
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok');
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('ok');
  } catch (err) {
    console.error(err);
    res.status(500).send('error');
  }
}
